"""Pydantic schemas for onboarding APIs."""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any, Dict


class AadhaarConfirmRequest(BaseModel):
    confirmed_data: Dict[str, Any] = Field(default_factory=dict)


class DocumentConfirmRequest(BaseModel):
    doc_type: str
    confirmed_data: Dict[str, Any] = Field(default_factory=dict)


class OnboardingCompleteRequest(BaseModel):
    additional_data: Dict[str, Any] = Field(default_factory=dict)
