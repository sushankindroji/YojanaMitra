"""
Eligibility Router
API endpoints for scheme eligibility checking across 4500+ schemes
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.services.eligibility_service import get_eligibility_matcher
from app.models import User
from pydantic import BaseModel

router = APIRouter(prefix="/eligibility", tags=["eligibility"])


# Request/Response Models
class EligibilityCheckRequest(BaseModel):
    """Request to check user eligibility"""
    refresh: bool = False  # Force recalculation


class SchemeEligibilityResponse(BaseModel):
    """Response for a single scheme eligibility result"""
    scheme_id: str
    scheme_code: str
    scheme_name: str
    sector: str
    state: str
    eligibility_score: float
    is_eligible: int
    description: str
    benefit_type: str


class EligibilityListResponse(BaseModel):
    """Paginated list of eligible schemes"""
    total_schemes: int
    eligible_count: int
    schemes: list[SchemeEligibilityResponse]


class EligibilitySummaryResponse(BaseModel):
    """Summary of user's eligibility across all schemes"""
    total_schemes_checked: int
    eligible_schemes: int
    partially_eligible: int
    not_eligible: int
    average_eligibility_score: float
    top_sectors: list[dict]


# Endpoints

@router.post("/check")
async def check_all_schemes(
    request: EligibilityCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> EligibilityListResponse:
    """
    Check user eligibility against all 4500+ schemes.
    
    Returns list of matching schemes sorted by eligibility score.
    """
    try:
        matcher = get_eligibility_matcher(db)
        
        # Check eligibility for all schemes
        results = matcher.check_user_eligibility(current_user.id)
        
        # Save results if new or refresh requested
        if request.refresh or len(results) == 0:
            matcher.save_eligibility_results(current_user.id, results)
        
        # Filter to eligible only for this response
        eligible_schemes = [r for r in results if r['is_eligible']]
        
        return EligibilityListResponse(
            total_schemes=len(results),
            eligible_count=len(eligible_schemes),
            schemes=eligible_schemes[:100]  # Top 100 results
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eligibility check failed: {str(e)}")


@router.get("/schemes", response_model=EligibilityListResponse)
async def get_eligible_schemes(
    limit: int = Query(50, ge=1, le=500),
    sector: str = Query(None),
    state: str = Query(None),
    min_score: float = Query(0.3, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> EligibilityListResponse:
    """
    Get user's eligible schemes with optional filters.
    
    Filters:
    - sector: Filter by scheme sector (Agriculture, Healthcare, etc.)
    - state: Filter by state (Central, Andhra Pradesh, etc.)
    - min_score: Minimum eligibility score (0.0-1.0)
    """
    try:
        matcher = get_eligibility_matcher(db)
        results = matcher.check_user_eligibility(current_user.id)
        
        # Apply filters
        filtered = results
        
        if sector:
            filtered = [r for r in filtered if sector.lower() in r['sector'].lower()]
        
        if state:
            filtered = [r for r in filtered if r['state'] == state or r['state'] == 'Central']
        
        filtered = [r for r in filtered if r['eligibility_score'] >= min_score]
        
        # Sort and limit
        filtered.sort(key=lambda x: x['eligibility_score'], reverse=True)
        filtered = filtered[:limit]
        
        return EligibilityListResponse(
            total_schemes=len(results),
            eligible_count=len([r for r in results if r['is_eligible']]),
            schemes=filtered
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schemes: {str(e)}")


@router.get("/top", response_model=list[SchemeEligibilityResponse])
async def get_top_schemes(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> list:
    """
    Get top N eligible schemes for the user.
    Returns highest-scoring eligible schemes.
    """
    try:
        matcher = get_eligibility_matcher(db)
        results = matcher.check_user_eligibility(current_user.id)
        
        # Get eligible only
        eligible = [r for r in results if r['is_eligible']]
        eligible.sort(key=lambda x: x['eligibility_score'], reverse=True)
        
        return eligible[:limit]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get top schemes: {str(e)}")


@router.get("/summary", response_model=EligibilitySummaryResponse)
async def get_eligibility_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get summary of user's eligibility across all schemes.
    Includes total counts, averages, and top sectors.
    """
    try:
        matcher = get_eligibility_matcher(db)
        summary = matcher.get_eligibility_summary(current_user.id)
        
        if summary['total_schemes_checked'] == 0:
            # Run eligibility check first
            results = matcher.check_user_eligibility(current_user.id)
            if results:
                matcher.save_eligibility_results(current_user.id, results)
                summary = matcher.get_eligibility_summary(current_user.id)
        
        return summary
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")


@router.get("/scheme/{scheme_code}")
async def get_scheme_eligibility(
    scheme_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get eligibility details for a specific scheme.
    """
    try:
        from app.models import Scheme, EligibilityResult
        
        # Find scheme
        scheme = db.query(Scheme).filter(Scheme.scheme_code == scheme_code).first()
        if not scheme:
            raise HTTPException(status_code=404, detail="Scheme not found")
        
        # Get eligibility result
        result = db.query(EligibilityResult).filter(
            EligibilityResult.user_id == current_user.id,
            EligibilityResult.scheme_id == scheme.id
        ).first()
        
        if not result:
            # Calculate on demand
            matcher = get_eligibility_matcher(db)
            score = matcher._calculate_eligibility_score(current_user.profile, scheme)
            
            return {
                'scheme_code': scheme_code,
                'scheme_name': scheme.name_en,
                'sector': scheme.sector,
                'state': scheme.state,
                'eligibility_score': round(score, 2),
                'is_eligible': 1 if score >= 0.8 else 0,
                'description': scheme.description_en,
                'benefit_type': scheme.benefit_type
            }
        
        return {
            'scheme_code': scheme_code,
            'scheme_name': scheme.name_en,
            'sector': scheme.sector,
            'state': scheme.state,
            'eligibility_score': result.eligibility_score,
            'is_eligible': result.is_eligible,
            'is_partially_eligible': result.is_partially_eligible,
            'explanation': result.explanation_en,
            'missing_documents': result.missing_docs
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get scheme eligibility: {str(e)}")


@router.post("/recalculate")
async def recalculate_eligibility(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Force recalculation of eligibility for all schemes.
    Useful after profile updates.
    """
    try:
        from app.models import EligibilityResult
        
        matcher = get_eligibility_matcher(db)
        
        # Clear old results
        db.query(EligibilityResult).filter(
            EligibilityResult.user_id == current_user.id
        ).delete()
        db.commit()
        
        # Recalculate
        results = matcher.check_user_eligibility(current_user.id)
        saved = matcher.save_eligibility_results(current_user.id, results)
        
        return {
            'status': 'success',
            'schemes_checked': len(results),
            'eligible_schemes': len([r for r in results if r['is_eligible']]),
            'results_saved': saved
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recalculation failed: {str(e)}")
