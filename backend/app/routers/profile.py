"""
Profile router - get, update, completeness.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Profile
from app.schemas.profile import ProfileUpdate, ProfileResponse, ProfileCompleteness
from app.core.audit import log_audit
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
    return profile


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

        profile.updated_at = datetime.utcnow().isoformat()

        # Recalculate completeness
        profile.profile_complete_pct = calculate_profile_completeness(profile)

        db.commit()
        db.refresh(profile)

        log_audit(db, "profile_update", "profile", profile.id, current_user.id)

        return profile
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

    completeness_pct = profile.profile_complete_pct or 0

    essential_fields = [
        ("Full Name", profile.full_name),
        ("Date of Birth", profile.dob),
        ("Gender", profile.gender),
        ("State", profile.state),
        ("Annual Income", profile.annual_income),
    ]

    missing_fields = [label for label, value in essential_fields if not value]
    filled_essential = len(essential_fields) - len(missing_fields)
    total_essential = len(essential_fields)

    return ProfileCompleteness(
        total_percentage=completeness_pct,
        filled_fields=filled_essential,
        total_fields=total_essential,
        missing_fields=missing_fields,
        priority_actions=[
            "Complete basic information",
            "Upload government documents",
            "Verify email/phone",
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
        if "has_disability" in responses:
            profile.has_disability = int(responses["has_disability"])
        if "is_senior_citizen" in responses:
            profile.is_senior_citizen = int(responses["is_senior_citizen"])
        if "is_minority" in responses:
            profile.is_minority = int(responses["is_minority"])
        if "is_woman_headed" in responses:
            profile.is_woman_headed = int(responses["is_woman_headed"])

        profile.updated_at = datetime.utcnow().isoformat()
        profile.profile_complete_pct = calculate_profile_completeness(profile)

        db.commit()
        db.refresh(profile)

        log_audit(db, "profile_optional_questions", "profile", profile.id, current_user.id)

        return {"message": "Optional questions updated", "profile": ProfileResponse.from_orm(profile)}
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Failed to update optional questions for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to update optional profile questions")


def calculate_profile_completeness(profile: Profile) -> int:
    """Calculate profile completeness percentage."""
    total_fields = 0
    filled_fields = 0

    # Essential fields (weight: 1x)
    essential = [
        profile.full_name,
        profile.dob,
        profile.age,
        profile.gender,
        profile.state,
        profile.district,
        profile.annual_income,
        profile.occupation,
    ]

    total_fields += len(essential)
    filled_fields += sum(1 for f in essential if f)

    # Optional fields (weight: 0.5x)
    optional = [
        profile.is_farmer,
        profile.is_student,
        profile.is_senior_citizen,
        profile.has_disability,
        profile.is_minority,
    ]

    total_fields += len(optional) * 0.5
    filled_fields += sum(0.5 for f in optional if f)

    if total_fields == 0:
        return 0

    return int((filled_fields / total_fields) * 100)
