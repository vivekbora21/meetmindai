import logging
from typing import Dict, Any, List, Generator
from app.services.ai.gemini_service import GeminiService

logger = logging.getLogger(__name__)


class OpenRouterService:
    """
    Backward-compatible wrapper that delegates all LLM operations to the new GeminiService.
    """

    def __init__(self):
        self.gemini_service = GeminiService()
        self.models = [self.gemini_service.model_name]
        self.provider = "gemini"

    def extract_meeting_insights(self, transcript_text: str) -> Dict[str, Any]:
        logger.info(
            "OpenRouterService | Delegating extract_meeting_insights to GeminiService."
        )
        return self.gemini_service.extract_meeting_insights(transcript_text)

    def diarize_transcript(
        self, segments: List[Dict[str, Any]], known_users: List[str] = None
    ) -> Dict[str, Any]:
        logger.info(
            "OpenRouterService | Delegating diarize_transcript to GeminiService."
        )
        return self.gemini_service.diarize_transcript(segments, known_users)

    def generate_answer(
        self,
        question: str,
        context: str,
        chat_history: List[Dict[str, str]] = None,
        system_prompt: str = None,
    ) -> str:
        logger.info("OpenRouterService | Delegating generate_answer to GeminiService.")
        return self.gemini_service.generate_chat_response(
            question=question,
            context=context,
            chat_history=chat_history,
            system_prompt=system_prompt,
        )

    def generate_answer_stream(
        self,
        question: str,
        context: str,
        chat_history: List[Dict[str, str]] = None,
        system_prompt: str = None,
    ) -> Generator[str, None, None]:
        logger.info(
            "OpenRouterService | Delegating generate_answer_stream to GeminiService."
        )
        return self.gemini_service.generate_chat_response_stream(
            question=question,
            context=context,
            chat_history=chat_history,
            system_prompt=system_prompt,
        )

    def generate_chat_title(self, question: str) -> str:
        logger.info(
            "OpenRouterService | Delegating generate_chat_title to GeminiService."
        )
        return self.gemini_service.generate_title(question)
