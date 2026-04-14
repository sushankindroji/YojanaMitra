"""FastAPI dependency providers and auth guards."""

from datetime import datetime
import logging
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import Profile, User

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


def get_db():
    """Yield a DB session with rollback-on-error semantics."""
    db = SessionLocal()
    try:
        yield db
    except Exception as exc:
        db.rollback()
        logger.error("Database dependency error: %s", exc)
        raise
    finally:
        db.close()


def verify_token(token: str) -> dict | None:
    """Decode JWT token payload and return None when invalid/expired."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


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


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the currently authenticated user from bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    payload = verify_token(credentials.credentials)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or int(user.is_active or 0) != 1:
        raise credentials_exception

    try:
        return _ensure_profile_and_flags(db, user)
    except Exception as exc:
        db.rollback()
        logger.exception("Could not prepare profile flags for user_id=%s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not prepare user profile state",
        )


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure currently authenticated user has admin privileges."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    """Resolve user when token is present and valid; otherwise return None."""
    if credentials is None:
        return None

    payload = verify_token(credentials.credentials)
    if payload is None:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or int(user.is_active or 0) != 1:
        return None

    try:
        return _ensure_profile_and_flags(db, user)
    except Exception:
        db.rollback()
        return None