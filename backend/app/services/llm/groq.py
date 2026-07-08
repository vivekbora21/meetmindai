import os
from app.services.llm.provider import LLMProvider

class GroqProvider(LLMProvider):
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
        base_url = "https://api.groq.com/openai/v1"
        super().__init__(
            provider_name="groq",
            model_name=model_name,
            api_key=api_key,
            base_url=base_url
        )

    def validate(self) -> None:
        if not self.api_key:
            raise ValueError(
                "Groq API key is missing. Please set GROQ_API_KEY in your environment."
            )
