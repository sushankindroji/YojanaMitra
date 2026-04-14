"""Health check router."""

import os
import time

from fastapi import APIRouter
from sqlalchemy import text

from app.database import engine

router = APIRouter()

START_TIME = time.time()


@router.get("/health")
async def health_check():
    """Return runtime and database health diagnostics."""
    db_ok = False
    db_status_message = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:
        db_status_message = str(exc)

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "database_error": db_status_message,
        "uptime_seconds": round(time.time() - START_TIME),
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "version": "1.0.0",
    }
