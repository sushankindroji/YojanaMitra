"""
Application configuration and settings.
"""
from typing import List, Optional
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_SECRET = "dev-only-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "YojanaMitra API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    AUTO_RUN_MIGRATIONS: bool = True

    # Database
    DATABASE_TYPE: str = "postgresql"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/yojanamitra"
    DB_HOST: Optional[str] = None
    DB_PORT: int = 5432
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_NAME: Optional[str] = None

    # Pooling
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_ECHO: bool = False

    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False
    CACHE_TTL: int = 3600

    # JWT
    SECRET_KEY: str = _DEV_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # API
    API_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:3000",
        ]
    )

    # AI Services
    GEMINI_API_KEY: Optional[str] = None

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Encryption
    ENCRYPTION_KEY: Optional[str] = None

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: str = "noreply@yojanamitra.in"

    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024

    # OCR
    TESSERACT_PATH: Optional[str] = None
    OCR_RETRY_ATTEMPTS: int = 3

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 3600

    @field_validator("ENVIRONMENT")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @model_validator(mode="after")
    def validate_production_required_settings(self):
        if not self.is_production:
            return self

        missing = []
        if not self.DATABASE_URL and not all([self.DB_HOST, self.DB_USER, self.DB_PASSWORD, self.DB_NAME]):
            missing.append("DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME")

        if not self.SECRET_KEY or self.SECRET_KEY in {_DEV_SECRET, "your_64_character_random_secret_key_here"}:
            missing.append("SECRET_KEY")

        if not self.ENCRYPTION_KEY:
            missing.append("ENCRYPTION_KEY")

        if missing:
            raise ValueError(
                "Missing required production environment variables: " + ", ".join(missing)
            )

        if self.DEBUG:
            raise ValueError("DEBUG must be false in production")

        return self


settings = Settings()
