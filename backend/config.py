from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    ADMIN_KEY: str
    # Default to SQLite for local development convenience if DATABASE_URL is not set,
    # but in production on Render with Neon DB, set DATABASE_URL (postgresql://...)
    DATABASE_URL: str = "sqlite:///./treeflipper.db"
    CORS_ORIGINS: str = "*"

    @field_validator("ADMIN_KEY")
    @classmethod
    def validate_admin_key(cls, value: str) -> str:
        admin_key = value.strip()
        if not admin_key or admin_key == "secret-admin-key":
            raise ValueError("ADMIN_KEY must be set to a non-default secret")
        return admin_key

    class Config:
        env_file = (BACKEND_DIR / ".env", PROJECT_DIR / ".env.local")
        extra = "ignore"

settings = Settings()
