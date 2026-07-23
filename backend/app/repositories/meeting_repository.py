from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.repositories.base import BaseRepository
from app.models.models import Meeting
from app.models.enums import MeetingStatus, AIStatus


class MeetingRepository(BaseRepository[Meeting]):
    def __init__(self):
        super().__init__(Meeting)

    def get_user_meetings(
        self, db: Session, organization_id: str, include_future: bool = False
    ) -> List[Meeting]:
        query = db.query(self.model).filter(
            self.model.organization_id == organization_id
        )

        if not include_future:
            now = datetime.utcnow()
            query = query.filter(
                (self.model.meeting_date <= now)
                | (self.model.status.notin_(MeetingStatus.uploaded_values()))
                | (self.model.recording_url.isnot(None))
            )

        return query.order_by(self.model.meeting_date.desc()).all()

    def clean_stuck_meetings(
        self, db: Session, organization_id: str, threshold_minutes: int = 15
    ) -> int:
        stale_threshold = datetime.utcnow() - timedelta(minutes=threshold_minutes)
        stuck_meetings = (
            db.query(self.model)
            .filter(
                self.model.organization_id == organization_id,
                self.model.created_at < stale_threshold,
                (
                    self.model.status.in_(MeetingStatus.processing_values())
                    | (
                        self.model.status.in_(MeetingStatus.uploaded_values())
                        & self.model.recording_url.isnot(None)
                    )
                ),
            )
            .all()
        )

        count = 0
        if stuck_meetings:
            for m in stuck_meetings:
                m.status = MeetingStatus.FAILED.value
                if m.ai_status in AIStatus.active_values():
                    m.ai_status = AIStatus.FAILED.value
                if m.embedding_status in AIStatus.active_values():
                    m.embedding_status = AIStatus.FAILED.value
                if m.speaker_status in AIStatus.active_values():
                    m.speaker_status = AIStatus.FAILED.value
                if m.kg_status in AIStatus.active_values():
                    m.kg_status = AIStatus.FAILED.value
                count += 1
            db.commit()

        return count


meeting_repository = MeetingRepository()
