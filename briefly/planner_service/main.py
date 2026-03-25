from uuid import UUID
from typing import List

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database import init_db, get_db
from infrastructure.auth import get_current_user
from application.use_cases import (
    EventCreate, EventFromTask, EventResponse,
    list_events, create_event, create_event_from_task, delete_event,
)

app = FastAPI(title="Briefly Planner Service", version="1.0.0")

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


@app.get("/events", response_model=List[EventResponse])
async def get_events(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_events(user["id"], db)


@app.post("/events", response_model=EventResponse, status_code=201)
async def create(
    data: EventCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_event(data, user["id"], db)


@app.post("/events/from-task", response_model=EventResponse, status_code=201)
async def from_task(
    data: EventFromTask,
    db: AsyncSession = Depends(get_db),
):
    return await create_event_from_task(data, db)


@app.delete("/events/{event_id}", status_code=204)
async def remove(
    event_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_event(event_id, user["id"], db)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "planner"}
