import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    date = Column(DateTime, nullable=False)
    source = Column(String(50), default="manual")  # "manual" or "task"
    source_id = Column(UUID(as_uuid=True), nullable=True)  # ID of the source task if any
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
