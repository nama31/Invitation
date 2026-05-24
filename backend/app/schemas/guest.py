from __future__ import annotations

from app.models.guest import GuestStatus
from pydantic import BaseModel


class GuestBase(BaseModel):
    first_name: str
    last_name: str
    status: GuestStatus = GuestStatus.pending
    table_id: int | None = None


class GuestCreate(GuestBase):
    pass


class GuestUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    status: GuestStatus | None = None
    table_id: int | None = None


class GuestRead(GuestBase):
    id: int

    model_config = {"from_attributes": True}
