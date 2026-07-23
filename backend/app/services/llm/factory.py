import os
import logging
from typing import Dict, Type, Optional
from app.services.llm.provider import LLMProvider
from app.services.llm.openrouter import OpenRouterProvider
from app.services.llm.ollama import OllamaProvider
from app.services.llm.openai import OpenAIProvider
from app.services.llm.gemini import GeminiProvider
from app.services.llm.groq import GroqProvider

logger = logging.getLogger(__name__)


class LLMFactory:
    _providers: Dict[str, Type[LLMProvider]] = {
        "openrouter": OpenRouterProvider,
        "ollama": OllamaProvider,
        "openai": OpenAIProvider,
        "gemini": GeminiProvider,
        "groq": GroqProvider,
    }

    @classmethod
    def get_provider(cls, provider_name: Optional[str] = None) -> LLMProvider:
        """
        Gets and validates the LLM provider instance.
        If provider_name is None, loads the default from the LLM_PROVIDER env variable.
        """
        if not provider_name:
            provider_name = os.getenv("LLM_PROVIDER", "").strip().lower()

        if not provider_name:
            raise ValueError(
                "LLM_PROVIDER environment variable is not set and no provider name was supplied."
            )

        if provider_name not in cls._providers:
            raise ValueError(f"Unsupported LLM provider: {provider_name}")

        provider_cls = cls._providers[provider_name]
        provider_instance = provider_cls()

        # Validate keys/config
        provider_instance.validate()

        return provider_instance
