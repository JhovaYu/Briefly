from uuid import UUID
from datetime import datetime
from typing import Optional, List

import httpx
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from domain.models import Task
from config import settings


# --- Schemas ---

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: str
    due_date: Optional[datetime] = None
    completed: bool
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Planner Sync ---

async def sync_task_to_planner(task: Task, user_id: str) -> None:
    if task.due_date:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{settings.planner_url}/events/from-task",
                    json={
                        "title": task.title,
                        "date": task.due_date.isoformat(),
                        "source": "task",
                        "source_id": str(task.id),
                        "user_id": user_id,
                    },
                    timeout=5.0,
                )
        except Exception:
            pass  # Don't block task creation if planner fails


# --- Use Cases ---

async def list_tasks(user_id: str, db: AsyncSession) -> List[Task]:
    result = await db.execute(
        select(Task).where(Task.user_id == user_id).order_by(Task.created_at.desc())
    )
    return result.scalars().all()


async def create_task(data: TaskCreate, user_id: str, db: AsyncSession) -> Task:
    task = Task(
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        user_id=user_id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    await sync_task_to_planner(task, user_id)
    return task


async def get_task(task_id: UUID, user_id: str, db: AsyncSession) -> Task:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


async def update_task(task_id: UUID, data: TaskUpdate, user_id: str, db: AsyncSession) -> Task:
    task = await get_task(task_id, user_id, db)
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.due_date is not None:
        task.due_date = data.due_date
    task.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(task)
    await sync_task_to_planner(task, user_id)
    return task


async def complete_task(task_id: UUID, user_id: str, db: AsyncSession) -> Task:
    task = await get_task(task_id, user_id, db)
    task.completed = not task.completed
    task.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(task_id: UUID, user_id: str, db: AsyncSession) -> None:
    task = await get_task(task_id, user_id, db)
    await db.delete(task)
    await db.commit()
