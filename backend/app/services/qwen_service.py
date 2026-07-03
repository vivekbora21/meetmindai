import time
import logging
from typing import Dict, Any, List
from app.services.openrouter_service import OpenRouterService

logger = logging.getLogger(__name__)


class OpenRouterModelManager(OpenRouterService):
    def __init__(self, api_key: str, base_url: str):
        super().__init__()
        self.api_key = api_key
        self.base_url = base_url

    def execute_with_fallback(
        self, system_prompt: str, user_content: str
    ) -> Dict[str, Any]:
        """Delegates directly to the base OpenRouterService fallback execution."""
        return self._execute_openrouter_fallback(system_prompt, user_content)


class QwenService(OpenRouterService):
    def __init__(self):
        super().__init__()

    def generate_embedding(self, text: str) -> List[float]:
        """Delegates to the EmbeddingService logic (retains method signature for tests/legacy imports)."""
        from app.services.embedding_service import EmbeddingService

        return EmbeddingService().generate_embedding(text)
