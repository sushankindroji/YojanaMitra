"""Database connection and session management."""

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import QueuePool

from app.config import settings

logger = logging.getLogger(__name__)

DATABASE_URL = settings.DATABASE_URL
IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_POSTGRES = "postgresql" in DATABASE_URL

engine_kwargs = {
    "echo": settings.DB_ECHO or settings.DEBUG,
    "pool_pre_ping": True,
    "pool_recycle": settings.DB_POOL_RECYCLE,
}

if IS_SQLITE:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
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

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def test_db_connection() -> None:
    """Crash early with a clear error when DB connectivity is broken."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection OK")
    except Exception as exc:
        logger.critical("DATABASE CONNECTION FAILED: %s", exc)
        logger.critical("Check DATABASE_URL in backend/.env")
        raise SystemExit(1)


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


test_db_connection()
