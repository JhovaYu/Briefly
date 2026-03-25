from uuid import UUID
from typing import List

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database import init_db, get_db
from infrastructure.auth import get_current_user
from application.use_cases import (
    BoardCreate, CardCreate, CardMove,
    BoardResponse, BoardDetailResponse, CardResponse,
    list_boards, create_board, get_board, create_card, move_card, delete_card,
)

app = FastAPI(title="Briefly Kanban Service", version="1.0.0")

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


@app.get("/boards", response_model=List[BoardResponse])
async def get_boards(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_boards(user["id"], db)


@app.post("/boards", response_model=BoardResponse, status_code=201)
async def create(
    data: BoardCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_board(data, user["id"], db)


@app.get("/boards/{board_id}", response_model=BoardDetailResponse)
async def get_by_id(
    board_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_board(board_id, user["id"], db)


@app.post("/boards/{board_id}/cards", response_model=CardResponse, status_code=201)
async def add_card(
    board_id: UUID,
    data: CardCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_card(board_id, data, user["id"], db)


@app.patch("/cards/{card_id}/move", response_model=CardResponse)
async def move(
    card_id: UUID,
    data: CardMove,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await move_card(card_id, data, user["id"], db)


@app.delete("/cards/{card_id}", status_code=204)
async def remove(
    card_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_card(card_id, user["id"], db)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "kanban"}
