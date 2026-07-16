from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class AuthSettings(BaseSettings):
    JWT_SECRET: str = "supersecretkeymeetingmind_secure_key_at_least_32_bytes_long"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_TENANT_ID: str = "common"
    MICROSOFT_REDIRECT_URI: Optional[str] = None

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None

    ZOOM_CLIENT_ID: Optional[str] = None
    ZOOM_CLIENT_SECRET: Optional[str] = None
    ZOOM_REDIRECT_URI: Optional[str] = None
    ZOOM_AUTH_URL: str = "https://zoom.us/oauth/authorize"
    ZOOM_TOKEN_URL: str = "https://zoom.us/oauth/token"
    ZOOM_API_BASE: str = "https://api.zoom.us/v2"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

auth_settings = AuthSettings()
