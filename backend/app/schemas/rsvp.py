from __future__ import annotations

from pydantic import BaseModel


class RsvpPayload(BaseModel):
    guest_id: int
    dietary_preferences: str | None = None
    alcohol_preference: str | None = None
    needs_transport: bool = False


class RsvpRead(RsvpPayload):
    id: int

    model_config = {"from_attributes": True}
