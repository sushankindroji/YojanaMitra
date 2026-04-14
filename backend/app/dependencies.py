"""
FastAPI dependencies.
"""
from datetime import datetime
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import verify_token
from app.models import User, Profile

security = HTTPBearer(auto_error=False)


def _ensure_profile_and_flags(db: Session, user: User) -> User:
    """Backfill legacy profile row and align onboarding flags for authenticated users."""
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    needs_commit = False

    if profile is None:
        profile = Profile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            onboarding_complete=0,
            onboarding_step=1,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
        db.add(profile)
        needs_commit = True

    expected_onboarding_incomplete = 0 if int(profile.onboarding_complete or 0) == 1 else 1
    if int(user.onboarding_incomplete or 0) != expected_onboarding_incomplete:
        user.onboarding_incomplete = expected_onboarding_incomplete
        needs_commit = True

    if needs_commit:
        db.commit()
        db.refresh(user)

    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return _ensure_profile_and_flags(db, user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not prepare user profile state",
        )


async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure user has admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# ✅ OPTIONAL AUTH FIXED PROPERLY
async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User | None:
    """Get current user if authenticated, otherwise None."""
    if credentials is None:
        return None
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        return None
    
    user_id = payload.get("sub")
    if user_id is None:
        return None
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        return None

    try:
        return _ensure_profile_and_flags(db, user)
    except Exception:
        db.rollback()
        return None