from __future__ import annotations

from app.models.guest import GuestStatus
from pydantic import BaseModel, model_validator


class RsvpPayload(BaseModel):
    status: GuestStatus
    dietary_preferences: str | None = None
    alcohol_preference: str | None = None
    needs_transport: bool = False

    @model_validator(mode="after")
    def validate_rsvp(self) -> RsvpPayload:
        if self.status == GuestStatus.declined:
            self.dietary_preferences = None
            self.alcohol_preference = None
            self.needs_transport = False
        return self


class RsvpRead(BaseModel):
    id: int
    guest_id: int
    dietary_preferences: str | None = None
    alcohol_preference: str | None = None
    needs_transport: bool = False

    model_config = {"from_attributes": True}
