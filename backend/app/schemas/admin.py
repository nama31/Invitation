from __future__ import annotations

from pydantic import BaseModel
from app.models.guest import GuestStatus
from app.schemas.guest import GuestPublic
from app.schemas.table import TableRead


class AdminStats(BaseModel):
    total: int
    confirmed: int
    declined: int
    pending: int
    tables_count: int


class GuestAdminCreate(BaseModel):
    first_name: str
    last_name: str


class GuestAdminUpdate(BaseModel):
    first_name: str
    last_name: str
    status: GuestStatus


class GuestAdminRead(BaseModel):
    id: int
    first_name: str
    last_name: str
    status: GuestStatus
    table_id: int | None = None
    table: TableRead | None = None

    model_config = {"from_attributes": True}


class TableAdminRead(BaseModel):
    id: int
    table_name: str
    max_seats: int
    guest_count: int
    guests: list[GuestPublic]

    model_config = {"from_attributes": True}


class TableAssignPayload(BaseModel):
    table_id: int
