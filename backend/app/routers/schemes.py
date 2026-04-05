"""
Schemes router - list, filter, eligible, details.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Scheme, EligibilityResult
from app.schemas.scheme import SchemeResponse, EligibilityResult as EligibilitySchema
import json

router = APIRouter()


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


@router.get("/eligible")
async def get_eligible_schemes(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get schemes user is eligible for, ranked by benefit amount."""
    from sqlalchemy import desc
    
    # Get eligibility results for fully eligible schemes
    eligibility = db.query(EligibilityResult).filter(
        and_(
            EligibilityResult.user_id == current_user.id,
            EligibilityResult.is_eligible == 1,
        )
    ).all()

    # Get scheme details and rank by benefit_amount (highest first)
    results = []
    for e in eligibility:
        scheme = db.query(Scheme).filter(Scheme.id == e.scheme_id).first()
        if scheme:
            condition_results = json.loads(e.condition_results or "[]")
            results.append({
                "scheme_id": scheme.id,
                "scheme_code": scheme.scheme_code,
                "name_en": scheme.name_en,
                "name_hi": scheme.name_hi,
                "description_en": scheme.description_en,
                "sector": scheme.sector,
                "benefit_amount": scheme.benefit_amount or 0,
                "benefit_type": scheme.benefit_type,
                "benefit_frequency": scheme.benefit_frequency,
                "eligibility_score": e.eligibility_score,
                "eligibility_percentage": round(e.eligibility_score, 1),
                "is_eligible": bool(e.is_eligible),
                "condition_results": condition_results,
                "official_portal_url": scheme.official_portal_url,
                "application_mode": scheme.application_mode,
                "ministry": scheme.ministry,
            })
    
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

    # Get scheme details and rank by benefit_amount (highest first)
    results = []
    for e in eligibility:
        scheme = db.query(Scheme).filter(Scheme.id == e.scheme_id).first()
        if scheme:
            condition_results = json.loads(e.condition_results or "[]")
            results.append({
                "scheme_id": scheme.id,
                "scheme_code": scheme.scheme_code,
                "name_en": scheme.name_en,
                "name_hi": scheme.name_hi,
                "description_en": scheme.description_en,
                "sector": scheme.sector,
                "benefit_amount": scheme.benefit_amount or 0,
                "benefit_type": scheme.benefit_type,
                "benefit_frequency": scheme.benefit_frequency,
                "eligibility_score": e.eligibility_score,
                "eligibility_percentage": round(e.eligibility_score, 1),
                "is_eligible": False,
                "is_partially_eligible": True,
                "condition_results": condition_results,
                "official_portal_url": scheme.official_portal_url,
                "application_mode": scheme.application_mode,
                "ministry": scheme.ministry,
            })
    
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

    return EligibilitySchema.from_orm(result).dict()


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

    application_steps = json.loads(scheme.application_steps or "[]")

    return {
        "scheme_id": scheme_id,
        "scheme_name": scheme.name_en,
        "steps": application_steps,
        "portal_url": scheme.official_portal_url,
        "application_mode": scheme.application_mode,
        "documents_required": json.loads(scheme.required_documents or "[]"),
    }


@router.get("/search")
async def search_schemes(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
):
    """Search schemes by name or description."""
    from sqlalchemy import or_

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


@router.post("/check-all")
async def check_all_schemes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run eligibility check against all schemes."""
    # This is a stub - in production, call eligibility_agent.check_all_schemes()
    from app.agents.eligibility_agent import EligibilityAgent

    agent = EligibilityAgent(db)
    results = await agent.check_all_schemes(current_user.id)

    return {
        "user_id": current_user.id,
        "total_checked": len(results),
        "eligible_count": sum(1 for r in results if r.is_eligible),
        "partial_count": sum(1 for r in results if r.is_partially_eligible),
    }
