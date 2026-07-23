from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class NodeOut(BaseModel):
    id: str
    entity_type: str
    name: str
    description: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class EdgeOut(BaseModel):
    id: str
    source_node_id: str
    target_node_id: str
    relationship_type: str
    weight: float

    class Config:
        from_attributes = True


class GraphDataOut(BaseModel):
    nodes: List[NodeOut]
    edges: List[EdgeOut]
