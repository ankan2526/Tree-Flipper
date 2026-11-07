from typing import List, Dict, Optional
from pydantic import BaseModel, Field

# --- Tree Data Models (New Format) ---

class TreeNodeData(BaseModel):
    """Represents a single node in the tree flat-map structure."""
    id: str
    children: List[str] = Field(default_factory=list)
    parentId: Optional[str] = None

class LevelBase(BaseModel):
    name: str
    level_number: int = Field(default=0, ge=0)
    # Flat map: { nodeId: {id, children, parentId} }
    tree: Dict[str, TreeNodeData]
    rootId: str
    # Map of nodeId -> "red" | "blue"
    targetColors: Dict[str, str]

class LevelCreate(LevelBase):
    id: Optional[str] = None

class LevelUpdate(BaseModel):
    name: Optional[str] = None
    level_number: Optional[int] = Field(default=None, ge=0)
    tree: Optional[Dict[str, TreeNodeData]] = None
    rootId: Optional[str] = None
    targetColors: Optional[Dict[str, str]] = None

class LevelResponse(LevelBase):
    id: str

    class Config:
        from_attributes = True

class LevelSummary(BaseModel):
    id: str
    name: str
    level_number: int
    node_count: int
