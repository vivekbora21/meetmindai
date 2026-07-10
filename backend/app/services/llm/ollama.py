import os
from app.services.llm.provider import LLMProvider


class OllamaProvider(LLMProvider):
    def __init__(self):
        model_name = os.getenv("OLLAMA_MODEL", "llama3").strip()
        base_url = (
            os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip().rstrip("/")
        )
        # Append /v1 if not present
        if not base_url.endswith("/v1") and not base_url.endswith("/v1/"):
            base_url = f"{base_url}/v1"

        super().__init__(
            provider_name="ollama",
            model_name=model_name,
            api_key="ollama",
            base_url=base_url,
        )
