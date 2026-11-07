from pathlib import Path

from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    ADMIN_KEY: str = "secret-admin-key"
    # Default to SQLite for local development convenience if DATABASE_URL is not set,
    # but in production on Render with Neon DB, set DATABASE_URL (postgresql://...)
    DATABASE_URL: str = "sqlite:///./treeflipper.db"
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = (BACKEND_DIR / ".env", PROJECT_DIR / ".env.local")
        extra = "ignore"

settings = Settings()
