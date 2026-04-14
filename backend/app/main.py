"""Main FastAPI application."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
import traceback
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.core.logging import api_logger, get_logger
from app.core.rate_limiter import limiter
from app.database import engine, init_db, run_migrations
from app.models import (
    AuditLog,
    Document,
    EligibilityResult,
    Profile,
    SavedApplication,
    Scheme,
    SchemeSyncLog,
    User,
)
from app.routers import admin, applications, auth, documents, eligibility, health, onboarding, profile, schemes
from app.services.cache_service import cache_service

logger = get_logger(__name__)


async def startup_checks() -> None:
    """Run startup safety checks and fail fast for critical issues."""
    checks: list[str] = []

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks.append("Database connected")
    except Exception as exc:
        logger.critical("Database connection failed: %s", exc)
        raise SystemExit(1)

    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    checks.append(f"Upload directory ready: {upload_dir}")

    try:
        import pytesseract

        if settings.TESSERACT_PATH:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH
        pytesseract.get_tesseract_version()
        checks.append("Tesseract OCR available")
    except Exception:
        checks.append("Tesseract not found - document OCR unavailable")

    try:
        inspector = inspect(engine)
        required_tables = [
            "users",
            "profiles",
            "schemes",
            "documents",
            "eligibility_results",
            "saved_applications",
            "audit_logs",
        ]
        existing_tables = inspector.get_table_names()
        missing = [name for name in required_tables if name not in existing_tables]
        if missing:
            logger.warning("Missing DB tables: %s. Run: alembic upgrade head", missing)
        else:
            checks.append("All required database tables present")
    except Exception as exc:
        logger.warning("Could not verify required tables: %s", exc)

    for check in checks:
        logger.info("[STARTUP] %s", check)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[STARTUP] Starting YojanaMitra API")
    logger.info("[CONFIG] Database type: %s", settings.DATABASE_TYPE)

    if settings.AUTO_RUN_MIGRATIONS:
        try:
            run_migrations()
            logger.info("[STARTUP] Migrations applied successfully")
        except Exception as exc:
            logger.warning("[STARTUP] Migration warning (non-fatal): %s", exc)
    else:
        init_db()
        logger.info("[STARTUP] Database initialized with create_all")

    await startup_checks()
    logger.info("[STARTUP] Cache status: %s", "ENABLED" if cache_service.enabled else "DISABLED")

    yield

    logger.info("[SHUTDOWN] Shutting down YojanaMitra API")


app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent Government Scheme Recommendation Platform for Indian Citizens",
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait before trying again.", "status": "error"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(item) for item in error.get("loc", []) if item != "body")
        errors.append(f"{field}: {error['msg']}" if field else error["msg"])

    return JSONResponse(
        status_code=422,
        content={"detail": errors[0] if len(errors) == 1 else errors, "status": "error"},
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Database error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Database error. Please try again.", "status": "error"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled: %s %s - %s\n%s",
        request.method,
        request.url,
        exc,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again.", "status": "error"},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Attach request ID and log all requests with timing."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    start = datetime.now(timezone.utc)

    response = await call_next(request)

    elapsed_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    api_logger.info(
        "%s %s - %s (%sms) request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "YojanaMitra",
        "version": settings.APP_VERSION,
        "description": "Apni Yojana, Apna Haq - Your Scheme, Your Right",
        "docs": "/docs",
        "status": "running",
        "cache": "enabled" if cache_service.enabled else "disabled",
    }


app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(onboarding.router, prefix="/api/v1", tags=["Onboarding"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(schemes.router, prefix="/api/v1/schemes", tags=["Schemes"])
app.include_router(eligibility.router, prefix="/api/v1", tags=["Eligibility"])
app.include_router(applications.router, prefix="/api/v1/applications", tags=["Applications"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
