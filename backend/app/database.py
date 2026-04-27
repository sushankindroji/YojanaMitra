"""Database connection and session management."""

import logging
from pathlib import Path
import time

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import QueuePool

from app.config import settings

logger = logging.getLogger(__name__)

DATABASE_URL = settings.DATABASE_URL
IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_POSTGRES = "postgresql" in DATABASE_URL

def _build_engine_kwargs() -> dict:
    engine_kwargs = {
        "echo": settings.DB_ECHO or settings.DEBUG,
        "pool_pre_ping": True,
        "pool_recycle": settings.DB_POOL_RECYCLE,
    }

    if IS_SQLITE:
        engine_kwargs["connect_args"] = {"check_same_thread": False}
        return engine_kwargs

    engine_kwargs.update(
        {
            "poolclass": QueuePool,
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "connect_args": (
                {"connect_timeout": 10, "options": "-c timezone=UTC"} if IS_POSTGRES else {}
            ),
        }
    )
    return engine_kwargs


def create_db_engine(retries: int = 5, delay: int = 2):
    """Create DB engine with health probe and retry for transient startup failures."""
    last_error = None
    engine_kwargs = _build_engine_kwargs()

    for attempt in range(1, retries + 1):
        try:
            db_engine = create_engine(DATABASE_URL, **engine_kwargs)
            with db_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection established")
            return db_engine
        except OperationalError as exc:
            last_error = exc
            if attempt < retries:
                logger.warning(
                    "DB connection attempt %s/%s failed. Retrying in %ss...",
                    attempt,
                    retries,
                    delay,
                )
                time.sleep(delay)
            else:
                logger.critical("Database connection failed after %s attempts: %s", retries, exc)
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                logger.warning(
                    "Unexpected DB startup error on attempt %s/%s: %s. Retrying in %ss...",
                    attempt,
                    retries,
                    exc,
                    delay,
                )
                time.sleep(delay)
            else:
                logger.critical("Database startup failed after %s attempts: %s", retries, exc)

    logger.critical("Check DATABASE_URL in backend/.env")
    raise last_error if last_error else RuntimeError("Database engine creation failed")


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def test_db_connection() -> None:
    """Probe database health for diagnostics/endpoints."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))


def init_db() -> None:
    """Create all tables (development fallback)."""
    Base.metadata.create_all(bind=engine)


def run_migrations() -> None:
    """Run Alembic migrations to the latest revision."""
    alembic_ini = Path(__file__).resolve().parents[1] / "alembic.ini"
    if not alembic_ini.exists():
        logger.warning("alembic.ini not found at %s; skipping migrations", alembic_ini)
        return

    config = Config(str(alembic_ini))
    config.set_main_option("sqlalchemy.url", DATABASE_URL)
    command.upgrade(config, "head")
