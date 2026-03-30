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
    eligibility_rules: Optional[str] = None
    required_documents: Optional[str] = None
    application_steps: Optional[str] = None
    application_mode: Optional[str] = None
    official_portal_url: Optional[str] = None
    application_deadline: Optional[str] = None


class SchemeUpdate(BaseModel):
    """Update scheme schema."""
    name_en: Optional[str] = None
    description_en: Optional[str] = None
    benefit_amount: Optional[float] = None
    eligibility_rules: Optional[str] = None
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
    scheme_type: Optional[str]
    state: Optional[str]
    benefit_amount: Optional[float]
    benefit_frequency: Optional[str]
    application_mode: Optional[str]
    official_portal_url: Optional[str]
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