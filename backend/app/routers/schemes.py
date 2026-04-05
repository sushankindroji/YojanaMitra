"""
Schemes router - list, filter, eligible, details.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Scheme, EligibilityResult
from app.schemas.scheme import SchemeResponse, EligibilityResult as EligibilitySchema

router = APIRouter()


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


def _serialize_eligibility_scheme(scheme: Scheme, eligibility: EligibilityResult, partial: bool = False) -> dict:
    return {
        "id": scheme.id,
        "scheme_id": scheme.id,
        "scheme_code": scheme.scheme_code,
        "name_en": scheme.name_en,
        "name_hi": scheme.name_hi,
        "description_en": scheme.description_en,
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
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sector: str = None,
    state: str = None,
    search: str = None,
    db: Session = Depends(get_db),
):
    """List all schemes with pagination and filters."""
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
        "schemes": [SchemeResponse.from_orm(s).dict() for s in schemes],
    }


@router.get("/search")
async def search_schemes(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
):
    """Search schemes by name or description."""
    results = db.query(Scheme).filter(
        or_(
            Scheme.name_en.ilike(f"%{q}%"),
            Scheme.description_en.ilike(f"%{q}%"),
        ),
        Scheme.is_active == 1,
    ).limit(20).all()

    return [SchemeResponse.from_orm(s).dict() for s in results]


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
    from app.agents.eligibility_agent import EligibilityAgent
    
    # Run eligibility agent
    agent = EligibilityAgent(db)
    results = await agent.check_all_schemes(current_user.id)
    
    return {
        "status": "completed",
        "total_checked": len(results),
        "eligible_count": sum(1 for r in results if r.is_eligible),
        "partially_eligible_count": sum(1 for r in results if r.is_partially_eligible),
    }


@router.post("/check-all")
async def check_all_schemes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run eligibility check against all schemes."""
    from app.agents.eligibility_agent import EligibilityAgent

    agent = EligibilityAgent(db)
    results = await agent.check_all_schemes(current_user.id)

    return {
        "user_id": current_user.id,
        "total_checked": len(results),
        "eligible_count": sum(1 for r in results if r.is_eligible),
        "partial_count": sum(1 for r in results if r.is_partially_eligible),
    }


@router.get("/eligible")
async def get_eligible_schemes(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get schemes user is eligible for, ranked by benefit amount."""
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
            results.append(_serialize_eligibility_scheme(scheme, e, partial=False))
    
    # Sort by benefit_amount (descending) then by eligibility_score (descending)
    results.sort(key=lambda x: (-x["benefit_amount"], -x["eligibility_score"]))
    
    # Apply pagination
    total = len(results)
    paginated = results[skip:skip + limit]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "eligible_count": total,
        "schemes": paginated,
    }


@router.get("/partially-eligible")
async def get_partial_schemes(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get schemes user is partially eligible for, ranked by benefit amount."""
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
            results.append(_serialize_eligibility_scheme(scheme, e, partial=True))
    
    # Sort by benefit_amount (descending) then by eligibility_score (descending)
    results.sort(key=lambda x: (-x["benefit_amount"], -x["eligibility_score"]))
    
    # Apply pagination
    total = len(results)
    paginated = results[skip:skip + limit]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "partially_eligible_count": total,
        "schemes": paginated,
    }


@router.get("/{scheme_id}")
async def get_scheme_detail(
    scheme_id: str,
    db: Session = Depends(get_db),
):
    """Get scheme details."""
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    return SchemeResponse.from_orm(scheme).dict()


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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get step-by-step application guide for a scheme."""
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    application_steps = _parse_json(scheme.application_steps, [])

    return {
        "scheme_id": scheme_id,
        "scheme_name": scheme.name_en,
        "steps": application_steps,
        "portal_url": scheme.official_portal_url,
        "application_mode": scheme.application_mode,
        "documents_required": _parse_json(scheme.required_documents, []),
    }
