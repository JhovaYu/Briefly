from uuid import UUID
from typing import List

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database import init_db, get_db
from infrastructure.auth import get_current_user
from application.use_cases import (
    NoteCreate, NoteUpdate, NoteResponse,
    list_notes, create_note, get_note, update_note, delete_note,
)

app = FastAPI(title="Briefly Note Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/notes", response_model=List[NoteResponse])
async def get_notes(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_notes(user["id"], db)


@app.post("/notes", response_model=NoteResponse, status_code=201)
async def create(
    data: NoteCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_note(data, user["id"], db)


@app.get("/notes/{note_id}", response_model=NoteResponse)
async def get_by_id(
    note_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_note(note_id, user["id"], db)


@app.put("/notes/{note_id}", response_model=NoteResponse)
async def update(
    note_id: UUID,
    data: NoteUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_note(note_id, data, user["id"], db)


@app.delete("/notes/{note_id}", status_code=204)
async def remove(
    note_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_note(note_id, user["id"], db)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "notes"}
