from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.connection import get_db
from app.models.models import KnowledgeGraphNode, KnowledgeGraphEdge, User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

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

@router.get("/graph", response_model=GraphDataOut)
def get_knowledge_graph(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch all nodes and edges for current tenant
    nodes = db.query(KnowledgeGraphNode).filter(
        KnowledgeGraphNode.organization_id == current_user.organization_id
    ).all()
    
    edges = db.query(KnowledgeGraphEdge).filter(
        KnowledgeGraphEdge.organization_id == current_user.organization_id
    ).all()
    
    return GraphDataOut(nodes=nodes, edges=edges)
