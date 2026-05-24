from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    table_name = Column(String, nullable=False)
    max_seats = Column(Integer, nullable=False)

    # Relationships
    guests = relationship("Guest", back_populates="table", lazy="select")
