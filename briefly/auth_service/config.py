from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://briefly_user:briefly_pass_2024@postgres:5432/briefly_db"
    jwt_secret: str = "super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
