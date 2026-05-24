from __future__ import annotations

from pydantic import BaseModel


class TableBase(BaseModel):
    table_name: str
    max_seats: int


class TableCreate(TableBase):
    pass


class TableRead(TableBase):
    id: int

    model_config = {"from_attributes": True}
