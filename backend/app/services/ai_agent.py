import logging
from typing import Dict, Any
from app.services.ai.gemini_service import GeminiService

logger = logging.getLogger(__name__)


class AIAgentPipeline:
    def __init__(self):
        self.gemini_service = GeminiService()

    def extract_meeting_insights(self, transcript_text: str) -> Dict[str, Any]:
        """Delegates directly to GeminiService."""
        return self.gemini_service.extract_meeting_insights(transcript_text)
