from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_admin
from app.core.database import get_db
from app.core.ws_manager import manager
from app.models.guest import Guest, GuestStatus
from app.models.table import Table
from app.models.photo import Photo
from app.core.r2 import delete_object
from app.schemas.photo import PhotoRead
from app.schemas.admin import (
    AdminStats,
    GuestAdminCreate,
    GuestAdminRead,
    GuestAdminUpdate,
    TableAdminRead,
    TableAssignPayload,
)
from app.schemas.table import TableCreate, TableRead

router = APIRouter()


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------
@router.get("/stats", response_model=AdminStats, tags=["admin-stats"])
async def get_admin_stats(
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """
    Retrieve quick statistics of guests and seating tables.
    """
    total_stmt = select(func.count(Guest.id))
    confirmed_stmt = select(func.count(Guest.id)).where(Guest.status == GuestStatus.confirmed)
    declined_stmt = select(func.count(Guest.id)).where(Guest.status == GuestStatus.declined)
    pending_stmt = select(func.count(Guest.id)).where(Guest.status == GuestStatus.pending)
    tables_stmt = select(func.count(Table.id))

    total = (await db.execute(total_stmt)).scalar() or 0
    confirmed = (await db.execute(confirmed_stmt)).scalar() or 0
    declined = (await db.execute(declined_stmt)).scalar() or 0
    pending = (await db.execute(pending_stmt)).scalar() or 0
    tables_count = (await db.execute(tables_stmt)).scalar() or 0

    return {
        "total": total,
        "confirmed": confirmed,
        "declined": declined,
        "pending": pending,
        "tables_count": tables_count,
    }


# ---------------------------------------------------------------------------
# Guests CRUD
# ---------------------------------------------------------------------------
@router.get("/guests", response_model=list[GuestAdminRead], tags=["admin-guests"])
async def list_admin_guests(
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[Guest]:
    """
    List all guests along with their assigned table details.
    """
    stmt = select(Guest).options(selectinload(Guest.table)).order_by(Guest.id)
    result = await db.execute(stmt)
    guests = result.scalars().all()
    return list(guests)


@router.post("/guests", response_model=GuestAdminRead, status_code=status.HTTP_201_CREATED, tags=["admin-guests"])
async def create_admin_guest(
    payload: GuestAdminCreate,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Guest:
    """
    Create a new guest record with 'pending' status.
    """
    guest = Guest(
        first_name=payload.first_name,
        last_name=payload.last_name,
        status=GuestStatus.pending,
    )
    db.add(guest)
    await db.commit()
    await db.refresh(guest)
    return guest


@router.put("/guests/{id}", response_model=GuestAdminRead, tags=["admin-guests"])
async def update_admin_guest(
    id: int,
    payload: GuestAdminUpdate,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Guest:
    """
    Update details (name and RSVP status) for an existing guest.
    """
    stmt = select(Guest).where(Guest.id == id).options(selectinload(Guest.table))
    result = await db.execute(stmt)
    guest = result.scalar_one_or_none()

    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest with ID {id} not found",
        )

    guest.first_name = payload.first_name
    guest.last_name = payload.last_name
    guest.status = payload.status

    await db.commit()
    await db.refresh(guest)
    return guest


@router.delete("/guests/{id}", status_code=status.HTTP_204_NO_CONTENT, tags=["admin-guests"])
async def delete_admin_guest(
    id: int,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Permanently delete a guest. Related RSVP response will be cascade deleted.
    """
    stmt = select(Guest).where(Guest.id == id)
    result = await db.execute(stmt)
    guest = result.scalar_one_or_none()

    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest with ID {id} not found",
        )

    await db.delete(guest)
    await db.commit()


@router.patch("/guests/{id}/assign", response_model=GuestAdminRead, tags=["admin-guests"])
async def assign_guest_to_table(
    id: int,
    payload: TableAssignPayload,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Guest:
    """
    Assign a guest to a table. Validates that the target table is not already full.
    """
    guest_stmt = select(Guest).where(Guest.id == id).options(selectinload(Guest.table))
    guest = (await db.execute(guest_stmt)).scalar_one_or_none()
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest with ID {id} not found",
        )

    table_stmt = select(Table).where(Table.id == payload.table_id).options(selectinload(Table.guests))
    table = (await db.execute(table_stmt)).scalar_one_or_none()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with ID {payload.table_id} not found",
        )

    if guest.table_id != payload.table_id:
        current_seats = len(table.guests)
        if current_seats >= table.max_seats:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Table is full (max {table.max_seats} seats)",
            )
        guest.table_id = payload.table_id
        await db.commit()

        # Notify all connected seating-chart browsers
        await manager.broadcast({"type": "seating_updated"})

    await db.refresh(guest)
    return guest


@router.patch("/guests/{id}/unassign", response_model=GuestAdminRead, tags=["admin-guests"])
async def unassign_guest_from_table(
    id: int,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Guest:
    """
    Unassign a guest from their currently assigned table.
    """
    guest_stmt = select(Guest).where(Guest.id == id).options(selectinload(Guest.table))
    guest = (await db.execute(guest_stmt)).scalar_one_or_none()
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest with ID {id} not found",
        )

    guest.table_id = None
    await db.commit()
    await db.refresh(guest)
    return guest


# ---------------------------------------------------------------------------
# Tables CRUD
# ---------------------------------------------------------------------------
@router.get("/tables", response_model=list[TableAdminRead], tags=["admin-tables"])
async def list_admin_tables(
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """
    List all seating tables, including their guest count and nested guest lists.
    """
    stmt = select(Table).options(selectinload(Table.guests)).order_by(Table.id)
    result = await db.execute(stmt)
    tables = result.scalars().all()

    response_data = []
    for t in tables:
        response_data.append({
            "id": t.id,
            "table_name": t.table_name,
            "max_seats": t.max_seats,
            "guest_count": len(t.guests),
            "guests": t.guests,
        })
    return response_data


@router.post("/tables", response_model=TableRead, status_code=status.HTTP_201_CREATED, tags=["admin-tables"])
async def create_admin_table(
    payload: TableCreate,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Table:
    """
    Create a new seating table with a custom name and seat count.
    """
    table = Table(
        table_name=payload.table_name,
        max_seats=payload.max_seats,
    )
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return table


@router.put("/tables/{id}", response_model=TableRead, tags=["admin-tables"])
async def update_admin_table(
    id: int,
    payload: TableCreate,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Table:
    """
    Update an existing seating table's details.
    """
    stmt = select(Table).where(Table.id == id)
    table = (await db.execute(stmt)).scalar_one_or_none()

    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with ID {id} not found",
        )

    table.table_name = payload.table_name
    table.max_seats = payload.max_seats

    await db.commit()
    await db.refresh(table)
    return table


@router.delete("/tables/{id}", status_code=status.HTTP_204_NO_CONTENT, tags=["admin-tables"])
async def delete_admin_table(
    id: int,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a seating table. Fails with 400 Bad Request if guests are still assigned to the table.
    """
    stmt = select(Table).where(Table.id == id).options(selectinload(Table.guests))
    table = (await db.execute(stmt)).scalar_one_or_none()

    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with ID {id} not found",
        )

    if len(table.guests) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete table with guests assigned",
        )

    await db.delete(table)
    await db.commit()


# ---------------------------------------------------------------------------
# Photos Moderation
# ---------------------------------------------------------------------------

@router.get("/photos", response_model=list[PhotoRead], tags=["admin-photos"])
async def list_admin_photos(
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[Photo]:
    """
    List all photos, ordered by most recent first.
    """
    stmt = select(Photo).order_by(Photo.uploaded_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())

@router.patch("/photos/{id}/hide", response_model=PhotoRead, tags=["admin-photos"])
async def hide_admin_photo(
    id: int,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Photo:
    """
    Hide a photo from the public gallery.
    """
    stmt = select(Photo).where(Photo.id == id)
    photo = (await db.execute(stmt)).scalar_one_or_none()
    
    if not photo:
        raise HTTPException(status_code=404, detail=f"Photo with ID {id} not found")
        
    photo.is_approved = False
    await db.commit()
    await db.refresh(photo)
    return photo

@router.patch("/photos/{id}/show", response_model=PhotoRead, tags=["admin-photos"])
async def show_admin_photo(
    id: int,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Photo:
    """
    Show a hidden photo in the public gallery.
    """
    stmt = select(Photo).where(Photo.id == id)
    photo = (await db.execute(stmt)).scalar_one_or_none()
    
    if not photo:
        raise HTTPException(status_code=404, detail=f"Photo with ID {id} not found")
        
    photo.is_approved = True
    await db.commit()
    await db.refresh(photo)
    return photo

@router.delete("/photos/{id}", status_code=status.HTTP_204_NO_CONTENT, tags=["admin-photos"])
async def delete_admin_photo(
    id: int,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Permanently delete a photo from DB and R2.
    """
    stmt = select(Photo).where(Photo.id == id)
    photo = (await db.execute(stmt)).scalar_one_or_none()
    
    if not photo:
        raise HTTPException(status_code=404, detail=f"Photo with ID {id} not found")
    
    try:
        delete_object(photo.storage_key)
    except Exception as e:
        import logging
        logging.error(f"Failed to delete {photo.storage_key} from R2: {e}")
        
    await db.delete(photo)
    await db.commit()
