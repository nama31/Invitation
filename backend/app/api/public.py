from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.guest import Guest, GuestStatus
from app.models.rsvp import RsvpResponse
from app.models.table import Table
from app.schemas.guest import GuestPublic
from app.schemas.rsvp import RsvpPayload

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
