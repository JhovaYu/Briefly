from uuid import UUID
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from domain.models import Note


# --- Schemas ---

class NoteCreate(BaseModel):
    title: str = "Sin título"
    content: str = ""


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class NoteResponse(BaseModel):
    id: UUID
    title: str
    content: str
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Use Cases ---

async def list_notes(user_id: str, db: AsyncSession) -> List[Note]:
    result = await db.execute(
        select(Note).where(Note.user_id == user_id).order_by(Note.updated_at.desc())
    )
    return result.scalars().all()


async def create_note(data: NoteCreate, user_id: str, db: AsyncSession) -> Note:
    note = Note(title=data.title, content=data.content, user_id=user_id)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def get_note(note_id: UUID, user_id: str, db: AsyncSession) -> Note:
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


async def update_note(note_id: UUID, data: NoteUpdate, user_id: str, db: AsyncSession) -> Note:
    note = await get_note(note_id, user_id, db)
    if data.title is not None:
        note.title = data.title
    if data.content is not None:
        note.content = data.content
    note.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(note_id: UUID, user_id: str, db: AsyncSession) -> None:
    note = await get_note(note_id, user_id, db)
    await db.delete(note)
    await db.commit()
