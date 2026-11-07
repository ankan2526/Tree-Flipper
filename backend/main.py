import logging
import time
import uuid
from threading import Lock
from typing import List, Optional, Tuple
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from config import settings
from database import engine, Base, get_db, ensure_level_number_column
from models import Level
from schemas import (
    LevelResponse,
    LevelCreate,
    LevelUpdate,
    LevelSummary
)
from auth import verify_admin_key
from seed import seed_initial_levels

logger = logging.getLogger(__name__)
LEVEL_SUMMARY_CACHE_TTL_SECONDS = 5
_level_summaries_cache: Optional[Tuple[float, List[LevelSummary]]] = None
_level_summaries_cache_lock = Lock()


def _invalidate_level_summaries_cache():
    global _level_summaries_cache
    with _level_summaries_cache_lock:
        _level_summaries_cache = None

# ---------------------------------------------------------------------------
# Helpers — convert DB row (tree_data JSON blob) <-> API schema
# ---------------------------------------------------------------------------

def _row_to_response(level: Level) -> LevelResponse:
    """Build a LevelResponse from the SQLAlchemy row's tree_data JSON column."""
    td = level.tree_data or {}
    return LevelResponse(
        id=level.id,
        name=level.name,
        tree=td.get("tree", {}),
        rootId=td.get("rootId", "root"),
        targetColors=td.get("targetColors", {}),
        level_number=level.level_number
    )

def _level_in_to_tree_data(level_in) -> dict:
    """Serialize a LevelCreate/LevelUpdate into the tree_data dict for storage."""
    return {
        "tree": {k: v.model_dump() for k, v in level_in.tree.items()},
        "rootId": level_in.rootId,
        "targetColors": level_in.targetColors
    }

# ---------------------------------------------------------------------------
# Lifespan (startup)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_level_number_column()
    db = next(get_db())
    try:
        seed_initial_levels(db)
    finally:
        db.close()
    yield

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Tree Flipper API",
    description="Backend API for the Tree Flipper puzzle game",
    version="2.0.0",
    lifespan=lifespan
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if not origins or "*" in origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "Tree Flipper API v2", "docs": "/docs", "status": "healthy"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/levels", response_model=List[LevelSummary])
def get_levels(db: Session = Depends(get_db)):
    """Public — list all levels with summary stats."""
    global _level_summaries_cache
    started_at = time.perf_counter()
    with _level_summaries_cache_lock:
        if _level_summaries_cache is not None:
            cached_at, cached_summaries = _level_summaries_cache
            if time.monotonic() - cached_at < LEVEL_SUMMARY_CACHE_TTL_SECONDS:
                logger.info(
                    "GET /api/levels cache_hit=true total_ms=%.1f level_count=%d",
                    (time.perf_counter() - started_at) * 1000,
                    len(cached_summaries),
                )
                return list(cached_summaries)

        database_started_at = time.perf_counter()
        levels = (
            db.query(Level.id, Level.name, Level.level_number, Level.tree_data)
            .order_by(Level.level_number, Level.id)
            .all()
        )
        query_elapsed_ms = (time.perf_counter() - database_started_at) * 1000
        summaries = []
        for level in levels:
            tree_data = level.tree_data or {}
            summaries.append(LevelSummary(
                id=level.id,
                name=level.name,
                level_number=level.level_number,
                node_count=len(tree_data.get("tree", {}))
            ))
        _level_summaries_cache = (time.monotonic(), summaries)

    logger.info(
        "GET /api/levels cache_hit=false database_ms=%.1f total_ms=%.1f level_count=%d",
        query_elapsed_ms,
        (time.perf_counter() - started_at) * 1000,
        len(summaries),
    )
    return list(summaries)

@app.get("/api/levels/{level_id}", response_model=LevelResponse)
def get_level(level_id: str, db: Session = Depends(get_db)):
    """Public — get complete tree data for a specific level."""
    level = db.query(Level).filter(Level.id == level_id).first()
    if not level:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Level '{level_id}' not found")
    return _row_to_response(level)

@app.post("/api/levels", response_model=LevelResponse, status_code=status.HTTP_201_CREATED)
def create_level(
    level_in: LevelCreate,
    db: Session = Depends(get_db),
    _admin: str = Depends(verify_admin_key)
):
    """Protected — create a new level (requires X-Admin-Key header)."""
    level_id = level_in.id or f"level-{uuid.uuid4().hex[:8]}"
    if db.query(Level).filter(Level.id == level_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"Level '{level_id}' already exists")

    new_level = Level(
        id=level_id,
        name=level_in.name,
        level_number=level_in.level_number,
        tree_data=_level_in_to_tree_data(level_in)
    )
    db.add(new_level)
    db.commit()
    db.refresh(new_level)
    _invalidate_level_summaries_cache()
    return _row_to_response(new_level)

@app.put("/api/levels/{level_id}", response_model=LevelResponse)
def update_level(
    level_id: str,
    level_in: LevelUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(verify_admin_key)
):
    """Protected — update an existing level (requires X-Admin-Key header)."""
    level = db.query(Level).filter(Level.id == level_id).first()
    if not level:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Level '{level_id}' not found")

    if level_in.name is not None:
        level.name = level_in.name
    if level_in.level_number is not None:
        level.level_number = level_in.level_number

    # Merge updated tree fields into the stored tree_data blob
    td = dict(level.tree_data or {})
    if level_in.tree is not None:
        td["tree"] = {k: v.model_dump() for k, v in level_in.tree.items()}
    if level_in.rootId is not None:
        td["rootId"] = level_in.rootId
    if level_in.targetColors is not None:
        td["targetColors"] = level_in.targetColors
    level.tree_data = td

    db.commit()
    db.refresh(level)
    _invalidate_level_summaries_cache()
    return _row_to_response(level)

@app.delete("/api/levels/{level_id}", status_code=status.HTTP_200_OK)
def delete_level(
    level_id: str,
    db: Session = Depends(get_db),
    _admin: str = Depends(verify_admin_key)
):
    """Protected — delete a level (requires X-Admin-Key header)."""
    level = db.query(Level).filter(Level.id == level_id).first()
    if not level:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Level '{level_id}' not found")
    db.delete(level)
    db.commit()
    _invalidate_level_summaries_cache()
    return {"message": f"Level '{level_id}' deleted"}
