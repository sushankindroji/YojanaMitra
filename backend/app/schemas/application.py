"""
Pydantic schemas for applications.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class ApplicationCreate(BaseModel):
    """Save application schema."""
    scheme_id: str = Field(..., description="Scheme ID to save")
    notes: Optional[str] = None
    prefilled_data: Optional[Dict[str, Any]] = None


class ApplicationUpdate(BaseModel):
    """Update application schema."""
    status: Optional[str] = None  # saved, started, submitted, acknowledged, rejected
    notes: Optional[str] = None
    prefilled_data: Optional[Dict[str, Any]] = None
    acknowledgement_no: Optional[str] = None


class ApplicationResponse(BaseModel):
    """Application response."""
    id: str
    user_id: str
    scheme_id: str
    status: str
    notes: Optional[str]
    prefilled_data: Optional[str]
    acknowledgement_no: Optional[str]
    saved_at: str
    updated_at: str
    submission_date: Optional[str]
    
    # Scheme details
    scheme_name: Optional[str] = None
    scheme_ministry: Optional[str] = None
    scheme_benefit_amount: Optional[float] = None
    
    class Config:
        from_attributes = True


class ApplicationListResponse(BaseModel):
    """List applications response."""
    total: int
    applications: list[ApplicationResponse]


class ApplicationStatsResponse(BaseModel):
    """Application statistics."""
    total_saved: int
    total_started: int
    total_submitted: int
    total_acknowledged: int
    total_rejected: int
    total_benefit_value: float
