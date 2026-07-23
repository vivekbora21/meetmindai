import os
from app.services.llm.provider import LLMProvider


class OpenAIProvider(LLMProvider):
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
        super().__init__(provider_name="openai", model_name=model_name, api_key=api_key)

    def validate(self) -> None:
        if not self.api_key:
            raise ValueError(
                "OpenAI API key is missing. Please set OPENAI_API_KEY in your environment."
            )
