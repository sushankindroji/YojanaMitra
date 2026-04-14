#!/usr/bin/env python
"""Startup script for YojanaMitra backend server."""

import logging
import os
import sys

import uvicorn
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the directory where this script is located.
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)
load_dotenv(os.path.join(script_dir, ".env"))
sys.path.insert(0, script_dir)


def run_migrations() -> None:
    """Apply Alembic migrations up to latest head revision."""
    try:
        from alembic import command
        from alembic.config import Config

        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Migrations applied successfully")
    except Exception as exc:
        logger.warning("Migration warning (non-fatal): %s", exc)


if __name__ == "__main__":
    if os.getenv("AUTO_RUN_MIGRATIONS", "true").strip().lower() == "true":
        run_migrations()

    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENVIRONMENT", "development").strip().lower() == "development",
        log_level="info",
    )
