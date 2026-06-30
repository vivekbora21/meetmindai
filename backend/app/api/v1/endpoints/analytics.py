from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.connection import get_db
from app.models.models import Meeting, ActionItem, Decision, Risk, User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

class AnalyticsOverview(BaseModel):
    total_meetings: int
    completed_action_items: int
    pending_action_items: int
    total_decisions: int
    active_risks: int
    productivity_score: int # Calculated metric
    decision_velocity: float # Average decisions per meeting

class SpeakerMetric(BaseModel):
    name: str
    minutes_spoken: float
    percentage: float

class TopicMetric(BaseModel):
    topic: str
    count: int

@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve tenant aggregate statistics
    meetings_count = db.query(Meeting).filter(Meeting.organization_id == current_user.organization_id).count()
    
    total_actions = db.query(ActionItem).join(Meeting).filter(
        Meeting.organization_id == current_user.organization_id
    ).count()
    
    completed_actions = db.query(ActionItem).join(Meeting).filter(
        Meeting.organization_id == current_user.organization_id,
        ActionItem.status == "Completed"
    ).count()
    
    decisions_count = db.query(Decision).join(Meeting).filter(
        Meeting.organization_id == current_user.organization_id
    ).count()
    
    risks_count = db.query(Risk).join(Meeting).filter(
        Meeting.organization_id == current_user.organization_id
    ).count()

    pending_actions = total_actions - completed_actions
    
    # Calculate simple dummy indicators
    prod_score = 85 if total_actions > 0 else 100
    decision_vel = round(decisions_count / meetings_count, 1) if meetings_count > 0 else 0.0

    return AnalyticsOverview(
        total_meetings=meetings_count,
        completed_action_items=completed_actions,
        pending_action_items=pending_actions,
        total_decisions=decisions_count,
        active_risks=risks_count,
        productivity_score=prod_score,
        decision_velocity=decision_vel
    )

@router.get("/speakers", response_model=List[SpeakerMetric])
def get_speaker_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Dummy mock distribution for client visualization charts
    return [
        SpeakerMetric(name="Vivek Sharma", minutes_spoken=45.2, percentage=45.0),
        SpeakerMetric(name="Sarah Connor", minutes_spoken=30.1, percentage=30.0),
        SpeakerMetric(name="Alex Rivera", minutes_spoken=25.0, percentage=25.0),
    ]

@router.get("/topics", response_model=List[TopicMetric])
def get_topic_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Topic frequency distribution
    return [
        TopicMetric(topic="Authentication System", count=8),
        TopicMetric(topic="Database Migration", count=5),
        TopicMetric(topic="Jira Integration Setup", count=3),
        TopicMetric(topic="Frontend Component UI", count=12),
    ]
