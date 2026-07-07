import os
from app.config.settings import get_env

# Central AI Configuration for Gemini Service

GOOGLE_API_KEY = get_env("GOOGLE_API_KEY", "")

# Default Model name
MODEL_NAME = get_env("MODEL_NAME", "gemini-2.5-flash")

# Timeout in seconds for API calls
TIMEOUT = float(get_env("AI_TIMEOUT", "30.0"))

# Maximum number of retry attempts for failed requests
MAX_RETRIES = int(get_env("AI_MAX_RETRIES", "3"))

# Generation Parameters
TEMPERATURE = float(get_env("AI_TEMPERATURE", "0.2"))
TOP_P = float(get_env("AI_TOP_P", "0.95"))
MAX_OUTPUT_TOKENS = int(get_env("AI_MAX_OUTPUT_TOKENS", "8192"))
