from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

database_url = settings.DATABASE_URL
# Use the existing psycopg2 driver for both common PostgreSQL URL schemes.
for scheme in ("postgres://", "postgresql://"):
    if database_url.startswith(scheme):
        database_url = f"postgresql+psycopg2://{database_url[len(scheme):]}"
        break

engine_kwargs = {}
if "sqlite" in database_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Production pool settings for Neon serverless PostgreSQL
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_level_number_column():
    with engine.begin() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("levels")}
        if "level_number" not in columns:
            connection.execute(text(
                "ALTER TABLE levels ADD COLUMN level_number INTEGER NOT NULL DEFAULT 0"
            ))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
