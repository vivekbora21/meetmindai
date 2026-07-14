from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.connection import get_db
from app.models.models import KnowledgeGraphNode, KnowledgeGraphEdge, User
from app.helpers.auth import get_current_user
from app.schemas.knowledge import NodeOut, EdgeOut, GraphDataOut

router = APIRouter()


@router.get("/graph", response_model=GraphDataOut)
def get_knowledge_graph(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Fetch all nodes and edges for current tenant
    nodes = (
        db.query(KnowledgeGraphNode)
        .filter(KnowledgeGraphNode.organization_id == current_user.organization_id)
        .all()
    )

    edges = (
        db.query(KnowledgeGraphEdge)
        .filter(KnowledgeGraphEdge.organization_id == current_user.organization_id)
        .all()
    )

    return GraphDataOut(nodes=nodes, edges=edges)
