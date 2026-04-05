"""
Documents router - upload, OCR, extraction, download.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, BackgroundTasks, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Document, Profile
from app.services.storage_service import storage_service
from app.services.ocr_service import ocr_service
from app.schemas.document import DocumentResponse, ExtractionResult
from app.core.audit import log_audit
from datetime import datetime
import json
import uuid

router = APIRouter()

# Max 50MB per file
MAX_FILE_SIZE = 50 * 1024 * 1024

DOC_TYPE_ALIASES = {
    "aadhaar": "aadhaar",
    "aadhar": "aadhaar",
    "aadhaar_card": "aadhaar",
    "aadhaarcard": "aadhaar",
    "income": "income",
    "income_certificate": "income",
    "income certificate": "income",
    "income_proof": "income",
    "salary": "income",
    "salary_certificate": "income",
    "caste": "caste",
    "caste_certificate": "caste",
    "caste certificate": "caste",
    "community_certificate": "caste",
    "ration": "ration",
    "ration_card": "ration",
    "ration card": "ration",
    "rationcard": "ration",
    "other": "other",
}

DOC_TYPE_ALLOWED_FIELDS = {
    "aadhaar": {
        "full_name",
        "dob",
        "gender",
        "aadhaar_number",
        "address",
        "state",
        "district",
        "pincode",
    },
    "income": {
        "full_name",
        "annual_income",
        "occupation",
        "address",
        "state",
        "district",
        "pincode",
    },
    "caste": {
        "full_name",
        "social_category",
        "address",
        "state",
        "district",
        "pincode",
    },
    "ration": {
        "full_name",
        "ration_card_number",
        "ration_card_type",
        "is_bpl",
        "has_ration_card",
        "address",
        "state",
        "district",
        "pincode",
    },
    "other": {
        "full_name",
        "dob",
        "gender",
        "annual_income",
        "social_category",
        "occupation",
        "address",
        "state",
        "district",
        "pincode",
    },
}


def _normalize_doc_type(doc_type: str) -> str:
    if not doc_type:
        return "other"

    key = doc_type.strip().lower().replace("-", " ").replace("_", " ")
    key = " ".join(key.split())
    key = key.replace(" ", "_")
    return DOC_TYPE_ALIASES.get(key, "other")


def _filter_extracted_data_for_doc_type(raw_data: dict, doc_type: str) -> dict:
    normalized_doc_type = _normalize_doc_type(doc_type)
    allowed_fields = DOC_TYPE_ALLOWED_FIELDS.get(normalized_doc_type, DOC_TYPE_ALLOWED_FIELDS["other"])
    return {key: value for key, value in raw_data.items() if key in allowed_fields}


def _has_minimum_doc_specific_data(extracted_data: dict, doc_type: str) -> bool:
    if not extracted_data:
        return False

    normalized_doc_type = _normalize_doc_type(doc_type)

    def parse_income(value):
        if value is None:
            return None
        numeric_text = "".join(ch for ch in str(value) if ch.isdigit() or ch == ".")
        if not numeric_text:
            return None
        try:
            parsed = float(numeric_text)
        except Exception:
            return None

        rounded = int(parsed)
        if 1900 <= parsed <= 2100 and abs(parsed - rounded) < 0.0001:
            return None
        return parsed if parsed > 0 else None

    if normalized_doc_type == "aadhaar":
        return any(extracted_data.get(key) for key in ["aadhaar_number", "dob", "full_name"])
    if normalized_doc_type == "income":
        has_income = parse_income(extracted_data.get("annual_income")) is not None
        has_name = bool(extracted_data.get("full_name"))
        geo_count = sum(1 for key in ["district", "state", "pincode"] if extracted_data.get(key))
        return has_income or has_name or geo_count >= 2
    if normalized_doc_type == "caste":
        return bool(extracted_data.get("social_category"))
    if normalized_doc_type == "ration":
        return any(
            extracted_data.get(key)
            for key in ["ration_card_number", "ration_card_type", "is_bpl", "has_ration_card"]
        )

    return bool(extracted_data)


def _clean_extracted_data(raw_data: dict) -> dict:
    """Remove invalid OCR placeholder/error values before persisting."""
    if not isinstance(raw_data, dict):
        return {}

    invalid_values = {"", "error", "none", "null", "n/a", "na", "unknown"}
    invalid_name_tokens = {
        "mee seva",
        "meeseva",
        "certificate",
        "government",
        "india",
        "ration card",
        "income certificate",
        "caste certificate",
        "yojanamitra",
        "easier",
        "faster",
        "upload",
        "documents",
        "dashboard",
        "review",
        "profile",
        "schemes",
        "processing",
        "confirm",
        "continue",
        "district",
        "address",
        "pincode",
    }
    cleaned = {}

    for key, value in raw_data.items():
        if value is None:
            continue
        if isinstance(value, str):
            stripped = value.strip()
            lowered = stripped.lower()
            if not stripped or lowered in invalid_values or lowered.startswith("error:"):
                continue

            if key == "full_name":
                normalized_name = " ".join(stripped.split())
                normalized_lower = normalized_name.lower()
                if any(token in normalized_lower for token in invalid_name_tokens):
                    continue
                if any(ch.isdigit() for ch in normalized_name):
                    continue
                word_count = len(normalized_name.split())
                if word_count < 2 or word_count > 5:
                    continue
                cleaned[key] = normalized_name
                continue

            cleaned[key] = stripped
            continue
        cleaned[key] = value

    return cleaned


def _normalize_dob(value: str) -> str:
    if not value:
        return ""

    raw = value.strip()
    formats = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%Y-%m-%d"]
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return ""


def _calculate_age(dob_iso: str):
    if not dob_iso:
        return None
    try:
        dob_date = datetime.strptime(dob_iso, "%Y-%m-%d")
        today = datetime.utcnow()
        age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
        return age if 0 <= age <= 120 else None
    except Exception:
        return None


def _normalize_gender(value: str) -> str:
    if not value:
        return ""
    lowered = value.strip().lower()
    if lowered.startswith("m"):
        return "male"
    if lowered.startswith("f"):
        return "female"
    if lowered.startswith("o"):
        return "other"
    return ""


def _normalize_social_category(value: str) -> str:
    if not value:
        return ""
    lowered = value.strip().lower()
    if "sc" in lowered:
        return "sc"
    if "st" in lowered:
        return "st"
    if "obc" in lowered:
        return "obc"
    if "ews" in lowered:
        return "ews"
    if "general" in lowered:
        return "general"
    return ""


def _calculate_profile_completeness(profile: Profile) -> int:
    essential = [
        profile.full_name,
        profile.dob,
        profile.age,
        profile.gender,
        profile.state,
        profile.district,
        profile.annual_income,
        profile.occupation,
    ]
    optional = [
        profile.is_farmer,
        profile.is_student,
        profile.is_senior_citizen,
        profile.has_disability,
        profile.is_minority,
    ]

    total_fields = len(essential) + (len(optional) * 0.5)
    filled_fields = sum(1 for field in essential if field) + sum(0.5 for field in optional if field)

    if total_fields == 0:
        return 0
    return int((filled_fields / total_fields) * 100)


def _build_profile_patch(extracted_data: dict, doc_type: str) -> dict:
    patch = {}
    doc_type_norm = (doc_type or "").strip().lower()

    full_name = (extracted_data.get("full_name") or "").strip()
    if full_name:
        patch["full_name"] = full_name

    dob_iso = _normalize_dob((extracted_data.get("dob") or "").strip())
    if dob_iso:
        patch["dob"] = dob_iso
        age = _calculate_age(dob_iso)
        if age is not None:
            patch["age"] = age
            if age >= 60:
                patch["is_senior_citizen"] = 1

    gender = _normalize_gender((extracted_data.get("gender") or "").strip())
    if gender:
        patch["gender"] = gender

    state = (extracted_data.get("state") or "").strip()
    if state:
        patch["state"] = state

    district = (extracted_data.get("district") or "").strip()
    if district:
        patch["district"] = district

    pincode_raw = (extracted_data.get("pincode") or "").strip()
    pincode_digits = "".join(ch for ch in pincode_raw if ch.isdigit())
    if len(pincode_digits) == 6:
        patch["pincode"] = pincode_digits

    annual_income = extracted_data.get("annual_income")
    if annual_income is not None:
        try:
            income_value = float(str(annual_income).replace(",", "").strip())
            if income_value >= 0:
                patch["annual_income"] = income_value
        except Exception:
            pass

    occupation = (extracted_data.get("occupation") or "").strip()
    if occupation:
        patch["occupation"] = occupation
        lowered_occupation = occupation.lower()
        if "farmer" in lowered_occupation or "agri" in lowered_occupation:
            patch["is_farmer"] = 1
        if "student" in lowered_occupation:
            patch["is_student"] = 1

    social_category = _normalize_social_category((extracted_data.get("social_category") or "").strip())
    if social_category:
        patch["social_category"] = social_category

    aadhaar = str(extracted_data.get("aadhaar_number") or "").replace(" ", "").replace("-", "")
    if len(aadhaar) == 12 and aadhaar.isdigit():
        patch["aadhaar_last4"] = aadhaar[-4:]

    if doc_type_norm == "ration":
        patch["has_ration_card"] = 1

    ration_card_type = (extracted_data.get("ration_card_type") or "").strip().lower()
    if ration_card_type in {"apl", "bpl", "antyodaya", "phh"}:
        patch["ration_card_type"] = ration_card_type
        if ration_card_type in {"bpl", "antyodaya", "phh"}:
            patch["is_bpl"] = 1

    return patch


def _apply_profile_patch(profile: Profile, patch: dict):
    if not patch:
        return False

    changed = False
    for field, value in patch.items():
        current = getattr(profile, field, None)

        if isinstance(value, str):
            if not value:
                continue
            if not current:
                setattr(profile, field, value)
                changed = True
            continue

        if isinstance(value, (int, float)):
            if field.startswith("is_") or field in {"has_ration_card", "bank_account_linked"}:
                # For boolean-like flags, allow promotion from 0/None to 1.
                if int(value) == 1 and int(current or 0) != 1:
                    setattr(profile, field, 1)
                    changed = True
                continue

            if current is None:
                setattr(profile, field, value)
                changed = True

    return changed


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(None),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document and trigger async OCR processing."""
    allowed_content_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
    }
    if not file.content_type or (
        not file.content_type.startswith("image/")
        and file.content_type not in allowed_content_types
    ):
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP, or PDF files are allowed")

    # Read file
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    # Save file (encrypted)
    storage_path = await storage_service.save_file(file_bytes, file.filename, current_user.id)
    normalized_doc_type = _normalize_doc_type(doc_type)

    # Create document record
    doc = Document(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        doc_type=normalized_doc_type,
        file_name=file.filename,
        storage_path=storage_path,
        extraction_status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Kick off OCR in background (non-blocking)
    if background_tasks:
        background_tasks.add_task(process_ocr, doc.id, file_bytes, db)

    # Log audit
    log_audit(db, "document_upload", "document", doc.id, current_user.id)

    return {
        "doc_id": doc.id,
        "status": "uploading",
        "message": "Document uploaded. Processing OCR...",
        "filename": file.filename,
    }


async def process_ocr(doc_id: str, image_bytes: bytes, db: Session):
    """Background task to process OCR."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return

    try:
        doc.extraction_status = "processing"
        db.commit()

        # Extract structured data
        result = await ocr_service.extract_structured_data(image_bytes, doc.doc_type)
        if result.get("status") != "completed":
            raise ValueError(result.get("error") or "OCR extraction failed")

        cleaned_data = _clean_extracted_data(result.get("data", {}))
        cleaned_data = _filter_extracted_data_for_doc_type(cleaned_data, doc.doc_type)
        if not cleaned_data:
            raise ValueError("No valid structured data could be extracted from document")

        if not _has_minimum_doc_specific_data(cleaned_data, doc.doc_type):
            raise ValueError(f"Could not extract required {doc.doc_type} fields")

        doc.extracted_data = json.dumps(cleaned_data)
        doc.confidence_score = result.get("confidence", 0.0)
        doc.extraction_status = "completed"
        doc.error_message = None
        doc.processed_at = datetime.utcnow().isoformat()

        profile = db.query(Profile).filter(Profile.user_id == doc.user_id).first()
        if profile:
            patch = _build_profile_patch(cleaned_data, doc.doc_type)
            if _apply_profile_patch(profile, patch):
                profile.updated_at = datetime.utcnow().isoformat()
                profile.profile_complete_pct = _calculate_profile_completeness(profile)

        db.commit()
    except Exception as e:
        doc.extraction_status = "failed"
        doc.extracted_data = json.dumps({})
        doc.confidence_score = 0.0
        doc.error_message = str(e)
        doc.retry_count += 1
        doc.processed_at = datetime.utcnow().isoformat()
        db.commit()


@router.get("/")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all documents for current user."""
    documents = db.query(Document).filter(Document.user_id == current_user.id).all()
    return [
        DocumentResponse.from_orm(d).dict() for d in documents
    ]


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get document details."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentResponse.from_orm(doc).dict()


@router.patch("/{doc_id}/extraction")
async def update_document_extraction(
    doc_id: str,
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist user-reviewed extraction data for a document."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id,
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not isinstance(payload, dict) or not payload:
        raise HTTPException(status_code=400, detail="No extraction fields provided")

    flattened = {}
    for key, value in payload.items():
        if isinstance(value, dict) and "value" in value:
            flattened[key] = value.get("value")
        else:
            flattened[key] = value

    cleaned_data = _clean_extracted_data(flattened)
    cleaned_data = _filter_extracted_data_for_doc_type(cleaned_data, doc.doc_type)
    if not cleaned_data:
        raise HTTPException(status_code=400, detail="No valid extraction fields to save")

    if not _has_minimum_doc_specific_data(cleaned_data, doc.doc_type):
        raise HTTPException(
            status_code=400,
            detail=f"Could not save extraction: missing required {doc.doc_type} fields",
        )

    doc.extracted_data = json.dumps(cleaned_data)
    doc.extraction_status = "completed"
    doc.error_message = None
    doc.processed_at = datetime.utcnow().isoformat()

    profile = db.query(Profile).filter(Profile.user_id == doc.user_id).first()
    if profile:
        patch = _build_profile_patch(cleaned_data, doc.doc_type)
        if _apply_profile_patch(profile, patch):
            profile.updated_at = datetime.utcnow().isoformat()
            profile.profile_complete_pct = _calculate_profile_completeness(profile)

    db.commit()
    db.refresh(doc)

    log_audit(db, "document_extraction_update", "document", doc.id, current_user.id)

    return DocumentResponse.from_orm(doc).dict()


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a document."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file
    await storage_service.delete_file(doc.storage_path)

    # Delete record
    db.delete(doc)
    db.commit()

    log_audit(db, "document_delete", "document", doc_id, current_user.id)

    return {"message": "Document deleted"}


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download decrypted document file."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_bytes = await storage_service.read_file(doc.storage_path)

    safe_filename = (doc.file_name or "document").replace('"', "")
    return Response(
        content=file_bytes,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )


@router.post("/{doc_id}/reprocess")
async def reprocess_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reprocess OCR for a document."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Read encrypted file
    file_bytes = await storage_service.read_file(doc.storage_path)

    # Reset status
    doc.extraction_status = "pending"
    doc.extracted_data = None
    doc.confidence_score = None
    doc.error_message = None
    doc.retry_count += 1
    db.commit()

    # Reprocess
    background_tasks.add_task(process_ocr, doc.id, file_bytes, db)

    return {"message": "Document reprocessing started", "retry_count": doc.retry_count}
