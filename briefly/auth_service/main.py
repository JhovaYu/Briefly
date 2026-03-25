from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database import init_db, get_db
from application.use_cases import (
    RegisterRequest, LoginRequest, UserResponse, LoginResponse,
    register_user, login_user, get_current_user,
)
from domain.models import User

app = FastAPI(title="Briefly Auth Service", version="1.0.0")

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


@app.post("/auth/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await register_user(data, db)
    return UserResponse(id=user.id, name=user.name, email=user.email)


@app.post("/auth/login", response_model=LoginResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await login_user(data, db)


@app.get("/auth/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse(id=current_user.id, name=current_user.name, email=current_user.email)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "auth"}
