import logging
from typing import Dict, Any
from app.services.openrouter_service import OpenRouterService

logger = logging.getLogger(__name__)


class AIAgentPipeline:
    def __init__(self):
        self.openrouter_service = OpenRouterService()

    def extract_meeting_insights(self, transcript_text: str) -> Dict[str, Any]:
        """Delegates directly to OpenRouterService."""
        return self.openrouter_service.extract_meeting_insights(transcript_text)
