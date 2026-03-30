"""
Main FastAPI application.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import sys
from app.config import settings
from app.database import init_db, engine, Base
from app.core.rate_limiter import limiter
from slowapi.errors import RateLimitExceeded

# Import routers
from app.routers import auth, documents, profile, schemes, applications

# Import all models to register them with Base
from app.models import (
    User, Profile, Document, Scheme, EligibilityResult, SavedApplication, AuditLog, SchemeSyncLog
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    print("[START] Starting YojanaMitra API...")
    init_db()
    print("[OK] Database initialized")
    
    yield
    
    # Shutdown
    print("[STOP] Shutting down YojanaMitra API...")


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
    content={"detail": "Rate limit exceeded"}
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
    }


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "sqlite",
        "version": "1.0.0",
    }


# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(schemes.router, prefix="/api/v1/schemes", tags=["Schemes"])
app.include_router(applications.router, prefix="/api/v1/applications", tags=["Applications"])
# app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
# app.include_router(sync.router, prefix="/api/v1/sync", tags=["Sync"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
