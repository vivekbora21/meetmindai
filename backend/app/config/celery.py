from pydantic_settings import BaseSettings, SettingsConfigDict

class CelerySettings(BaseSettings):
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

celery_settings = CelerySettings()
