import os
from dotenv import load_dotenv

load_dotenv()


def get_env(name: str, default: str | None = None) -> str | None:
    return os.getenv(name, default)


class Settings:
    MICROSOFT_CLIENT_ID: str | None = get_env("MICROSOFT_CLIENT_ID")
    MICROSOFT_CLIENT_SECRET: str | None = get_env("MICROSOFT_CLIENT_SECRET")
    MICROSOFT_TENANT_ID: str = get_env("MICROSOFT_TENANT_ID", "common")
    MICROSOFT_REDIRECT_URI: str | None = get_env("MICROSOFT_REDIRECT_URI")

    GOOGLE_CLIENT_ID: str | None = get_env("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str | None = get_env("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str | None = get_env("GOOGLE_REDIRECT_URI")
    
    JWT_SECRET: str = get_env(
        "JWT_SECRET", "supersecretkeymeetingmind_secure_key_at_least_32_bytes_long"
    )
    DATABASE_URL: str = get_env(
        "DATABASE_URL", "postgresql://postgres:password@localhost:5432/meetingmind"
    )
    REDIS_URL: str = get_env("REDIS_URL", "redis://localhost:6379/0")


settings = Settings()

