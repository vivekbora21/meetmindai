import os
from dotenv import load_dotenv

from app.config.database import database_settings
from app.config.redis import redis_settings
from app.config.auth import auth_settings
from app.config.ai import ai_settings
from app.config.storage import storage_settings
from app.config.celery import celery_settings
from app.config.logging import logging_settings
from app.config.security import security_settings
from app.config.email import email_settings

load_dotenv()

# Backward compatible get_env
def get_env(name: str, default: str | None = None) -> str | None:
    return os.getenv(name, default)

class Settings:
    @property
    def MICROSOFT_CLIENT_ID(self): return auth_settings.MICROSOFT_CLIENT_ID
    @property
    def MICROSOFT_CLIENT_SECRET(self): return auth_settings.MICROSOFT_CLIENT_SECRET
    @property
    def MICROSOFT_TENANT_ID(self): return auth_settings.MICROSOFT_TENANT_ID
    @property
    def MICROSOFT_REDIRECT_URI(self): return auth_settings.MICROSOFT_REDIRECT_URI

    @property
    def GOOGLE_CLIENT_ID(self): return auth_settings.GOOGLE_CLIENT_ID
    @property
    def GOOGLE_CLIENT_SECRET(self): return auth_settings.GOOGLE_CLIENT_SECRET
    @property
    def GOOGLE_REDIRECT_URI(self): return auth_settings.GOOGLE_REDIRECT_URI

    @property
    def ZOOM_CLIENT_ID(self): return auth_settings.ZOOM_CLIENT_ID
    @property
    def ZOOM_CLIENT_SECRET(self): return auth_settings.ZOOM_CLIENT_SECRET
    @property
    def ZOOM_REDIRECT_URI(self): return auth_settings.ZOOM_REDIRECT_URI
    @property
    def ZOOM_AUTH_URL(self): return auth_settings.ZOOM_AUTH_URL
    @property
    def ZOOM_TOKEN_URL(self): return auth_settings.ZOOM_TOKEN_URL
    @property
    def ZOOM_API_BASE(self): return auth_settings.ZOOM_API_BASE

    @property
    def JWT_SECRET(self): return auth_settings.JWT_SECRET
    @property
    def JWT_ALGORITHM(self): return auth_settings.JWT_ALGORITHM
    @property
    def JWT_EXPIRE_MINUTES(self): return auth_settings.JWT_EXPIRE_MINUTES
    
    @property
    def DATABASE_URL(self): return database_settings.DATABASE_URL
    @property
    def REDIS_URL(self): return redis_settings.REDIS_URL

    @property
    def email(self): return email_settings

settings = Settings()
