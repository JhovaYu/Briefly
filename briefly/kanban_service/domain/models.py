import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Board(Base):
    __tablename__ = "boards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cards = relationship("Card", back_populates="board", cascade="all, delete-orphan")


class Card(Base):
    __tablename__ = "cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    column = Column(String(100), nullable=False, default="Por hacer")
    position = Column(Integer, default=0)
    assignee_id = Column(UUID(as_uuid=True), nullable=True)
    board_id = Column(UUID(as_uuid=True), ForeignKey("boards.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    board = relationship("Board", back_populates="cards")
