from typing import List
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.models import Transcript

class VectorRepository(BaseRepository[Transcript]):
    def __init__(self):
        super().__init__(Transcript)

    def similarity_search(self, db: Session, meeting_id: str, query_embedding: List[float], limit: int = 5) -> List[Transcript]:
        """
        Uses pgvector's L2 distance operator (<->) to find similar transcripts.
        Assumes pgvector is installed and the embedding column is configured correctly.
        """
        return (
            db.query(self.model)
            .filter(self.model.meeting_id == meeting_id)
            .filter(self.model.embedding.isnot(None))
            .order_by(self.model.embedding.l2_distance(query_embedding))
            .limit(limit)
            .all()
        )

vector_repository = VectorRepository()
