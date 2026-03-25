from uuid import UUID
from datetime import datetime
from typing import Optional, List

import httpx
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from domain.models import Board, Card
from config import settings


# --- Schemas ---

class BoardCreate(BaseModel):
    title: str


class CardCreate(BaseModel):
    title: str
    description: str = ""
    column: str = "Por hacer"
    assignee_id: Optional[str] = None


class CardMove(BaseModel):
    column: str


class CardResponse(BaseModel):
    id: UUID
    title: str
    description: str
    column: str
    position: int
    assignee_id: Optional[UUID] = None
    board_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BoardResponse(BaseModel):
    id: UUID
    title: str
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BoardDetailResponse(BoardResponse):
    cards: List[CardResponse] = []


# --- Use Cases ---

async def list_boards(user_id: str, db: AsyncSession) -> List[Board]:
    result = await db.execute(
        select(Board).where(Board.user_id == user_id).order_by(Board.created_at.desc())
    )
    return result.scalars().all()


async def create_board(data: BoardCreate, user_id: str, db: AsyncSession) -> Board:
    board = Board(title=data.title, user_id=user_id)
    db.add(board)
    await db.commit()
    await db.refresh(board)

    # Create default columns with sample cards
    default_columns = ["Por hacer", "En progreso", "Revisión", "Completado"]
    for i, col in enumerate(default_columns):
        # Just a placeholder position card is not created here; columns are implicit via card column field
        pass

    return board


async def get_board(board_id: UUID, user_id: str, db: AsyncSession) -> Board:
    result = await db.execute(
        select(Board)
        .where(Board.id == board_id, Board.user_id == user_id)
        .options(selectinload(Board.cards))
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return board


async def create_card(board_id: UUID, data: CardCreate, user_id: str, db: AsyncSession) -> Card:
    # Verify board ownership
    result = await db.execute(
        select(Board).where(Board.id == board_id, Board.user_id == user_id)
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")

    card = Card(
        title=data.title,
        description=data.description,
        column=data.column,
        assignee_id=data.assignee_id if data.assignee_id else None,
        board_id=board_id,
    )
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


async def move_card(card_id: UUID, data: CardMove, user_id: str, db: AsyncSession) -> Card:
    result = await db.execute(
        select(Card).join(Board).where(Card.id == card_id, Board.user_id == user_id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    old_column = card.column
    card.column = data.column
    card.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(card)

    # Broadcast via collaboration service
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.collaboration_url}/broadcast/{card.board_id}",
                json={
                    "type": "card_moved",
                    "card_id": str(card.id),
                    "column": data.column,
                    "old_column": old_column,
                    "moved_by": user_id,
                },
                timeout=3.0,
            )
    except Exception:
        pass  # Don't fail the move if broadcast fails

    return card


async def delete_card(card_id: UUID, user_id: str, db: AsyncSession) -> None:
    result = await db.execute(
        select(Card).join(Board).where(Card.id == card_id, Board.user_id == user_id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    await db.delete(card)
    await db.commit()
