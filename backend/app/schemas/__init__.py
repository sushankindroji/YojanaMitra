"""
Schemas package.
"""
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    OTPRequest,
    OTPVerify,
    TokenResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPassword,
    UserResponse,
)
from app.schemas.profile import ProfileUpdate, ProfileResponse, ProfileCompleteness
from app.schemas.document import DocumentUpload, DocumentResponse, ExtractionResult
from app.schemas.scheme import SchemeCreate, SchemeUpdate, SchemeResponse, EligibilityResult

__all__ = [
    "UserRegister",
    "UserLogin",
    "OTPRequest",
    "OTPVerify",
    "TokenResponse",
    "RefreshTokenRequest",
    "ForgotPasswordRequest",
    "ResetPassword",
    "UserResponse",
    "ProfileUpdate",
    "ProfileResponse",
    "ProfileCompleteness",
    "DocumentUpload",
    "DocumentResponse",
    "ExtractionResult",
    "SchemeCreate",
    "SchemeUpdate",
    "SchemeResponse",
    "EligibilityResult",
]
