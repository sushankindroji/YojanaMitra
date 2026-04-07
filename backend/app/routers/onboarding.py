"""Onboarding router for document-first profile construction."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, Tuple

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.agents.agent_orchestrator import clear_cached_pipeline_result, run_full_eligibility_pipeline
from app.agents.job_store import create_job, get_latest_job, update_job
from app.database import SessionLocal, get_db
from app.dependencies import get_current_user
from app.models import Document, Profile, User
from app.schemas.onboarding import AadhaarConfirmRequest, DocumentConfirmRequest, OnboardingCompleteRequest
from app.services.ocr_service import ocr_service
from app.services.profile_completeness import sync_profile_aliases, update_profile_completeness
from app.services.storage_service import storage_service


router = APIRouter(prefix="/onboarding", tags=["onboarding"])

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "application/pdf",
}

MAX_FILE_SIZE = 50 * 1024 * 1024

MANDATORY_INCOME_DOC_TYPES = {"income_certificate", "income_declaration_manual"}


def _has_verified_document(db: Session, user_id: str, doc_types: set[str]) -> bool:
    if not doc_types:
        return False
    doc = (
        db.query(Document)
        .filter(
            Document.user_id == user_id,
            Document.doc_type.in_(list(doc_types)),
            Document.is_verified == 1,
        )
        .order_by(Document.uploaded_at.desc())
        .first()
    )
    return doc is not None


def _parse_bool(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return 1 if int(value) == 1 else 0

    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "y"}:
        return 1
    if normalized in {"0", "false", "no", "n"}:
        return 0
    return None


def _parse_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except Exception:
        return None


def _parse_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    cleaned = "".join(ch for ch in str(value) if ch.isdigit() or ch in {"."})
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except Exception:
        return None


def _sanitize_doc_type(doc_type: str) -> str:
    normalized = ocr_service.normalize_doc_type(doc_type)
    if normalized == "other":
        return normalized
    return normalized


def _mask_pan(pan_value: str | None) -> str | None:
    if not pan_value:
        return None
    clean = str(pan_value).strip().upper()
    if len(clean) < 4:
        return None
    return f"XXXXXX{clean[-4:]}"


def _mask_account(value: str | None) -> str | None:
    if not value:
        return None
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    if len(digits) < 4:
        return None
    return f"XXXXXX{digits[-4:]}"


def _apply_base_identity_fields(profile: Profile, data: Dict[str, Any]) -> None:
    full_name = str(data.get("full_name") or "").strip()
    if full_name:
        profile.full_name = full_name

    dob = str(data.get("dob") or "").strip()
    if dob:
        profile.dob = dob

    age = _parse_int(data.get("age"))
    if age is not None:
        profile.age = age

    gender = str(data.get("gender") or "").strip().lower()
    if gender in {"male", "female", "other"}:
        profile.gender = gender

    address_line = str(data.get("address") or data.get("address_line") or "").strip()
    if address_line:
        profile.address_line = address_line

    state = str(data.get("state") or "").strip()
    if state:
        profile.state = state

    district = str(data.get("district") or "").strip()
    if district:
        profile.district = district

    pincode = "".join(ch for ch in str(data.get("pincode") or "") if ch.isdigit())
    if len(pincode) == 6:
        profile.pincode = pincode


def _apply_document_to_profile(profile: Profile, doc_type: str, data: Dict[str, Any]) -> None:
    normalized_doc_type = _sanitize_doc_type(doc_type)
    _apply_base_identity_fields(profile, data)

    if normalized_doc_type == "pan_card":
        profile.pan_number = _mask_pan(str(data.get("pan_number") or "").upper())

    elif normalized_doc_type == "voter_id":
        voter_id = str(data.get("voter_id_number") or "").strip().upper()
        if voter_id:
            profile.voter_id_number = voter_id

    elif normalized_doc_type == "passport":
        passport_number = str(data.get("passport_number") or "").strip().upper()
        if passport_number:
            profile.passport_number = passport_number

    elif normalized_doc_type == "income_certificate":
        annual_income = _parse_float(data.get("annual_income"))
        if annual_income is not None:
            profile.annual_income = annual_income
        authority = str(data.get("issuing_authority") or "").strip()
        if authority:
            profile.disability_issuing_authority = authority

    elif normalized_doc_type == "ration_card":
        ration_number = str(data.get("ration_card_number") or "").strip().upper()
        if ration_number:
            profile.ration_card_number = ration_number

        ration_category = str(data.get("ration_card_category") or "").strip().upper()
        if ration_category in {"APL", "BPL", "AAY", "PHH"}:
            profile.ration_card_category = "AAY" if ration_category == "PHH" else ration_category
            profile.ration_card_type = profile.ration_card_category.lower()

        bpl_status = _parse_bool(data.get("bpl_status"))
        if bpl_status is not None:
            profile.bpl_status = bpl_status
            profile.is_bpl = bpl_status

        family_size = _parse_int(data.get("family_size"))
        if family_size is not None:
            profile.family_size = family_size

        profile.has_ration_card = 1

    elif normalized_doc_type == "bank_passbook":
        bank_name = str(data.get("bank_name") or "").strip()
        if bank_name:
            profile.bank_name = bank_name

        account_masked = str(data.get("account_number_masked") or "").strip()
        if account_masked:
            profile.account_number_masked = account_masked
        else:
            profile.account_number_masked = _mask_account(data.get("account_number"))

        ifsc = str(data.get("ifsc") or "").strip().upper()
        if ifsc:
            profile.ifsc = ifsc

        profile.has_bank_account = 1
        profile.bank_account_linked = 1

    elif normalized_doc_type in {"tenth_marksheet", "twelfth_marksheet", "degree_certificate"}:
        education_level = str(data.get("education_level") or "").strip().lower()
        if normalized_doc_type == "tenth_marksheet":
            education_level = "10th"
        elif normalized_doc_type == "twelfth_marksheet":
            education_level = "12th"

        if education_level:
            profile.education_level = education_level

        education_percentage = _parse_float(data.get("education_percentage"))
        if education_percentage is not None:
            profile.education_percentage = education_percentage

        board = str(data.get("education_board") or "").strip()
        if board:
            profile.education_board = board

        year = _parse_int(data.get("education_year"))
        if year is not None:
            profile.education_year = year

        degree_name = str(data.get("degree_name") or "").strip()
        if degree_name:
            profile.degree_name = degree_name

        institution_name = str(data.get("institution_name") or "").strip()
        if institution_name:
            profile.institution_name = institution_name

    elif normalized_doc_type == "kisan_credit_card":
        profile.kcc_holder = 1
        kcc_number = str(data.get("kcc_number") or "").strip().upper()
        if kcc_number:
            profile.kcc_number = kcc_number

        credit_limit = _parse_float(data.get("kcc_credit_limit"))
        if credit_limit is not None:
            profile.kcc_credit_limit = credit_limit

        bank_name = str(data.get("bank_name") or "").strip()
        if bank_name:
            profile.bank_name = bank_name

    elif normalized_doc_type == "land_records":
        area = _parse_float(data.get("land_area_acres"))
        if area is not None:
            profile.land_area_acres = area
            profile.land_holding_acres = area

        survey = str(data.get("land_survey_number") or "").strip().upper()
        if survey:
            profile.land_survey_number = survey

        land_type = str(data.get("land_type") or "").strip()
        if land_type:
            profile.land_type = land_type

        if area and area > 0:
            profile.is_farmer = 1

    elif normalized_doc_type == "pm_kisan_registration":
        registered = _parse_bool(data.get("pm_kisan_registered"))
        if registered is not None:
            profile.pm_kisan_registered = registered
            if registered == 1:
                profile.is_farmer = 1

        farmer_id = str(data.get("pm_kisan_farmer_id") or "").strip().upper()
        if farmer_id:
            profile.pm_kisan_farmer_id = farmer_id

    elif normalized_doc_type == "disability_certificate":
        profile.has_disability = 1
        disability_type = str(data.get("disability_type") or "").strip()
        if disability_type:
            profile.disability_type = disability_type

        disability_pct = _parse_int(data.get("disability_percentage"))
        if disability_pct is not None:
            profile.disability_percentage = disability_pct
            profile.disability_pct = disability_pct

        authority = str(data.get("disability_issuing_authority") or "").strip()
        if authority:
            profile.disability_issuing_authority = authority

    elif normalized_doc_type == "caste_certificate":
        category = str(data.get("caste_category") or "").strip()
        if category:
            normalized = category.upper()
            if normalized in {"SC", "ST", "OBC", "GENERAL", "EWS"}:
                profile.caste_category = normalized
                profile.social_category = normalized.lower()

        sub_caste = str(data.get("sub_caste") or "").strip()
        if sub_caste:
            profile.sub_caste = sub_caste

        cert_num = str(data.get("caste_certificate_number") or "").strip().upper()
        if cert_num:
            profile.caste_certificate_number = cert_num

        authority = str(data.get("caste_issuing_authority") or "").strip()
        if authority:
            profile.caste_issuing_authority = authority

    elif normalized_doc_type == "minority_certificate":
        profile.minority_status = 1
        profile.is_minority = 1

        religion = str(data.get("religion") or "").strip()
        if religion:
            profile.religion = religion

    elif normalized_doc_type == "soil_health_card":
        soil_type = str(data.get("soil_type") or "").strip()
        if soil_type:
            profile.soil_type = soil_type

    elif normalized_doc_type == "crop_insurance_policy":
        profile.crop_insurance = 1

        policy_num = str(data.get("crop_insurance_policy_number") or "").strip().upper()
        if policy_num:
            profile.crop_insurance_policy_number = policy_num

        sum_insured = _parse_float(data.get("crop_insurance_sum_insured"))
        if sum_insured is not None:
            profile.crop_insurance_sum_insured = sum_insured

        crops = str(data.get("insured_crops") or "").strip()
        if crops:
            profile.insured_crops = crops

    elif normalized_doc_type == "senior_citizen_card":
        profile.is_senior_citizen = 1

        dob = str(data.get("dob") or "").strip()
        if dob:
            profile.dob = dob

        age = _parse_int(data.get("age"))
        if age is not None:
            profile.age = age


def _validate_upload(file: UploadFile, file_bytes: bytes) -> None:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP, or PDF files are allowed")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")


async def _run_pipeline_job(job_id: str, user_id: str) -> None:
    db = SessionLocal()
    try:
        def progress_callback(progress_pct: int, stage: str) -> None:
            update_job(job_id, status="running", progress_pct=progress_pct, stage=stage)

        await run_full_eligibility_pipeline(user_id=user_id, db=db, progress_callback=progress_callback)

        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if profile:
            profile.onboarding_complete = 1
            profile.onboarding_step = 4
            profile.updated_at = datetime.utcnow().isoformat()
        if user:
            user.onboarding_incomplete = 0
        db.commit()

        update_job(job_id, status="complete", progress_pct=100, stage="complete")
    except Exception as exc:
        db.rollback()
        update_job(job_id, status="failed", error=str(exc), stage="failed")
    finally:
        db.close()


@router.get("/status")
async def onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    aadhaar_done = int(profile.aadhaar_verified or 0) == 1 or _has_verified_document(db, current_user.id, {"aadhaar"})
    if aadhaar_done and int(profile.aadhaar_verified or 0) != 1:
        profile.aadhaar_verified = 1
        profile.updated_at = datetime.utcnow().isoformat()
        db.commit()

    income_done = _has_verified_document(db, current_user.id, MANDATORY_INCOME_DOC_TYPES)
    if not income_done and _parse_float(profile.annual_income) is not None:
        # Backward compatibility for users who already provided trusted income details.
        income_done = True

    completed = int(profile.onboarding_complete or 0) == 1

    step = int(profile.onboarding_step or 1)
    step = max(1, min(4, step))
    if completed:
        step = 4
    elif not aadhaar_done:
        step = 1
    elif not income_done:
        step = 2
    elif step < 3:
        step = 3

    latest_job = get_latest_job(current_user.id)

    if latest_job and latest_job.get("status") in {"running", "failed"}:
        step = 4

    return {
        "step": step,
        "completed": completed,
        "aadhaar_done": aadhaar_done,
        "income_done": income_done,
        "job": latest_job,
    }


@router.post("/upload-aadhaar")
async def upload_aadhaar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_bytes = await file.read()
    _validate_upload(file, file_bytes)

    result = ocr_service.extract_document(file_bytes, "aadhaar")

    try:
        storage_path = await storage_service.save_file(file_bytes, file.filename, current_user.id)
        doc = Document(
            user_id=current_user.id,
            doc_type="aadhaar",
            file_name=file.filename,
            storage_path=storage_path,
            extraction_status="completed" if result["status"] == "completed" else "failed",
            extracted_data=json.dumps(result.get("data", {})),
            confidence_score=float(result.get("overall_confidence", 0) or 0),
            is_verified=0,
            error_message=result.get("error"),
            processed_at=datetime.utcnow().isoformat(),
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to persist Aadhaar upload")

    if result["status"] != "completed":
        raise HTTPException(status_code=422, detail=result.get("error", "Could not extract Aadhaar details"))

    return {
        "doc_id": doc.id,
        "extracted_data": result.get("data", {}),
        "confidence_scores": result.get("confidence_scores", {}),
        "low_confidence_fields": result.get("low_confidence_fields", []),
        "missing_required_fields": result.get("missing_required_fields", []),
        "requires_manual_review": result.get("requires_manual_review", False),
        "fallback_used": result.get("fallback_used", False),
    }


@router.post("/confirm-aadhaar")
async def confirm_aadhaar(
    payload: AadhaarConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    doc = (
        db.query(Document)
        .filter(Document.user_id == current_user.id, Document.doc_type == "aadhaar")
        .order_by(Document.uploaded_at.desc())
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Aadhaar upload not found")

    confirmed_data = payload.confirmed_data or {}
    _apply_base_identity_fields(profile, confirmed_data)

    aadhaar_number = "".join(ch for ch in str(confirmed_data.get("aadhaar_number") or "") if ch.isdigit())
    if len(aadhaar_number) >= 4:
        profile.aadhaar_last4 = aadhaar_number[-4:]

    profile.aadhaar_verified = 1
    profile.onboarding_step = max(int(profile.onboarding_step or 1), 2)
    profile.onboarding_complete = 0

    current_user.onboarding_incomplete = 1

    doc.extracted_data = json.dumps(confirmed_data)
    doc.extraction_status = "completed"
    doc.is_verified = 1
    doc.verified_at = datetime.utcnow().isoformat()
    doc.processed_at = datetime.utcnow().isoformat()

    sync_profile_aliases(profile)
    update_profile_completeness(profile)
    profile.updated_at = datetime.utcnow().isoformat()

    db.commit()
    clear_cached_pipeline_result(current_user.id)

    return {"profile_updated": True, "next_step": "documents"}


@router.post("/upload-document")
async def upload_optional_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    normalized_doc_type = _sanitize_doc_type(doc_type)
    if normalized_doc_type == "aadhaar":
        raise HTTPException(status_code=400, detail="Use /upload-aadhaar for Aadhaar uploads")

    file_bytes = await file.read()
    _validate_upload(file, file_bytes)

    result = ocr_service.extract_document(file_bytes, normalized_doc_type)

    try:
        storage_path = await storage_service.save_file(file_bytes, file.filename, current_user.id)
        doc = Document(
            user_id=current_user.id,
            doc_type=normalized_doc_type,
            file_name=file.filename,
            storage_path=storage_path,
            extraction_status="completed" if result["status"] == "completed" else "failed",
            extracted_data=json.dumps(result.get("data", {})),
            confidence_score=float(result.get("overall_confidence", 0) or 0),
            is_verified=0,
            error_message=result.get("error"),
            processed_at=datetime.utcnow().isoformat(),
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to persist document upload")

    if result["status"] != "completed":
        raise HTTPException(status_code=422, detail=result.get("error", "Could not extract document details"))

    return {
        "doc_id": doc.id,
        "doc_type": normalized_doc_type,
        "extracted_data": result.get("data", {}),
        "confidence_scores": result.get("confidence_scores", {}),
        "low_confidence_fields": result.get("low_confidence_fields", []),
        "missing_required_fields": result.get("missing_required_fields", []),
        "requires_manual_review": result.get("requires_manual_review", False),
        "fallback_used": result.get("fallback_used", False),
    }


@router.post("/confirm-document")
async def confirm_document(
    payload: DocumentConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    normalized_doc_type = _sanitize_doc_type(payload.doc_type)

    doc = (
        db.query(Document)
        .filter(Document.user_id == current_user.id, Document.doc_type == normalized_doc_type)
        .order_by(Document.uploaded_at.desc())
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Uploaded document not found")

    confirmed_data = payload.confirmed_data or {}
    _apply_document_to_profile(profile, normalized_doc_type, confirmed_data)

    profile.onboarding_step = max(int(profile.onboarding_step or 1), 3)

    doc.extracted_data = json.dumps(confirmed_data)
    doc.extraction_status = "completed"
    doc.is_verified = 1
    doc.verified_at = datetime.utcnow().isoformat()
    doc.processed_at = datetime.utcnow().isoformat()
    doc.error_message = None

    sync_profile_aliases(profile)
    update_profile_completeness(profile)
    profile.updated_at = datetime.utcnow().isoformat()

    db.commit()
    clear_cached_pipeline_result(current_user.id)

    return {"profile_updated": True}


@router.post("/complete")
async def complete_onboarding(
    payload: OnboardingCompleteRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    additional_data = payload.additional_data or {}

    aadhaar_done = int(profile.aadhaar_verified or 0) == 1 or _has_verified_document(db, current_user.id, {"aadhaar"})
    if not aadhaar_done:
        raise HTTPException(status_code=400, detail="Aadhaar verification is required before completing onboarding")

    manual_income_fallback = _parse_bool(
        additional_data.get("manual_income_fallback")
        if "manual_income_fallback" in additional_data
        else additional_data.get("income_manual_fallback")
    ) == 1
    declared_annual_income = _parse_float(
        additional_data.get("declared_annual_income")
        if "declared_annual_income" in additional_data
        else additional_data.get("manual_annual_income")
    )
    income_fallback_reason = str(additional_data.get("income_fallback_reason") or "").strip()

    income_done = _has_verified_document(db, current_user.id, MANDATORY_INCOME_DOC_TYPES)

    if not income_done:
        if not manual_income_fallback:
            raise HTTPException(
                status_code=400,
                detail="Income certificate is required. Upload income certificate or use manual fallback",
            )

        if declared_annual_income is None:
            raise HTTPException(status_code=400, detail="Declared annual income is required for manual fallback")

        if not income_fallback_reason:
            raise HTTPException(status_code=400, detail="Reason is required for manual income fallback")

        profile.annual_income = declared_annual_income

        manual_payload = {
            "annual_income": declared_annual_income,
            "reason": income_fallback_reason,
            "self_declared": True,
            "declared_at": datetime.utcnow().isoformat(),
        }

        manual_doc = (
            db.query(Document)
            .filter(
                Document.user_id == current_user.id,
                Document.doc_type == "income_declaration_manual",
            )
            .order_by(Document.uploaded_at.desc())
            .first()
        )

        if manual_doc:
            manual_doc.extracted_data = json.dumps(manual_payload)
            manual_doc.extraction_status = "completed"
            manual_doc.is_verified = 1
            manual_doc.verified_at = datetime.utcnow().isoformat()
            manual_doc.processed_at = datetime.utcnow().isoformat()
            manual_doc.error_message = None
            manual_doc.confidence_score = 1.0
        else:
            db.add(
                Document(
                    user_id=current_user.id,
                    doc_type="income_declaration_manual",
                    file_name="manual-income-declaration.json",
                    storage_path=f"manual://income-declaration/{current_user.id}",
                    extraction_status="completed",
                    extracted_data=json.dumps(manual_payload),
                    confidence_score=1.0,
                    is_verified=1,
                    verified_at=datetime.utcnow().isoformat(),
                    processed_at=datetime.utcnow().isoformat(),
                )
            )

        income_done = True

    if not income_done and _parse_float(profile.annual_income) is not None:
        income_done = True

    if not income_done:
        raise HTTPException(status_code=400, detail="Income proof is required before completing onboarding")

    mobile_number = str(additional_data.get("mobile_number") or "").strip()
    if mobile_number:
        profile.mobile_number = mobile_number

    occupation = str(additional_data.get("occupation") or additional_data.get("occupation_type") or "").strip()
    if occupation:
        profile.occupation = occupation
        occupation_lower = occupation.lower()
        if "farmer" in occupation_lower or "agri" in occupation_lower:
            profile.is_farmer = 1
        if "student" in occupation_lower:
            profile.is_student = 1

    owns_land = _parse_bool(
        additional_data.get("owns_agricultural_land")
        if "owns_agricultural_land" in additional_data
        else additional_data.get("owns_land")
    )
    land_area = _parse_float(additional_data.get("land_area_acres") or additional_data.get("land_acres"))
    if owns_land is not None:
        if owns_land == 1:
            profile.is_farmer = 1
            if land_area is not None:
                profile.land_area_acres = land_area
                profile.land_holding_acres = land_area
        elif owns_land == 0 and land_area is not None:
            profile.land_area_acres = land_area
            profile.land_holding_acres = land_area

    is_household_head = _parse_bool(additional_data.get("is_household_head"))
    if is_household_head is not None:
        profile.is_household_head = is_household_head

    family_size = _parse_int(additional_data.get("family_size") or additional_data.get("number_of_family_members"))
    if family_size is not None:
        profile.family_size = family_size

    is_woman_headed = _parse_bool(additional_data.get("is_woman_headed_household"))
    if is_woman_headed is not None:
        profile.is_woman_headed_household = is_woman_headed
        profile.is_woman_headed = is_woman_headed

    has_bank_account = _parse_bool(additional_data.get("has_bank_account"))
    if has_bank_account is not None:
        profile.has_bank_account = has_bank_account
        profile.bank_account_linked = has_bank_account

    profile.onboarding_step = 4
    profile.onboarding_complete = 0
    profile.updated_at = datetime.utcnow().isoformat()

    current_user.onboarding_incomplete = 1

    sync_profile_aliases(profile)
    update_profile_completeness(profile)

    db.commit()
    clear_cached_pipeline_result(current_user.id)

    job_id = create_job(current_user.id, stage="pipeline_start")
    background_tasks.add_task(_run_pipeline_job, job_id, current_user.id)

    return {
        "onboarding_complete": True,
        "triggering_agent": True,
        "job_id": job_id,
    }
