from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://eventinvite:secret@localhost:5432/eventinvite"

    # JWT
    JWT_SECRET: str = "change_me_in_production"
    JWT_EXPIRE_MINUTES: int = 60

    # Event details
    EVENT_NAME: str = "Our Event"
    EVENT_DATE: str = "2025-09-14T18:00:00"
    # event place
    VENUE: str = "Vavilon"

    # Admin seed credentials
    ADMIN_EMAIL: str = "admin@event.com"
    ADMIN_PASSWORD: str = "change_me"


settings = Settings()
