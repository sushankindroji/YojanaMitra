"""
Authentication router.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse, RefreshTokenRequest
from app.services.auth_service import AuthService
from app.models import User
from app.core.security import verify_token, decode_token

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
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

    # Generate tokens
    tokens = AuthService.generate_tokens(user.id)

    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        user_id=user.id,
        email=user.email,
        phone=user.phone,
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
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
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token."""
    payload = verify_token(request.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
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
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return UserResponse.from_orm(current_user)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (client-side token deletion)."""
    return {"message": "Logged out successfully"}


@router.post("/send-otp")
async def send_otp(phone: str):
    """Send OTP to phone (mock implementation)."""
    # In production, integrate with SMS service like Twillio
    # For demo, return a mock OTP
    return {
        "status": "sent",
        "message": "OTP sent successfully",
        "phone": f"***{phone[-4:]}",
        "demo_otp": "123456"  # Only for testing, remove in production
    }


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(phone: str, otp: str, name: str = None, db: Session = Depends(get_db)):
    """Verify OTP and create/login user."""
    # Demo: Accept any 6-digit OTP
    if len(otp) != 6 or not otp.isdigit():
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Check if user exists
    user = AuthService.get_user_by_phone(db, phone)

    if not user:
        # Create new user
        if not name:
            raise HTTPException(status_code=400, detail="Name required for new registration")
        try:
            user = AuthService.create_user(db=db, phone=phone, name=name)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

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
    )
