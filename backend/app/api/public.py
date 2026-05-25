from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.ws_manager import manager
from app.models.guest import Guest, GuestStatus
from app.models.rsvp import RsvpResponse
from app.models.table import Table
from app.models.photo import Photo
from app.schemas.guest import GuestPublic
from app.schemas.rsvp import RsvpPayload
from app.schemas.photo import PresignRequest, PresignResponse, ConfirmUpload, PhotoRead
from app.core.r2 import generate_presigned_upload_url
import uuid

router = APIRouter()


# ── Seating chart response schemas ────────────────────────────────────────────
class SeatingGuest(BaseModel):
    first_name: str
    last_name: str


class SeatingTable(BaseModel):
    table_id: int
    table_name: str
    max_seats: int
    guests: list[SeatingGuest]


@router.get("/event", tags=["event"])
async def get_event_details() -> dict[str, str]:
    """
    Get static event details configured in settings.
    """
    return {
        "name": settings.EVENT_NAME,
        "date": settings.EVENT_DATE,
        "venue": settings.VENUE,
    }


@router.get("/guests/search", response_model=list[GuestPublic], tags=["guests"])
async def search_guests(
    query: str = Query(..., description="Search term for guest names (min 2 characters)"),
    db: AsyncSession = Depends(get_db),
) -> list[Guest]:
    """
    Search for guests by first name, last name, or combined full name.
    Requires at least 2 characters in the query parameter.
    """
    if len(query.strip()) < 2:
        return []

    # Safe wildcard search
    search_term = f"%{query.strip()}%"

    stmt = (
        select(Guest)
        .where(
            or_(
                Guest.first_name.ilike(search_term),
                Guest.last_name.ilike(search_term),
                func.concat(Guest.first_name, " ", Guest.last_name).ilike(search_term),
            )
        )
        .limit(10)
    )

    result = await db.execute(stmt)
    guests = result.scalars().all()
    return list(guests)


@router.patch("/guests/{id}/rsvp", response_model=GuestPublic, tags=["guests"])
async def submit_rsvp(
    id: int,
    payload: RsvpPayload,
    db: AsyncSession = Depends(get_db),
) -> Guest:
    """
    Submit or update RSVP status and optional survey details for a guest.
    If the status is 'confirmed', the RSVP response survey details are upserted.
    If the status is 'declined', any existing RSVP response is removed.
    """
    # 1. Fetch guest
    guest_stmt = select(Guest).where(Guest.id == id)
    guest_result = await db.execute(guest_stmt)
    guest = guest_result.scalar_one_or_none()

    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest with ID {id} not found",
        )

    # 2. Update guest status
    guest.status = payload.status

    # 3. Handle RSVP Response based on status
    if payload.status == GuestStatus.confirmed:
        # Fetch existing RSVP response
        rsvp_stmt = select(RsvpResponse).where(RsvpResponse.guest_id == id)
        rsvp_result = await db.execute(rsvp_stmt)
        rsvp = rsvp_result.scalar_one_or_none()

        if not rsvp:
            # Create new RSVP response
            rsvp = RsvpResponse(
                guest_id=id,
                dietary_preferences=payload.dietary_preferences,
                alcohol_preference=payload.alcohol_preference,
                needs_transport=payload.needs_transport,
            )
            db.add(rsvp)
        else:
            # Update existing RSVP response
            rsvp.dietary_preferences = payload.dietary_preferences
            rsvp.alcohol_preference = payload.alcohol_preference
            rsvp.needs_transport = payload.needs_transport

    elif payload.status == GuestStatus.declined:
        # Delete RSVP response if it exists
        rsvp_stmt = select(RsvpResponse).where(RsvpResponse.guest_id == id)
        rsvp_result = await db.execute(rsvp_stmt)
        rsvp = rsvp_result.scalar_one_or_none()

        if rsvp:
            await db.delete(rsvp)

    # Commit changes and refresh guest object to reflect DB updates
    await db.commit()
    await db.refresh(guest)

    # Notify all connected seating-chart browsers
    await manager.broadcast({"type": "seating_updated"})

    return guest


@router.get("/seating", response_model=list[SeatingTable], tags=["seating"])
async def get_seating_plan(db: AsyncSession = Depends(get_db)) -> list[SeatingTable]:
    """
    Return the public seating chart.
    Each table includes only confirmed guests. Empty tables are included
    with an empty guests list.
    """
    # Load all tables with their guests (selectinload for async safety)
    stmt = (
        select(Table)
        .options(selectinload(Table.guests))
        .order_by(Table.id)
    )
    result = await db.execute(stmt)
    tables = result.scalars().all()

    return [
        SeatingTable(
            table_id=t.id,
            table_name=t.table_name,
            max_seats=t.max_seats,
            guests=[
                SeatingGuest(first_name=g.first_name, last_name=g.last_name)
                for g in t.guests
                if g.status == GuestStatus.confirmed
            ],
        )
        for t in tables
    ]


# ── Photos API ────────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic"}
MAX_FILE_SIZE = 20_971_520  # 20MB

@router.post("/photos/presign", response_model=PresignResponse, tags=["photos"])
async def presign_photo(payload: PresignRequest) -> PresignResponse:
    if payload.mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid mime type")
    if payload.file_size_bytes > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    extension = ALLOWED_MIME_TYPES[payload.mime_type]
    photo_id = str(uuid.uuid4())
    storage_key = f"photos/{photo_id}.{extension}"
    
    upload_url = generate_presigned_upload_url(storage_key, payload.mime_type)
    
    return PresignResponse(
        photo_id=photo_id,
        upload_url=upload_url,
        storage_key=storage_key
    )

@router.post("/photos/confirm", response_model=PhotoRead, tags=["photos"])
async def confirm_photo(
    payload: ConfirmUpload,
    db: AsyncSession = Depends(get_db)
) -> Photo:
    if not payload.storage_key.startswith("photos/"):
        raise HTTPException(status_code=400, detail="Invalid storage key")

    photo = Photo(
        storage_key=payload.storage_key,
        public_url=f"{settings.r2_public_url}/{payload.storage_key}",
        uploader_name=payload.uploader_name,
        original_filename=payload.original_filename,
        file_size_bytes=payload.file_size_bytes,
        mime_type=payload.mime_type,
        is_approved=True
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)

    await manager.broadcast({"type": "photo_added"})
    
    return photo

@router.get("/photos", response_model=list[PhotoRead], tags=["photos"])
async def get_photos(db: AsyncSession = Depends(get_db)) -> list[Photo]:
    stmt = select(Photo).where(Photo.is_approved == True).order_by(Photo.uploaded_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    Persistent WebSocket connection for the public seating chart.
    Clients connect here and receive a ``{"type": "seating_updated"}`` message
    whenever the seating plan changes (RSVP confirmed or table assignment).
    The client is responsible for re-fetching /api/seating on its own.
    """
    await manager.connect(websocket)
    try:
        # Keep the connection open; we only push — never pull.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@router.websocket("/ws/photos")
async def photos_websocket(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
