"""
Authentication router.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.dependencies import get_current_user, get_db, verify_token
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
    RefreshTokenRequest,
    OTPRequest,
    OTPVerify,
)
from app.services.auth_service import AuthService
from app.models import User
from app.core.rate_limiter import limiter, get_rate_limit

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit(get_rate_limit("register"))
async def register(request: Request, user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    existing = AuthService.get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    try:
        user = AuthService.create_user(
            db=db,
            email=user_data.email,
            password=user_data.password,
            name=user_data.name,
            preferred_lang=user_data.preferred_lang,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        db.rollback()
        logger.exception("Registration failed")
        raise HTTPException(status_code=500, detail="Unable to process registration")

    # Generate tokens
    tokens = AuthService.generate_tokens(user.id)

    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        user_id=user.id,
        email=user.email,
        phone=user.phone,
        onboarding_incomplete=bool(user.onboarding_incomplete),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit(get_rate_limit("login"))
async def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user with email/phone and password."""
    try:
        user = AuthService.authenticate_user(
            db=db,
            email=credentials.email,
            phone=credentials.phone,
            password=credentials.password,
        )

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="User account is inactive")

        tokens = AuthService.generate_tokens(user.id)

        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            user_id=user.id,
            email=user.email,
            phone=user.phone,
            role=user.role,  # Include role to avoid extra API calls
            onboarding_incomplete=bool(user.onboarding_incomplete),
        )
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Login failed")
        raise HTTPException(status_code=500, detail="Unable to process login request")


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit(get_rate_limit("auth"))
async def refresh_token(
    request: Request,
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """Refresh access token."""
    token_payload = verify_token(payload.refresh_token)

    if not token_payload or token_payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = token_payload.get("sub")
    user = AuthService.get_user_by_id(db, user_id)

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    tokens = AuthService.generate_tokens(user.id)

    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        user_id=user.id,
        email=user.email,
        phone=user.phone,
        role=user.role,  # Include role in refresh response too
        onboarding_incomplete=bool(user.onboarding_incomplete),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    profile = getattr(current_user, "profile", None)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        full_name=getattr(profile, "full_name", None),
        preferred_lang=current_user.preferred_lang,
        role=current_user.role,
        is_verified=bool(current_user.is_verified),
        is_active=bool(current_user.is_active),
        onboarding_incomplete=bool(current_user.onboarding_incomplete),
        created_at=current_user.created_at,
        last_login=current_user.last_login,
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (client-side token deletion)."""
    return {"message": "Logged out successfully"}


@router.post("/send-otp")
@limiter.limit(get_rate_limit("auth"))
async def send_otp(request: Request, payload: OTPRequest):
    """Send OTP to phone (mock implementation)."""
    # In production, integrate with SMS service like Twillio
    # For demo, return a mock OTP
    return {
        "status": "sent",
        "message": "OTP sent successfully",
        "phone": f"***{payload.phone[-4:]}",
        "demo_otp": "123456"  # Only for testing, remove in production
    }


@router.post("/verify-otp", response_model=TokenResponse)
@limiter.limit(get_rate_limit("auth"))
async def verify_otp(
    request: Request,
    payload: OTPVerify,
    db: Session = Depends(get_db),
):
    """Verify OTP and create/login user."""
    # Demo: Accept any 6-digit OTP
    if len(payload.otp) != 6 or not payload.otp.isdigit():
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Check if user exists
    user = AuthService.get_user_by_phone(db, payload.phone)

    if not user:
        # Create new user
        if not payload.name:
            raise HTTPException(status_code=400, detail="Name required for new registration")
        try:
            user = AuthService.create_user(db=db, phone=payload.phone, name=payload.name)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception:
            db.rollback()
            logger.exception("OTP verification user creation failed")
            raise HTTPException(status_code=500, detail="Unable to process OTP verification")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")

    tokens = AuthService.generate_tokens(user.id)

    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        user_id=user.id,
        email=user.email,
        phone=user.phone,
        onboarding_incomplete=bool(user.onboarding_incomplete),
    )
