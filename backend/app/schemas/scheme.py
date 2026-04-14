"""
Pydantic schemas for schemes.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any


class SchemeCreate(BaseModel):
    """Create scheme schema."""
    scheme_code: str
    name_en: str
    name_hi: Optional[str] = None
    description_en: Optional[str] = None
    ministry: Optional[str] = None
    department: Optional[str] = None
    sector: Optional[str] = None
    sub_sector: Optional[str] = None
    scheme_type: Optional[str] = None
    state: Optional[str] = None
    benefit_type: Optional[str] = None
    benefit_amount: Optional[float] = None
    benefit_frequency: Optional[str] = None
    eligibility_rules: Optional[Any] = None
    required_documents: Optional[Any] = None
    application_steps: Optional[Any] = None
    application_mode: Optional[str] = None
    official_portal_url: Optional[str] = None
    state_portal_url: Optional[str] = None
    application_deadline: Optional[str] = None
    full_description: Optional[str] = None
    benefits_description: Optional[str] = None
    target_beneficiaries: Optional[str] = None
    helpline_number: Optional[str] = None
    helpline_hours: Optional[str] = None
    alternate_helpline: Optional[str] = None
    processing_time: Optional[str] = None
    validity_period: Optional[str] = None
    scheme_tags: Optional[Any] = None
    faq: Optional[Any] = None
    last_date: Optional[str] = None
    language_notes: Optional[str] = None


class SchemeUpdate(BaseModel):
    """Update scheme schema."""
    name_en: Optional[str] = None
    description_en: Optional[str] = None
    benefit_amount: Optional[float] = None
    eligibility_rules: Optional[Any] = None
    required_documents: Optional[Any] = None
    application_steps: Optional[Any] = None
    official_portal_url: Optional[str] = None
    state_portal_url: Optional[str] = None
    full_description: Optional[str] = None
    benefits_description: Optional[str] = None
    target_beneficiaries: Optional[str] = None
    helpline_number: Optional[str] = None
    helpline_hours: Optional[str] = None
    alternate_helpline: Optional[str] = None
    processing_time: Optional[str] = None
    validity_period: Optional[str] = None
    scheme_tags: Optional[Any] = None
    faq: Optional[Any] = None
    last_date: Optional[str] = None
    language_notes: Optional[str] = None
    is_active: Optional[int] = None


class SchemeResponse(BaseModel):
    """Scheme response."""
    id: str
    scheme_code: str
    name_en: str
    name_hi: Optional[str]
    description_en: Optional[str]
    ministry: Optional[str]
    department: Optional[str]
    sector: Optional[str]
    sub_sector: Optional[str]
    scheme_type: Optional[str]
    state: Optional[str]
    benefit_type: Optional[str]
    benefit_amount: Optional[float]
    benefit_frequency: Optional[str]
    benefit_details: Optional[str]
    application_mode: Optional[str]
    official_portal_url: Optional[str]
    state_portal_url: Optional[str]
    myscheme_fallback: Optional[bool] = False
    eligibility_rules: Optional[Any] = None
    required_documents: Optional[Any] = None
    application_steps: Optional[Any] = None
    full_description: Optional[str] = None
    benefits_description: Optional[str] = None
    target_beneficiaries: Optional[str] = None
    helpline_number: Optional[str] = None
    helpline_hours: Optional[str] = None
    alternate_helpline: Optional[str] = None
    csc_applicable: Optional[bool] = True
    bank_applicable: Optional[bool] = False
    gram_panchayat_applicable: Optional[bool] = False
    processing_time: Optional[str] = None
    validity_period: Optional[str] = None
    scheme_tags: Optional[Any] = None
    faq: Optional[Any] = None
    last_date: Optional[str] = None
    language_notes: Optional[str] = None
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class EligibilityCondition(BaseModel):
    """Single eligibility condition."""
    field: str
    operator: str
    value: Any   # ✅ FIXED
    label_en: str
    is_mandatory: bool


class EligibilityResult(BaseModel):
    """Eligibility result for a scheme."""
    user_id: str
    scheme_id: str
    is_eligible: bool
    is_partially_eligible: bool
    eligibility_score: float
    condition_results: List[Any]   # ✅ FIXED
    explanation_en: Optional[str]
    missing_docs: Optional[List[str]]   # ✅ FIXED
    probability_pct: Optional[float]
    estimated_days: Optional[int]

    class Config:
        from_attributes = True


class SchemeFilter(BaseModel):
    """Scheme filter parameters."""
    sector: Optional[str] = None
    state: Optional[str] = None
    benefit_type: Optional[str] = None
    show_status: str = "all"  # all, eligible, partial
    search_query: Optional[str] = None
    skip: int = 0
    limit: int = 20