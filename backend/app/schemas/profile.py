"""
Pydantic schemas for profile.
"""
from pydantic import BaseModel, Field
from typing import Optional


class ProfileUpdate(BaseModel):
    """Profile update schema."""
    full_name: Optional[str] = None
    dob: Optional[str] = None  # YYYY-MM-DD
    age: Optional[int] = None
    gender: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    annual_income: Optional[float] = None
    occupation: Optional[str] = None
    social_category: Optional[str] = None
    religion: Optional[str] = None
    is_bpl: Optional[int] = None
    is_farmer: Optional[int] = None
    land_holding_acres: Optional[float] = None
    is_woman_headed: Optional[int] = None
    has_disability: Optional[int] = None
    disability_type: Optional[str] = None
    disability_pct: Optional[int] = None
    is_student: Optional[int] = None
    education_level: Optional[str] = None
    is_senior_citizen: Optional[int] = None
    is_minority: Optional[int] = None
    is_street_vendor: Optional[int] = None
    is_self_help_group: Optional[int] = None
    has_ration_card: Optional[int] = None
    ration_card_type: Optional[str] = None
    bank_account_linked: Optional[int] = None


class ProfileResponse(BaseModel):
    """Profile response."""
    id: str
    user_id: str
    full_name: Optional[str]
    dob: Optional[str]
    age: Optional[int]
    gender: Optional[str]
    state: Optional[str]
    district: Optional[str]
    pincode: Optional[str]
    annual_income: Optional[float]
    occupation: Optional[str]
    social_category: Optional[str]
    is_bpl: bool
    is_farmer: bool
    is_student: bool
    is_senior_citizen: bool
    is_minority: bool
    has_disability: bool
    profile_complete_pct: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class ProfileCompleteness(BaseModel):
    """Profile completeness details."""
    total_percentage: int
    filled_fields: int
    total_fields: int
    missing_fields: list
    priority_actions: list


class OptionalQuestionsResponse(BaseModel):
    """Optional questions response."""
    questions: list
    user_responses: dict
