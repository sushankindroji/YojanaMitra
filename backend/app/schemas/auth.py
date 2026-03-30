"""
Pydantic schemas for authentication endpoints.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


# Auth Schemas
class UserRegister(BaseModel):
    """User registration schema."""
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str = Field(..., min_length=8, max_length=72, description="Max 72 characters (bcrypt limitation)")
    name: str = Field(..., min_length=2)
    preferred_lang: str = "en"


class UserLogin(BaseModel):
    """User login schema."""
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str = Field(..., max_length=72)


class OTPRequest(BaseModel):
    """Request OTP for phone verification."""
    phone: str


class OTPVerify(BaseModel):
    """Verify OTP."""
    phone: str
    otp: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    """Token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    email: Optional[str]
    phone: Optional[str]


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    """Forgot password request."""
    email: EmailStr


class ResetPassword(BaseModel):
    """Reset password with token."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=72)
    confirm_password: str


class ChangePassword(BaseModel):
    """Change password (authenticated user)."""
    current_password: str = Field(..., max_length=72)
    new_password: str = Field(..., min_length=8, max_length=72)
    confirm_password: str


class UserResponse(BaseModel):
    """User response."""
    id: str
    email: Optional[str]
    phone: Optional[str]
    preferred_lang: str
    role: str
    is_verified: bool
    is_active: bool
    created_at: str
    last_login: Optional[str]

    class Config:
        from_attributes = True
