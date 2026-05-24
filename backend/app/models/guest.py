import enum

from sqlalchemy import Column, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class GuestStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    declined = "declined"


class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    status = Column(
        Enum(GuestStatus, name="gueststatus"),
        nullable=False,
        default=GuestStatus.pending,
        server_default="pending",
    )
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True)

    # Relationships
    table = relationship("Table", back_populates="guests")
    rsvp_response = relationship("RsvpResponse", back_populates="guest", uselist=False)
