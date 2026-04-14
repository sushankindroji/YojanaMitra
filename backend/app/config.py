"""
Application configuration and settings.
"""
import json
import platform
from typing import List, Optional
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_SECRET = "dev-only-secret-change-me"
_PROD_SECRET_PLACEHOLDER = "generate-with-openssl-rand-hex-32"

if platform.system() == "Windows":
    _DEFAULT_TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
else:
    _DEFAULT_TESSERACT = "/usr/bin/tesseract"


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
    DATABASE_URL: str = "postgresql://postgres:root@localhost:5432/yojanamitra"

    # Pooling
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_ECHO: bool = False

    # JWT
    SECRET_KEY: str = _DEV_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # API
    API_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # AI Services
    GEMINI_API_KEY: Optional[str] = None
    BHASHINI_USER_ID: Optional[str] = None
    BHASHINI_API_KEY: Optional[str] = None

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
    TESSERACT_PATH: str = _DEFAULT_TESSERACT
    TESSERACT_LANGS: str = "eng+hin"
    OCR_CONFIDENCE_THRESHOLD: float = 0.6
    OCR_RETRY_ATTEMPTS: int = 3

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 3600

    @field_validator("ENVIRONMENT")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        return value.strip().lower()

    @property
    def cors_allowed_origins(self) -> List[str]:
        raw_value = (self.ALLOWED_ORIGINS or "").strip()
        if not raw_value:
            return ["http://localhost:5173"]

        if raw_value.startswith("["):
            try:
                parsed = json.loads(raw_value)
                if isinstance(parsed, list):
                    return [str(origin).strip() for origin in parsed if str(origin).strip()]
            except Exception:
                pass

        return [origin.strip() for origin in raw_value.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @model_validator(mode="after")
    def validate_production_required_settings(self):
        if not self.is_production:
            return self

        missing = []
        if not self.DATABASE_URL:
            missing.append("DATABASE_URL")

        if not self.SECRET_KEY:
            missing.append("SECRET_KEY")
        else:
            lowered_secret = self.SECRET_KEY.lower()
            if "generate-with" in lowered_secret or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "Invalid production SECRET_KEY: must be at least 32 characters and must not contain placeholder text"
                )

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
