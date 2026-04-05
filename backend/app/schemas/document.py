"""
Pydantic schemas for documents.
"""
from pydantic import BaseModel, Field
from typing import Optional


class DocumentUpload(BaseModel):
    """Document upload schema."""
    doc_type: str  # aadhaar, income, caste, ration, other


class DocumentResponse(BaseModel):
    """Document response."""
    id: str
    user_id: str
    doc_type: str
    file_name: str
    extraction_status: str
    extracted_data: Optional[str]
    confidence_score: Optional[float]
    retry_count: Optional[int]
    error_message: Optional[str]
    uploaded_at: str
    processed_at: Optional[str]

    class Config:
        from_attributes = True


class ExtractionReview(BaseModel):
    """Review extracted data from document."""
    extracted_data: dict
    confidence_score: float
    confirmed: bool


class ExtractionResult(BaseModel):
    """Extraction result."""
    status: str
    document_id: str
    extracted_data: dict
    confidence_scores: dict
    retry_count: int
