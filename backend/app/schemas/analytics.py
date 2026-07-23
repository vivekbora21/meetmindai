from typing import List
from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    total_meetings: int
    completed_action_items: int
    pending_action_items: int
    total_decisions: int
    active_risks: int
    productivity_score: int  # Calculated metric
    decision_velocity: float  # Average decisions per meeting


class SpeakerMetric(BaseModel):
    name: str
    minutes_spoken: float
    percentage: float


class TopicMetric(BaseModel):
    topic: str
    count: int
