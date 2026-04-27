"""Application configuration and settings."""

import json
import logging
import os
import platform
import sys
from typing import List, Optional

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

if platform.system() == "Windows":
    _DEFAULT_TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
else:
    _DEFAULT_TESSERACT = "/usr/bin/tesseract"

_INSECURE_SECRET_VALUES = {
    "secret",
    "changeme",
    "your-secret-key",
    "mysecret",
    "dev-only-secret-change-me",
    "generate-with-openssl-rand-hex-32",
}


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
    DATABASE_URL: str

    # Pooling
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    DB_ECHO: bool = False

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # API
    API_BASE_URL: str = ""
    FRONTEND_URL: str = ""
    ALLOWED_ORIGINS: str = "http://127.0.0.1:5173"

    # AI Services
    GEMINI_API_KEY: Optional[str] = ""
    BHASHINI_USER_ID: Optional[str] = ""
    BHASHINI_API_KEY: Optional[str] = ""
    BHASHINI_PIPELINE_ID: str = "64392f96daac500b55c543cd"

    # Encryption
    ENCRYPTION_KEY: Optional[str] = ""

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = ""
    SMTP_PASSWORD: Optional[str] = ""
    FROM_EMAIL: str = "noreply@yojanamitra.in"

    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024

    # OCR
    TESSERACT_PATH: str = _DEFAULT_TESSERACT
    TESSERACT_LANGS: str = "eng+hin"
    OCR_CONFIDENCE_THRESHOLD: float = 0.6
    OCR_RETRY_ATTEMPTS: int = 3

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 3600

    # Cache
    REDIS_URL: str = ""

    @field_validator("ENVIRONMENT")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        return (value or "development").strip().lower()

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        candidate = (value or "").strip()
        if len(candidate) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        if candidate.lower() in _INSECURE_SECRET_VALUES:
            raise ValueError(
                "SECRET_KEY is insecure/default. Generate with: openssl rand -hex 32"
            )
        return candidate

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        candidate = (value or "").strip()
        if not candidate:
            raise ValueError("DATABASE_URL is not set")
        return candidate

    @model_validator(mode="after")
    def finalize_validations(self):
        self.MAX_UPLOAD_SIZE = int(max(self.MAX_UPLOAD_SIZE_MB, 1) * 1024 * 1024)

        if self.is_production and self.DEBUG:
            raise ValueError("DEBUG must be false in production")

        if self.is_production and "localhost" in (self.DATABASE_URL or "").lower():
            logger.warning("DATABASE_URL points to localhost in production environment")

        return self

    @property
    def allowed_origins_list(self) -> List[str]:
        raw_value = (self.ALLOWED_ORIGINS or "").strip()
        if not raw_value:
            return []

        if raw_value.startswith("["):
            try:
                parsed = json.loads(raw_value)
                if isinstance(parsed, list):
                    return [str(origin).strip() for origin in parsed if str(origin).strip()]
            except Exception:
                return []

        return [origin.strip() for origin in raw_value.split(",") if origin.strip()]

    @property
    def cors_allowed_origins(self) -> List[str]:
        return self.allowed_origins_list

    @property
    def tesseract_cmd(self) -> str:
        configured = (self.TESSERACT_PATH or "").strip()
        if configured and os.path.exists(configured):
            return configured

        if platform.system() == "Windows":
            candidates = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Users\{}\AppData\Local\Programs\Tesseract-OCR\tesseract.exe".format(
                    os.getenv("USERNAME", "")
                ),
            ]
            for candidate in candidates:
                if os.path.exists(candidate):
                    return candidate

        return configured or _DEFAULT_TESSERACT

    @property
    def upload_dir_abs(self) -> str:
        path = os.path.abspath(self.UPLOAD_DIR)
        os.makedirs(path, exist_ok=True)
        return path

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


try:
    settings = Settings()
except Exception as exc:
    logger.critical("Configuration error: %s", exc)
    logger.critical("Copy backend/.env.example to backend/.env and provide required values")
    sys.exit(1)
