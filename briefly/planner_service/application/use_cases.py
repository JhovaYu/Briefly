from uuid import UUID
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from domain.models import CalendarEvent


# --- Schemas ---

class EventCreate(BaseModel):
    title: str
    date: datetime
    description: str = ""


class EventFromTask(BaseModel):
    title: str
    date: str
    source: str = "task"
    source_id: str
    user_id: str


class EventResponse(BaseModel):
    id: UUID
    title: str
    description: str
    date: datetime
    source: str
    source_id: Optional[UUID] = None
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Use Cases ---

async def list_events(user_id: str, db: AsyncSession) -> List[CalendarEvent]:
    result = await db.execute(
        select(CalendarEvent).where(CalendarEvent.user_id == user_id).order_by(CalendarEvent.date)
    )
    return result.scalars().all()


async def create_event(data: EventCreate, user_id: str, db: AsyncSession) -> CalendarEvent:
    event = CalendarEvent(
        title=data.title,
        description=data.description,
        date=data.date,
        source="manual",
        user_id=user_id,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def create_event_from_task(data: EventFromTask, db: AsyncSession) -> CalendarEvent:
    # Check if an event with this source_id already exists — update instead of duplicate
    result = await db.execute(
        select(CalendarEvent).where(
            CalendarEvent.source_id == data.source_id,
            CalendarEvent.user_id == data.user_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.title = data.title
        existing.date = datetime.fromisoformat(data.date)
        existing.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing)
        return existing

    event = CalendarEvent(
        title=data.title,
        date=datetime.fromisoformat(data.date),
        source=data.source,
        source_id=data.source_id,
        user_id=data.user_id,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def delete_event(event_id: UUID, user_id: str, db: AsyncSession) -> None:
    result = await db.execute(
        select(CalendarEvent).where(CalendarEvent.id == event_id, CalendarEvent.user_id == user_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    await db.delete(event)
    await db.commit()
