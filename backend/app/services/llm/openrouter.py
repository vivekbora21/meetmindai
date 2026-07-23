import os
from app.services.llm.provider import LLMProvider


class OpenRouterProvider(LLMProvider):
    def __init__(self):
        api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        model_name = os.getenv("OPENROUTER_MODEL", "google/gemma-2-9b-it:free").strip()
        base_url = "https://openrouter.ai/api/v1"
        extra_headers = {
            "HTTP-Referer": "https://meetingmind.ai",
            "X-Title": "MeetingMind AI",
        }
        super().__init__(
            provider_name="openrouter",
            model_name=model_name,
            api_key=api_key,
            base_url=base_url,
            extra_headers=extra_headers,
        )

        # Load fallback cascade models
        models_str = os.getenv("OPENROUTER_MODELS", "").strip()
        if models_str:
            cascade_models = [m.strip() for m in models_str.split(",") if m.strip()]
        else:
            cascade_models = [
                "meta-llama/llama-3.3-70b-instruct:free",
                "meta-llama/llama-3-8b-instruct:free",
                "google/gemma-2-9b-it:free",
                "qwen/qwen-2.5-72b-instruct:free",
            ]

        # Place primary model at the front of the cascade
        if model_name in cascade_models:
            cascade_models.remove(model_name)
        cascade_models.insert(0, model_name)
        self.models = cascade_models

    def validate(self) -> None:
        if not self.api_key:
            raise ValueError(
                "OpenRouter API key is missing. Please set OPENROUTER_API_KEY in your environment."
            )
