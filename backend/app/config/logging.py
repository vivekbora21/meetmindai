from pydantic_settings import BaseSettings, SettingsConfigDict


class LoggingSettings(BaseSettings):
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


logging_settings = LoggingSettings()

# Initialize the custom logging configuration
from app.utils.logging_pipeline import setup_logging

setup_logging(logging_settings.LOG_LEVEL)
