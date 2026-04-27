"""Agent pipeline endpoints.

POST /agents/analyze  → full pipeline (profile + documents)
POST /agents/quick    → quick pipeline (profile only, no OCR)
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agents.orchestrator import Orchestrator
from app.dependencies import get_db

router = APIRouter(prefix="/agents", tags=["Agents"])


class QuickInput(BaseModel):
    """Minimal profile input for the quick pipeline."""
    full_name: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    annual_income: Optional[float] = None
    occupation: Optional[str] = None
    caste_category: Optional[str] = None
    religion: Optional[str] = None
    bpl_status: Optional[int] = None
    is_farmer: Optional[int] = None
    land_area_acres: Optional[float] = None
    is_student: Optional[int] = None
    education_level: Optional[str] = None
    has_disability: Optional[int] = None
    disability_percentage: Optional[int] = None
    is_senior_citizen: Optional[int] = None
    is_minority: Optional[int] = None
    family_size: Optional[int] = None
    has_bank_account: Optional[int] = None
    ration_card_type: Optional[str] = None


@router.post("/analyze")
async def analyze(
    # Profile fields sent as form data so documents can be uploaded together
    full_name: Optional[str] = Form(None),
    age: Optional[int] = Form(None),
    dob: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    district: Optional[str] = Form(None),
    annual_income: Optional[float] = Form(None),
    occupation: Optional[str] = Form(None),
    caste_category: Optional[str] = Form(None),
    religion: Optional[str] = Form(None),
    bpl_status: Optional[int] = Form(None),
    is_farmer: Optional[int] = Form(None),
    land_area_acres: Optional[float] = Form(None),
    is_student: Optional[int] = Form(None),
    education_level: Optional[str] = Form(None),
    has_disability: Optional[int] = Form(None),
    disability_percentage: Optional[int] = Form(None),
    is_senior_citizen: Optional[int] = Form(None),
    is_minority: Optional[int] = Form(None),
    family_size: Optional[int] = Form(None),
    has_bank_account: Optional[int] = Form(None),
    ration_card_type: Optional[str] = Form(None),
    documents: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Full pipeline: validates profile, runs OCR on uploaded documents,
    merges results, discovers eligible schemes, and returns explanations.
    """
    profile_data = {
        "full_name": full_name,
        "age": age,
        "dob": dob,
        "gender": gender,
        "state": state,
        "district": district,
        "annual_income": annual_income,
        "occupation": occupation,
        "caste_category": caste_category,
        "religion": religion,
        "bpl_status": bpl_status,
        "is_farmer": is_farmer,
        "land_area_acres": land_area_acres,
        "is_student": is_student,
        "education_level": education_level,
        "has_disability": has_disability,
        "disability_percentage": disability_percentage,
        "is_senior_citizen": is_senior_citizen,
        "is_minority": is_minority,
        "family_size": family_size,
        "has_bank_account": has_bank_account,
        "ration_card_type": ration_card_type,
    }

    doc_bytes: List[bytes] = []
    for upload in documents:
        content_type = upload.content_type or ""
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"File '{upload.filename}' is not an image.")
        doc_bytes.append(await upload.read())

    try:
        result = Orchestrator().run_full_pipeline(profile_data, doc_bytes, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return result


@router.post("/quick")
def quick(
    body: QuickInput,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Quick pipeline: validates profile and returns eligible schemes
    without any document processing. Designed for sub-2-second response.
    """
    try:
        result = Orchestrator().run_quick_pipeline(body.model_dump(), db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return result
