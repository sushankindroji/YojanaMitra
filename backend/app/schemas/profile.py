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
    address_line: Optional[str] = None

    aadhaar_verified: Optional[int] = None
    aadhaar_last4: Optional[str] = None
    pan_number: Optional[str] = None
    voter_id_number: Optional[str] = None
    passport_number: Optional[str] = None

    bpl_status: Optional[int] = None
    ration_card_number: Optional[str] = None
    ration_card_category: Optional[str] = None
    family_size: Optional[int] = None
    is_household_head: Optional[int] = None

    has_bank_account: Optional[int] = None
    bank_name: Optional[str] = None
    account_number_masked: Optional[str] = None
    ifsc: Optional[str] = None

    land_area_acres: Optional[float] = None
    land_survey_number: Optional[str] = None
    land_type: Optional[str] = None
    kcc_holder: Optional[int] = None
    kcc_number: Optional[str] = None
    kcc_credit_limit: Optional[float] = None
    crop_insurance: Optional[int] = None
    crop_insurance_policy_number: Optional[str] = None
    crop_insurance_sum_insured: Optional[float] = None
    insured_crops: Optional[str] = None
    pm_kisan_registered: Optional[int] = None
    pm_kisan_farmer_id: Optional[str] = None
    soil_type: Optional[str] = None

    disability_percentage: Optional[int] = None
    disability_issuing_authority: Optional[str] = None
    caste_category: Optional[str] = None
    sub_caste: Optional[str] = None
    caste_certificate_number: Optional[str] = None
    caste_issuing_authority: Optional[str] = None
    minority_status: Optional[int] = None

    education_percentage: Optional[float] = None
    education_board: Optional[str] = None
    education_year: Optional[int] = None
    degree_name: Optional[str] = None
    institution_name: Optional[str] = None

    mobile_number: Optional[str] = None
    is_woman_headed_household: Optional[int] = None
    onboarding_complete: Optional[int] = None
    onboarding_step: Optional[int] = None


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
    bpl_status: bool
    is_farmer: bool
    is_student: bool
    is_senior_citizen: bool
    is_minority: bool
    has_disability: bool
    aadhaar_verified: bool
    aadhaar_last4: Optional[str]
    pan_number: Optional[str]
    ration_card_number: Optional[str]
    ration_card_category: Optional[str]
    family_size: Optional[int]
    is_household_head: bool
    has_bank_account: bool
    bank_name: Optional[str]
    ifsc: Optional[str]
    land_area_acres: Optional[float]
    disability_type: Optional[str]
    disability_percentage: Optional[int]
    caste_category: Optional[str]
    sub_caste: Optional[str]
    education_level: Optional[str]
    education_percentage: Optional[float]
    kcc_holder: bool
    crop_insurance: bool
    mobile_number: Optional[str]
    is_woman_headed_household: bool
    onboarding_complete: bool
    onboarding_step: int
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
