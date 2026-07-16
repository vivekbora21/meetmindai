from pydantic_settings import BaseSettings, SettingsConfigDict

class DatabaseSettings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/meetingmind"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

database_settings = DatabaseSettings()
