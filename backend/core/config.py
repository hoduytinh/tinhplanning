"""Application configuration loaded from environment variables."""
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings.

    All values can be overridden via environment variables (see .env.example).
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database — SQLite file lives in a mounted volume so it survives rebuilds.
    # DATA_DIR points at that volume (Docker: /data, Railway: your mount path).
    # DATABASE_URL, if left empty, is derived from DATA_DIR below.
    DATA_DIR: str = "/data"
    DATABASE_URL: str = ""

    # CORS — comma separated list of allowed origins (Vercel domain in prod).
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # App metadata
    APP_NAME: str = "LeadBoard API"
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"
    LOG_LEVEL: str = "INFO"

    # Auth / JWT
    SECRET_KEY: str = "dev-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Seed admin account (set before first run)
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @model_validator(mode="after")
    def _default_database_url(self) -> "Settings":
        # When DATABASE_URL is not provided, build a SQLite path inside DATA_DIR.
        # With the default DATA_DIR=/data this yields sqlite:////data/leadboard.db
        # (identical to the previous default), so existing behaviour is preserved.
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"sqlite:///{self.DATA_DIR}/leadboard.db"
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
