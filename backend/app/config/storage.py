from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class StorageSettings(BaseSettings):
    S3_ENDPOINT: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    UPLOADS_DIR: str = "uploads"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

storage_settings = StorageSettings()
