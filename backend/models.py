import uuid
from sqlalchemy import Column, Integer, String, JSON
from database import Base

class Level(Base):
    __tablename__ = "levels"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String, nullable=False)
    level_number = Column(Integer, nullable=False, default=0, server_default="0")
    # tree_data stores nodes, edges, target_colors, and metadata
    tree_data = Column(JSON, nullable=False)
