from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class AISettings(BaseSettings):
    LLM_PROVIDER: str = "openrouter"
    
    # OpenRouter
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "google/gemma-2-9b-it:free"

    # Ollama
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Google Gemini
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Groq
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # AI General Config (From ai_config.py)
    MODEL_NAME: str = "gemini-2.5-flash"
    AI_TIMEOUT: float = 30.0
    AI_MAX_RETRIES: int = 3
    AI_TEMPERATURE: float = 0.2
    AI_TOP_P: float = 0.95
    AI_MAX_OUTPUT_TOKENS: int = 8192

    # Whisper
    WHISPER_MODEL_SIZE: str = "base"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

ai_settings = AISettings()
