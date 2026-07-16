from pydantic_settings import BaseSettings, SettingsConfigDict

class SecuritySettings(BaseSettings):
    PYTHON_ENV: str = "development"
    ALLOWED_HOSTS: str = "*"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

security_settings = SecuritySettings()
