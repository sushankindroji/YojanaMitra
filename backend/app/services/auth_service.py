"""
Authentication service.
"""
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import User, Profile
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
import uuid

logger = logging.getLogger(__name__)


class AuthService:
    """Handle authentication operations."""

    @staticmethod
    def create_user(
        db: Session,
        email: str = None,
        phone: str = None,
        password: str = None,
        name: str = None,
        preferred_lang: str = "en",
    ) -> User:
        """Create a new user."""
        try:
            password_hash = hash_password(password) if password else None
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                phone=phone,
                password_hash=password_hash,
                preferred_lang=preferred_lang,
                role="user",
                is_verified=0,
                is_active=1,
                onboarding_incomplete=1,
                created_at=datetime.utcnow().isoformat(),
            )
            # Auto-create empty profile
            from app.models import Profile
            profile = Profile(
                id=str(uuid.uuid4()),
                user_id=user.id,
                full_name=name,
                onboarding_complete=0,
                onboarding_step=1,
                created_at=datetime.utcnow().isoformat(),
            )
            db.add(user)
            db.add(profile)
            db.commit()
            db.refresh(user)
            return user
        except IntegrityError:
            db.rollback()
            raise ValueError("Email or phone already exists")

    @staticmethod
    def authenticate_user(db: Session, email: str = None, phone: str = None, password: str = None) -> User:
        """Authenticate user by email/phone and password."""
        if email:
            user = db.query(User).filter(User.email == email).first()
        elif phone:
            user = db.query(User).filter(User.phone == phone).first()
        else:
            return None

        if not user or not user.password_hash:
            return None

        if not verify_password(password, user.password_hash):
            return None

        # Backfill profile for legacy users and keep onboarding flags in sync.
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

        user.last_login = datetime.utcnow().isoformat()
        needs_commit = True

        try:
            if needs_commit:
                db.commit()
                db.refresh(user)
        except Exception:
            db.rollback()
            logger.exception("Failed to persist last_login for user_id=%s", user.id)

        return user

        return None

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User:
        """Get user by email."""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_phone(db: Session, phone: str) -> User:
        """Get user by phone."""
        return db.query(User).filter(User.phone == phone).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> User:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def verify_email(db: Session, user_id: str):
        """Mark email as verified."""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_verified = 1
            db.commit()
            return user
        return None

    @staticmethod
    def generate_tokens(user_id: str) -> dict:
        """Generate access and refresh tokens."""
        access_token = create_access_token({"sub": user_id})
        refresh_token = create_refresh_token({"sub": user_id})
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
