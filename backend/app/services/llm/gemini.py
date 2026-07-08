import os
from app.services.llm.provider import LLMProvider

class GeminiProvider(LLMProvider):
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
        api_key = api_key.strip()
        
        # Check MODEL_NAME from ai_config if GEMINI_MODEL is not present
        model_name = os.getenv("GEMINI_MODEL") or os.getenv("MODEL_NAME", "gemini-2.5-flash")
        model_name = model_name.strip()
        
        base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        super().__init__(
            provider_name="gemini",
            model_name=model_name,
            api_key=api_key,
            base_url=base_url
        )

    def validate(self) -> None:
        if not self.api_key:
            raise ValueError(
                "Google/Gemini API key is missing. Please set GOOGLE_API_KEY in your environment."
            )
