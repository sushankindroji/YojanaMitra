"""
Profile router - get, update, completeness.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_current_user, get_db
from app.core.sanitizers import sanitize_profile
from app.models import User, Profile
from app.schemas.profile import ProfileUpdate, ProfileResponse, ProfileCompleteness
from app.core.audit import log_audit
from app.agents.agent_orchestrator import clear_cached_pipeline_result
from app.services.profile_completeness import calculate_profile_completeness, sync_profile_aliases, update_profile_completeness
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user profile."""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    sync_profile_aliases(profile)
    completeness_pct, _, _, _ = calculate_profile_completeness(profile)
    profile.profile_complete_pct = completeness_pct
    return ProfileResponse(**sanitize_profile(profile))


@router.put("/", response_model=ProfileResponse)
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user profile."""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    try:
        # Update non-null fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)

        sync_profile_aliases(profile)
        profile.updated_at = datetime.utcnow().isoformat()

        # Recalculate completeness
        update_profile_completeness(profile)

        db.commit()
        clear_cached_pipeline_result(current_user.id)
        db.refresh(profile)

        response_payload = ProfileResponse(**sanitize_profile(profile))

        log_audit(db, "profile_update", "profile", profile.id, current_user.id)

        return response_payload
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Failed to update profile for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.get("/completeness")
async def get_profile_completeness(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get profile completeness status."""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    sync_profile_aliases(profile)
    completeness_pct, missing_fields, filled_count, total_count = calculate_profile_completeness(profile)
    profile.profile_complete_pct = completeness_pct

    return ProfileCompleteness(
        total_percentage=completeness_pct,
        filled_fields=filled_count,
        total_fields=total_count,
        missing_fields=missing_fields,
        priority_actions=[
            "Upload Aadhaar and confirm extracted details",
            "Answer quick household and banking questions",
            "Upload optional certificates to unlock more schemes",
        ],
    )


@router.post("/optional-questions")
async def update_optional_questions(
    responses: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update optional profile questions."""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    try:
        # Map responses to profile fields
        if "is_farmer" in responses:
            profile.is_farmer = int(responses["is_farmer"])
        if "is_student" in responses:
            profile.is_student = int(responses["is_student"])
        if "is_bpl" in responses:
            profile.is_bpl = int(responses["is_bpl"])
            profile.bpl_status = int(responses["is_bpl"])
        if "has_disability" in responses:
            profile.has_disability = int(responses["has_disability"])
        if "is_senior_citizen" in responses:
            profile.is_senior_citizen = int(responses["is_senior_citizen"])
        if "is_minority" in responses:
            profile.is_minority = int(responses["is_minority"])
        if "is_woman_headed" in responses:
            profile.is_woman_headed = int(responses["is_woman_headed"])
            profile.is_woman_headed_household = int(responses["is_woman_headed"])

        if "mobile_number" in responses:
            profile.mobile_number = str(responses["mobile_number"] or "").strip() or None
        if "is_household_head" in responses:
            profile.is_household_head = int(responses["is_household_head"])
        if "family_size" in responses:
            try:
                profile.family_size = int(responses["family_size"])
            except Exception:
                pass
        if "has_bank_account" in responses:
            profile.has_bank_account = int(responses["has_bank_account"])
            profile.bank_account_linked = int(responses["has_bank_account"])

        sync_profile_aliases(profile)

        profile.updated_at = datetime.utcnow().isoformat()
        update_profile_completeness(profile)

        db.commit()
        clear_cached_pipeline_result(current_user.id)
        db.refresh(profile)

        profile_payload = ProfileResponse(**sanitize_profile(profile))

        log_audit(db, "profile_optional_questions", "profile", profile.id, current_user.id)

        return {"message": "Optional questions updated", "profile": profile_payload}
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Failed to update optional questions for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to update optional profile questions")


