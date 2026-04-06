"""
Main FastAPI application.
"""
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import uuid
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.database import init_db, run_migrations, SessionLocal
from app.core.rate_limiter import limiter
from app.core.logging import get_logger, api_logger
from app.services.cache_service import cache_service

# Import routers
from app.routers import auth, documents, profile, schemes, applications, admin, eligibility, onboarding

# Import all models to register them with Base
from app.models import (
    User, Profile, Document, Scheme, EligibilityResult, SavedApplication, AuditLog, SchemeSyncLog
)

logger = get_logger(__name__)
START_TIME = datetime.now(timezone.utc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    logger.info("[STARTUP] Starting YojanaMitra API...")
    logger.info(f"[CONFIG] Database Type: {settings.DATABASE_TYPE}")
    logger.info(f"[CONFIG] Redis Enabled: {settings.REDIS_ENABLED}")
    logger.info(f"[CONFIG] Cache TTL: {settings.CACHE_TTL}s")
    
    if settings.AUTO_RUN_MIGRATIONS:
        try:
            logger.info("[STARTUP] Running database migrations...")
            run_migrations()
            logger.info("[OK] Database migrations complete")
        except Exception:
            logger.exception("[ERROR] Migration startup failed")
            if settings.is_production:
                raise
            logger.warning("[WARN] Falling back to metadata create_all in non-production")
            init_db()
    else:
        init_db()
        logger.info("[OK] Database initialized via create_all")

    logger.info(f"[OK] Cache Service Status: {'ENABLED' if cache_service.enabled else 'DISABLED'}")
    logger.info("[OK] All services initialized")
    
    yield
    
    # Shutdown
    logger.info("[SHUTDOWN] Shutting down YojanaMitra API...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent Government Scheme Recommendation Platform for Indian Citizens",
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Add rate limiter
app.state.limiter = limiter


def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded",
            "retry_after": 60,
            "request_id": request_id,
        },
    )


app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add middleware for request-id and logging
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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "message": "Validation error",
            "request_id": request_id,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.exception("Unhandled exception for request_id=%s path=%s", request_id, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "request_id": request_id,
        },
    )


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "YojanaMitra",
        "version": settings.APP_VERSION,
        "description": "Apni Yojana, Apna Haq — Your Scheme, Your Right",
        "docs": "/docs",
        "status": "running",
        "cache": "enabled" if cache_service.enabled else "disabled",
    }


# Health check with cache info
@app.get("/health")
async def health_check():
    """Health check endpoint with service status."""
    db_status = "ok"
    db_error = None
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = "error"
        db_error = str(exc)

    now = datetime.now(timezone.utc)
    uptime_seconds = int((now - START_TIME).total_seconds())

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "database_type": settings.DATABASE_TYPE,
        "database": {
            "status": db_status,
            "error": db_error,
        },
        "cache": {
            "enabled": cache_service.enabled,
        },
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": uptime_seconds,
        "timestamp": now.isoformat(),
    }


# Include routers
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
