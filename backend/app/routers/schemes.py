"""
Schemes router - list, filter, eligible, details.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional
from app.models import User, Scheme, EligibilityResult, Profile, Document
from app.schemas.scheme import SchemeResponse, EligibilityResult as EligibilitySchema
from app.services.scheme_instructions_service import get_application_instructions

router = APIRouter()

SUPPORTED_LANGUAGES = {"en", "hi", "ta", "te", "mr", "bn", "kn"}


def _resolve_language(request: Request, lang: str | None) -> str:
    if lang:
        candidate = str(lang).strip().lower().split("-")[0]
        if candidate in SUPPORTED_LANGUAGES:
            return candidate

    header = str(request.headers.get("Accept-Language") or "").strip().lower()
    if header:
        candidate = header.split(",")[0].split("-")[0].strip()
        if candidate in SUPPORTED_LANGUAGES:
            return candidate

    return "en"


def _localized_value(scheme: Scheme, field_prefix: str, lang: str) -> str | None:
    if lang != "en":
        localized = getattr(scheme, f"{field_prefix}_{lang}", None)
        if localized is not None and str(localized).strip():
            return str(localized).strip()

    fallback = getattr(scheme, f"{field_prefix}_en", None)
    if fallback is not None and str(fallback).strip():
        return str(fallback).strip()

    return None


def _serialize_scheme(scheme: Scheme, lang: str) -> dict:
    payload = SchemeResponse.from_orm(scheme).dict()
    payload["name"] = _localized_value(scheme, "name", lang) or payload.get("name_en")
    payload["description"] = _localized_value(scheme, "description", lang) or payload.get("description_en")
    payload["selected_language"] = lang
    return payload


def _parse_json(raw_value, default):
    if raw_value is None:
        return default
    if isinstance(raw_value, (dict, list)):
        return raw_value
    try:
        return json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return default


def _to_percentage(score: float) -> float:
    numeric = float(score or 0)
    return round(numeric * 100, 1) if 0 <= numeric <= 1 else round(numeric, 1)


def _serialize_eligibility_scheme(
    scheme: Scheme,
    eligibility: EligibilityResult,
    partial: bool = False,
    lang: str = "en",
) -> dict:
    return {
        "id": scheme.id,
        "scheme_id": scheme.id,
        "scheme_code": scheme.scheme_code,
        "name_en": scheme.name_en,
        "name_hi": scheme.name_hi,
        "name": _localized_value(scheme, "name", lang) or scheme.name_en,
        "description_en": scheme.description_en,
        "description": _localized_value(scheme, "description", lang) or scheme.description_en,
        "sector": scheme.sector,
        "benefit_amount": scheme.benefit_amount or 0,
        "benefit_type": scheme.benefit_type,
        "benefit_frequency": scheme.benefit_frequency,
        "eligibility_score": float(eligibility.eligibility_score or 0),
        "eligibility_percentage": _to_percentage(eligibility.eligibility_score or 0),
        "is_eligible": bool(eligibility.is_eligible),
        "is_partially_eligible": partial,
        "condition_results": _parse_json(eligibility.condition_results, []),
        "official_portal_url": scheme.official_portal_url,
        "application_mode": scheme.application_mode,
        "ministry": scheme.ministry,
    }


@router.get("/")
async def list_schemes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sector: str = None,
    state: str = None,
    search: str = None,
    lang: str | None = Query(None, description="Preferred language code"),
    db: Session = Depends(get_db),
):
    """List all schemes with pagination and filters."""
    resolved_lang = _resolve_language(request, lang)
    query = db.query(Scheme).filter(Scheme.is_active == 1)

    if sector:
        sectors = [value.strip() for value in sector.split(",") if value.strip()]
        if sectors:
            query = query.filter(Scheme.sector.in_(sectors))
    if state:
        states = [value.strip() for value in state.split(",") if value.strip()]
        if states:
            query = query.filter(Scheme.state.in_(states))
    if search:
        query = query.filter(
            or_(
                Scheme.name_en.ilike(f"%{search}%"),
                Scheme.description_en.ilike(f"%{search}%"),
            )
        )

    total = query.count()
    schemes = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "language": resolved_lang,
        "schemes": [_serialize_scheme(s, resolved_lang) for s in schemes],
    }


@router.get("/public/list")
async def list_public_schemes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sector: str = None,
    state: str = None,
    search: str = None,
    lang: str | None = Query(None, description="Preferred language code"),
    db: Session = Depends(get_db),
):
    """Public list route for unauthenticated browsing."""
    return await list_schemes(
        request=request,
        skip=skip,
        limit=limit,
        sector=sector,
        state=state,
        search=search,
        lang=lang,
        db=db,
    )


@router.get("/public/{scheme_id}")
async def get_public_scheme_detail(
    request: Request,
    scheme_id: str,
    lang: str | None = Query(None, description="Preferred language code"),
    db: Session = Depends(get_db),
):
    """Public detail route alias for unauthenticated clients."""
    return await get_scheme_detail(request=request, scheme_id=scheme_id, lang=lang, db=db)


@router.get("/public/{scheme_id}/apply-info")
async def get_public_apply_info(
    scheme_id: str,
    db: Session = Depends(get_db),
):
    """Public apply-info route alias for unauthenticated clients."""
    return await get_apply_info(scheme_id=scheme_id, current_user=None, db=db)


@router.get("/search")
async def search_schemes(
    request: Request,
    q: str = Query(..., min_length=2),
    lang: str | None = Query(None, description="Preferred language code"),
    db: Session = Depends(get_db),
):
    """Search schemes by name or description."""
    resolved_lang = _resolve_language(request, lang)
    results = db.query(Scheme).filter(
        or_(
            Scheme.name_en.ilike(f"%{q}%"),
            Scheme.description_en.ilike(f"%{q}%"),
        ),
        Scheme.is_active == 1,
    ).limit(20).all()

    return [_serialize_scheme(s, resolved_lang) for s in results]


@router.get("/sectors")
async def get_sectors(db: Session = Depends(get_db)):
    """Get list of unique sectors."""
    sectors = db.query(Scheme.sector).distinct().filter(Scheme.is_active == 1).all()
    return [s[0] for s in sectors if s[0]]


@router.get("/states")
async def get_states(db: Session = Depends(get_db)):
    """Get list of unique states."""
    states = db.query(Scheme.state).distinct().filter(Scheme.is_active == 1).all()
    return [s[0] for s in states if s[0]]


@router.post("/check-eligibility")
async def check_user_eligibility(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run eligibility check against all schemes and return ranked results."""
    from app.agents.agent_orchestrator import run_full_eligibility_pipeline

    payload = await run_full_eligibility_pipeline(current_user.id, db)
    results = payload.get("raw_results", [])
    
    return {
        "status": "completed",
        "total_checked": len(results),
        "eligible_count": sum(1 for r in results if r.get("is_eligible")),
        "partially_eligible_count": sum(1 for r in results if r.get("is_partially_eligible")),
    }


@router.post("/check-all")
async def check_all_schemes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run eligibility check against all schemes."""
    from app.agents.agent_orchestrator import run_full_eligibility_pipeline

    payload = await run_full_eligibility_pipeline(current_user.id, db)
    results = payload.get("raw_results", [])

    return {
        "user_id": current_user.id,
        "total_checked": len(results),
        "eligible_count": sum(1 for r in results if r.get("is_eligible")),
        "partial_count": sum(1 for r in results if r.get("is_partially_eligible")),
    }


@router.get("/eligible")
async def get_eligible_schemes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    lang: str | None = Query(None, description="Preferred language code"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get schemes user is eligible for, ranked by benefit amount."""
    resolved_lang = _resolve_language(request, lang)
    # Get eligibility results for fully eligible schemes
    eligibility = db.query(EligibilityResult).filter(
        and_(
            EligibilityResult.user_id == current_user.id,
            EligibilityResult.is_eligible == 1,
        )
    ).all()

    results = []
    for e in eligibility:
        scheme = db.query(Scheme).filter(Scheme.id == e.scheme_id).first()
        if scheme:
            results.append(_serialize_eligibility_scheme(scheme, e, partial=False, lang=resolved_lang))
    
    # Sort by benefit_amount (descending) then by eligibility_score (descending)
    results.sort(key=lambda x: (-x["benefit_amount"], -x["eligibility_score"]))
    
    # Apply pagination
    total = len(results)
    paginated = results[skip:skip + limit]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "language": resolved_lang,
        "eligible_count": total,
        "schemes": paginated,
    }


@router.get("/partially-eligible")
async def get_partial_schemes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    lang: str | None = Query(None, description="Preferred language code"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get schemes user is partially eligible for, ranked by benefit amount."""
    resolved_lang = _resolve_language(request, lang)
    eligibility = db.query(EligibilityResult).filter(
        and_(
            EligibilityResult.user_id == current_user.id,
            EligibilityResult.is_partially_eligible == 1,
        )
    ).all()

    results = []
    for e in eligibility:
        scheme = db.query(Scheme).filter(Scheme.id == e.scheme_id).first()
        if scheme:
            results.append(_serialize_eligibility_scheme(scheme, e, partial=True, lang=resolved_lang))
    
    # Sort by benefit_amount (descending) then by eligibility_score (descending)
    results.sort(key=lambda x: (-x["benefit_amount"], -x["eligibility_score"]))
    
    # Apply pagination
    total = len(results)
    paginated = results[skip:skip + limit]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "language": resolved_lang,
        "partially_eligible_count": total,
        "schemes": paginated,
    }


@router.get("/{scheme_id}")
async def get_scheme_detail(
    request: Request,
    scheme_id: str,
    lang: str | None = Query(None, description="Preferred language code"),
    db: Session = Depends(get_db),
):
    """Get scheme details."""
    resolved_lang = _resolve_language(request, lang)
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    return _serialize_scheme(scheme, resolved_lang)


@router.get("/{scheme_id}/apply-info")
async def get_apply_info(
    scheme_id: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get application portal and step-by-step guidance.

    This endpoint works with or without login; user-specific document readiness is included
    only when an authenticated user is available.
    """
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    profile = None
    user_documents = []
    if current_user:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        user_documents = (
            db.query(Document)
            .filter(Document.user_id == current_user.id)
            .all()
        )

    info = get_application_instructions(scheme=scheme, user_profile=profile, user_documents=user_documents)

    return {
        "portal_url": info.get("portal_url"),
        "application_mode": info.get("application_mode"),
        "steps": info.get("steps", []),
        "required_documents": info.get("required_documents", []),
        "documents_user_has": info.get("documents_user_has", []),
        "documents_user_missing": info.get("documents_user_missing", []),
        "helpline": info.get("helpline"),
        "csc_url": info.get("csc_locator_url"),
        "estimated_time": info.get("estimated_time"),
        "is_ready_to_apply": info.get("is_ready_to_apply", False),
    }


@router.get("/{scheme_id}/eligibility")
async def get_scheme_eligibility(
    scheme_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's eligibility for a specific scheme."""
    result = db.query(EligibilityResult).filter(
        and_(
            EligibilityResult.user_id == current_user.id,
            EligibilityResult.scheme_id == scheme_id,
        )
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Eligibility not computed")

    payload = {
        "user_id": result.user_id,
        "scheme_id": result.scheme_id,
        "is_eligible": bool(result.is_eligible),
        "is_partially_eligible": bool(result.is_partially_eligible),
        "eligibility_score": float(result.eligibility_score or 0),
        "condition_results": _parse_json(result.condition_results, []),
        "explanation_en": result.explanation_en,
        "missing_docs": _parse_json(result.missing_docs, []),
        "probability_pct": result.probability_pct,
        "estimated_days": result.estimated_days,
    }
    return EligibilitySchema(**payload).dict()


@router.get("/{scheme_id}/apply-guide")
async def get_apply_guide(
    scheme_id: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get step-by-step application guide for a scheme."""
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    profile = None
    user_documents = []
    if current_user:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        user_documents = db.query(Document).filter(Document.user_id == current_user.id).all()

    info = get_application_instructions(scheme=scheme, user_profile=profile, user_documents=user_documents)

    return {
        "scheme_id": scheme_id,
        "scheme_name": scheme.name_en,
        "steps": info.get("steps", []),
        "portal_url": info.get("portal_url"),
        "application_mode": info.get("application_mode"),
        "documents_required": info.get("required_documents", []),
        "documents_user_has": info.get("documents_user_has", []),
        "documents_user_missing": info.get("documents_user_missing", []),
        "helpline": info.get("helpline"),
        "csc_locator_url": info.get("csc_locator_url"),
    }
