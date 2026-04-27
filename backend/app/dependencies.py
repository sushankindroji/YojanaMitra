"""FastAPI dependency providers and authentication guards."""

import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import decode_token as _decode_token
from app.core.security import revoke_refresh_token as _revoke_refresh_token
from app.database import SessionLocal
from app.models.user import User

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


def get_db():
    """Yield a DB session with rollback-on-error semantics."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def verify_token(token: str) -> dict | None:
    """Backward-compatible token decoder used by older auth code paths."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def decode_token(token: str, expected_type: str | None = None) -> dict | None:
    """Compatibility wrapper for token decoding used by routers."""
    return _decode_token(token, expected_type=expected_type)


def revoke_refresh_token(token: str) -> None:
    """Compatibility wrapper for refresh token revocation used by routers."""
    _revoke_refresh_token(token)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Resolve current authenticated user from bearer token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token.")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id, User.is_active == 1).first()
    if not user:
        raise HTTPException(status_code=401, detail="Account not found or deactivated.")
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    """Resolve user when token is present and valid, else return None."""
    if not credentials:
        return None

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id, User.is_active == 1).first()
    except JWTError:
        return None


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure currently authenticated user has admin privileges."""
    has_admin_role = str(getattr(current_user, "role", "")).lower() == "admin"
    has_admin_flag = bool(getattr(current_user, "is_admin", 0))
    if not (has_admin_role or has_admin_flag):
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


# Backward-compatible aliases used by existing imports.
get_current_user_optional = get_optional_user