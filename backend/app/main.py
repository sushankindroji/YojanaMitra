"""
Main FastAPI application.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import sys
import logging
from app.config import settings
from app.database import init_db, engine, Base
from app.core.rate_limiter import limiter
from app.core.logging import get_logger, api_logger
from app.services.cache_service import cache_service
from slowapi.errors import RateLimitExceeded

# Import routers
from app.routers import auth, documents, profile, schemes, applications, admin, eligibility

# Import all models to register them with Base
from app.models import (
    User, Profile, Document, Scheme, EligibilityResult, SavedApplication, AuditLog, SchemeSyncLog
)

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    logger.info("[STARTUP] Starting YojanaMitra API...")
    logger.info(f"[CONFIG] Database Type: {settings.DATABASE_TYPE}")
    logger.info(f"[CONFIG] Redis Enabled: {settings.REDIS_ENABLED}")
    logger.info(f"[CONFIG] Cache TTL: {settings.CACHE_TTL}s")
    
    init_db()
    logger.info("[OK] Database initialized")
    logger.info(f"[OK] Cache Service Status: {'ENABLED' if cache_service.enabled else 'DISABLED'}")
    logger.info("[OK] All services initialized")
    
    yield
    
    # Shutdown
    logger.info("[SHUTDOWN] Shutting down YojanaMitra API...")


# Create FastAPI app
app = FastAPI(
    title="YojanaMitra API",
    description="Intelligent Government Scheme Recommendation Platform for Indian Citizens",
    version="1.0.0",
    lifespan=lifespan,
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda request, exc: JSONResponse(
    status_code=429,
    content={"detail": "Rate limit exceeded", "retry_after": 60}
))

# CORS Configuration
origins = settings.ALLOWED_ORIGINS if isinstance(settings.ALLOWED_ORIGINS, list) else [settings.ALLOWED_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middleware for logging requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests."""
    api_logger.debug(f"{request.method} {request.url.path}")
    response = await call_next(request)
    api_logger.info(f"{request.method} {request.url.path} - {response.status_code}")
    return response


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "YojanaMitra",
        "version": "1.0.0",
        "description": "Apni Yojana, Apna Haq — Your Scheme, Your Right",
        "docs": "/docs",
        "status": "running",
        "cache": "enabled" if cache_service.enabled else "disabled",
    }


# Health check with cache info
@app.get("/health")
async def health_check():
    """Health check endpoint with service status."""
    return {
        "status": "healthy",
        "database_type": settings.DATABASE_TYPE,
        "cache_enabled": cache_service.enabled,
        "version": "1.0.0",
    }


# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(schemes.router, prefix="/api/v1/schemes", tags=["Schemes"])
app.include_router(eligibility.router, prefix="/api/v1", tags=["Eligibility"])
app.include_router(applications.router, prefix="/api/v1/applications", tags=["Applications"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
