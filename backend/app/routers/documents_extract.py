"""Document extraction endpoint using OCR pipeline."""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.models.document import Document
from app.models.user import User
from app.utils.ocr_processor import process_document

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/extract")
async def extract_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Extract fields from uploaded document using OCR pipeline.

    Accepts: JPEG, PNG images
    Returns: Extracted fields, confidence score, and auto-fill suggestions

    Args:
        file: Image file upload
        current_user: Authenticated user
        db: Database session

    Returns:
        {
            "document_type": str,
            "extracted_fields": dict,
            "confidence_score": float,
            "raw_text": str,
            "auto_fill": {
                "name": str,
                "age": int,
                "gender": str,
                "annual_income": float,
                "caste": str,
                "bpl": bool,
                "aadhaar_number": str,
            },
            "saved_document_id": str,
        }
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Only images (JPEG, PNG) are accepted.",
        )

    # Read file
    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="File is empty.")
        if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=413, detail="File too large. Maximum 10MB.")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(exc)}")

    # Process document
    try:
        result = process_document(image_bytes, tesseract_cmd=settings.tesseract_cmd)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(exc)}")

    # Save to database
    try:
        doc_id = str(uuid.uuid4())
        document = Document(
            id=doc_id,
            user_id=current_user.id,
            document_type=result.get("document_type", "unknown"),
            extracted_fields=result.get("extracted_fields", {}),
            confidence_score=result.get("confidence_score", 0.0),
            raw_text=result.get("raw_text", ""),
            file_name=file.filename or "document",
            file_size=len(image_bytes),
        )
        db.add(document)
        db.commit()
        db.refresh(document)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save document: {str(exc)}")

    return {
        "document_type": result.get("document_type"),
        "extracted_fields": result.get("extracted_fields"),
        "confidence_score": result.get("confidence_score"),
        "raw_text": result.get("raw_text"),
        "auto_fill": result.get("auto_fill"),
        "saved_document_id": doc_id,
    }
