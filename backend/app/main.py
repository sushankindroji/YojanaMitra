"""Main FastAPI application."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
import time
import traceback
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi.errors import RateLimitExceeded
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.core.logging import api_logger, get_logger
from app.core.rate_limiter import limiter
from app.database import engine, init_db, run_migrations, SessionLocal
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
from app.routers import agents as agents_router
from app.routers import documents_extract
from app.services.cache_service import cache_service
from app.agents.profile_agent import ProfileAgent
from app.agents.scheme_discovery_agent import SchemeDiscoveryAgent
from app.agents.eligibility_agent import EligibilityReasoningAgent
from app.engine.explainer import ExplainabilityEngine

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

    upload_dir = settings.upload_dir_abs
    os.makedirs(upload_dir, exist_ok=True)
    checks.append(f"Upload directory ready: {upload_dir}")

    try:
        import pytesseract

        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
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

origins = settings.cors_allowed_origins
if settings.is_production and "*" in origins:
    logger.critical("Wildcard CORS origin is not allowed in production")
    raise SystemExit(1)


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
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"] + origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
    max_age=3600,
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Attach request ID and log all requests with timing."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    start = datetime.now(timezone.utc)

    response = await call_next(request)

    elapsed_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    if elapsed_ms > 3000:
        logger.warning("SLOW %s %s: %sms", request.method, request.url.path, elapsed_ms)

    api_logger.info(
        "%s %s - %s (%sms) request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
    )
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{elapsed_ms}ms"
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


# ============================================================================
# REQUEST/RESPONSE MODELS FOR MAIN ENDPOINTS
# ============================================================================

class AnalyzeRequest(BaseModel):
    """Request model for /analyze endpoint."""
    profile: dict
    quick_mode: bool = False


class SchemeResult(BaseModel):
    """Individual scheme result."""
    scheme_id: str
    scheme_name: str
    category: str
    benefit_description: str
    benefit_amount: str
    eligible: bool
    confidence_score: float
    verdict: str
    reasoning_chain: list
    improvement_suggestion: str
    priority: str
    documents_required: list
    apply_link: str


class AnalyzeResponse(BaseModel):
    """Response model for /analyze endpoint."""
    session_id: str
    profile_completeness: float
    total_schemes_checked: int
    eligible_count: int
    partial_count: int
    top_schemes: list[SchemeResult]
    processing_time_ms: int


class SchemeStats(BaseModel):
    """Response model for /schemes/stats endpoint."""
    total_schemes: int
    by_category: dict
    last_updated: str


# ============================================================================
# MAIN ENDPOINTS
# ============================================================================

@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """
    Main analysis endpoint: Complete eligibility analysis pipeline.
    
    Process:
    1. Validate profile
    2. Discover eligible schemes
    3. Generate explanations
    4. Return ranked results
    """
    start_time = time.time()
    session_id = str(uuid.uuid4())
    
    try:
        db = SessionLocal()
        
        # Step 1: Profile validation
        profile_agent = ProfileAgent()
        profile_result = profile_agent.run(request.profile)
        validated_profile = profile_result["validated_profile"]
        completeness_score = profile_result["completeness_score"]
        
        # Step 2: Scheme discovery
        discovery_agent = SchemeDiscoveryAgent()
        discovery_result = discovery_agent.run(validated_profile, db)
        
        eligible_schemes = discovery_result["eligible"]
        partial_schemes = discovery_result["partial"]
        total_checked = discovery_result["total_schemes_checked"]
        
        # Step 3: Generate explanations for top schemes
        explainer = ExplainabilityEngine()
        reasoning_agent = EligibilityReasoningAgent()
        
        top_schemes_data = []
        
        # Process eligible schemes
        for scheme in eligible_schemes[:10]:  # Top 10 eligible
            scheme_obj = db.query(Scheme).filter(Scheme.id == scheme["scheme_id"]).first()
            if not scheme_obj:
                continue
            
            # Generate explanation
            explanation = explainer.generate_explanation(
                scheme_name=scheme["scheme_name"],
                profile=validated_profile,
                engine_result={
                    "eligible": scheme["eligible"],
                    "confidence_score": scheme["confidence_score"],
                    "passed_checks": scheme.get("passed_checks", []),
                    "failed_checks": scheme.get("failed_checks", []),
                    "unknown_conditions": [],
                },
                language="en",
                benefit_amount=scheme.get("benefit_amount"),
            )
            
            # Build scheme result
            result = SchemeResult(
                scheme_id=scheme["scheme_id"],
                scheme_name=scheme["scheme_name"],
                category=scheme_obj.sector or "General",
                benefit_description=scheme_obj.benefit_details or scheme_obj.description_en or "",
                benefit_amount=f"₹{int(scheme.get('benefit_amount', 0))}" if scheme.get("benefit_amount") else "N/A",
                eligible=scheme["eligible"],
                confidence_score=scheme["confidence_score"],
                verdict=explanation["verdict"],
                reasoning_chain=explanation["reasoning_chain"],
                improvement_suggestion=explanation["improvement_suggestion"],
                priority=explanation["priority"],
                documents_required=scheme_obj.required_documents or [],
                apply_link=scheme_obj.official_portal_url or scheme_obj.state_portal_url or "#",
            )
            top_schemes_data.append(result)
        
        # Process partial schemes if quick_mode is False
        if not request.quick_mode:
            for scheme in partial_schemes[:5]:  # Top 5 partial
                scheme_obj = db.query(Scheme).filter(Scheme.id == scheme["scheme_id"]).first()
                if not scheme_obj:
                    continue
                
                explanation = explainer.generate_explanation(
                    scheme_name=scheme["scheme_name"],
                    profile=validated_profile,
                    engine_result={
                        "eligible": scheme["eligible"],
                        "confidence_score": scheme["confidence_score"],
                        "passed_checks": scheme.get("passed_checks", []),
                        "failed_checks": scheme.get("failed_checks", []),
                        "unknown_conditions": [],
                    },
                    language="en",
                    benefit_amount=scheme.get("benefit_amount"),
                )
                
                result = SchemeResult(
                    scheme_id=scheme["scheme_id"],
                    scheme_name=scheme["scheme_name"],
                    category=scheme_obj.sector or "General",
                    benefit_description=scheme_obj.benefit_details or scheme_obj.description_en or "",
                    benefit_amount=f"₹{int(scheme.get('benefit_amount', 0))}" if scheme.get("benefit_amount") else "N/A",
                    eligible=scheme["eligible"],
                    confidence_score=scheme["confidence_score"],
                    verdict=explanation["verdict"],
                    reasoning_chain=explanation["reasoning_chain"],
                    improvement_suggestion=explanation["improvement_suggestion"],
                    priority=explanation["priority"],
                    documents_required=scheme_obj.required_documents or [],
                    apply_link=scheme_obj.official_portal_url or scheme_obj.state_portal_url or "#",
                )
                top_schemes_data.append(result)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        db.close()
        
        return AnalyzeResponse(
            session_id=session_id,
            profile_completeness=completeness_score,
            total_schemes_checked=total_checked,
            eligible_count=len(eligible_schemes),
            partial_count=len(partial_schemes),
            top_schemes=top_schemes_data,
            processing_time_ms=processing_time_ms,
        )
    
    except Exception as exc:
        logger.error(f"Analysis failed: {str(exc)}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Analysis failed: {str(exc)}", "status": "error"},
        )


@app.get("/api/v1/schemes/stats", response_model=SchemeStats)
async def schemes_stats():
    """Get scheme statistics."""
    try:
        db = SessionLocal()
        
        total = db.query(Scheme).filter(Scheme.is_active == 1).count()
        
        # Count by category
        from sqlalchemy import func
        by_category = {}
        results = db.query(Scheme.sector, func.count(Scheme.id)).filter(
            Scheme.is_active == 1
        ).group_by(Scheme.sector).all()
        
        for sector, count in results:
            if sector:
                by_category[sector] = count
        
        # Get last updated
        last_scheme = db.query(Scheme).filter(Scheme.is_active == 1).order_by(
            Scheme.updated_at.desc()
        ).first()
        last_updated = last_scheme.updated_at if last_scheme else datetime.now(timezone.utc).isoformat()
        
        db.close()
        
        return SchemeStats(
            total_schemes=total,
            by_category=by_category,
            last_updated=last_updated,
        )
    
    except Exception as exc:
        logger.error(f"Stats failed: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Failed to fetch stats", "status": "error"},
        )


app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(onboarding.router, prefix="/api/v1", tags=["Onboarding"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(schemes.router, prefix="/api/v1/schemes", tags=["Schemes"])
app.include_router(eligibility.router, prefix="/api/v1", tags=["Eligibility"])
app.include_router(applications.router, prefix="/api/v1/applications", tags=["Applications"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])
app.include_router(agents_router.router, prefix="/api/v1", tags=["Agents"])
app.include_router(documents_extract.router, prefix="/api/v1", tags=["Documents"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
