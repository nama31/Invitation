from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class RsvpResponse(Base):
    __tablename__ = "rsvp_responses"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), unique=True, nullable=False)
    dietary_preferences = Column(String, nullable=True)
    alcohol_preference = Column(String, nullable=True)
    needs_transport = Column(Boolean, nullable=False, default=False, server_default="false")

    # Relationships
    guest = relationship("Guest", back_populates="rsvp_response")
