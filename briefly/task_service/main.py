from uuid import UUID
from typing import List

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database import init_db, get_db
from infrastructure.auth import get_current_user
from application.use_cases import (
    TaskCreate, TaskUpdate, TaskResponse,
    list_tasks, create_task, get_task, update_task, complete_task, delete_task,
)

app = FastAPI(title="Briefly Task Service", version="1.0.0")

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


@app.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_tasks(user["id"], db)


@app.post("/tasks", response_model=TaskResponse, status_code=201)
async def create(
    data: TaskCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_task(data, user["id"], db)


@app.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_by_id(
    task_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_task(task_id, user["id"], db)


@app.put("/tasks/{task_id}", response_model=TaskResponse)
async def update(
    task_id: UUID,
    data: TaskUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_task(task_id, data, user["id"], db)


@app.patch("/tasks/{task_id}/complete", response_model=TaskResponse)
async def mark_complete(
    task_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await complete_task(task_id, user["id"], db)


@app.delete("/tasks/{task_id}", status_code=204)
async def remove(
    task_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_task(task_id, user["id"], db)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "tasks"}
