from pydantic_settings import BaseSettings


class EmailSettings(BaseSettings):
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@meetingmind.ai"
    SMTP_FROM_NAME: str = "MeetingMind AI"
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


email_settings = EmailSettings()
