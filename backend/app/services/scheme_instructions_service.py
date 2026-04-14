"""Application guidance service for scheme detail and apply-info APIs."""

from __future__ import annotations

import json
import re
from typing import Any

from app.data.scheme_portals import (
    APPLICATION_MODES,
    DEFAULT_HELPLINE,
    DEFAULT_HELPLINE_HOURS,
    get_csc_name_by_state,
    get_default_processing_time,
    get_default_validity,
    get_documents_for_scheme,
    get_faqs_for_scheme,
    get_ministry_helpline,
    get_portal_url_for_scheme,
    get_state_service_helpline,
    get_steps_for_scheme,
    infer_application_mode,
    resolve_portal_url_for_scheme,
)

CSC_LOCATOR_URL = "https://locator.csccloud.in/"


def _norm(value: Any) -> str:
    return str(value or "").strip().lower()


def _parse_json(value: Any, default: Any) -> Any:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return default
        try:
            return json.loads(text)
        except Exception:
            return default
    return default


def _ensure_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        parsed = _parse_json(value, None)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
        if "," in value:
            return [chunk.strip() for chunk in value.split(",") if chunk.strip()]
    return []


def _normalize_doc_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def get_fallback_url(scheme: Any) -> str:
    return get_portal_url_for_scheme(scheme) or CSC_LOCATOR_URL


def get_required_documents(scheme: Any) -> list[str]:
    from_db = _ensure_list(getattr(scheme, "required_documents", None))
    if from_db:
        return from_db
    return get_documents_for_scheme(scheme)


def get_helpline_details(scheme: Any) -> dict[str, str | None]:
    helpline_number = str(getattr(scheme, "helpline_number", "") or "").strip()
    if not helpline_number:
        helpline_number = get_ministry_helpline(
            getattr(scheme, "ministry", None),
            getattr(scheme, "scheme_code", None),
        )

    helpline_hours = str(getattr(scheme, "helpline_hours", "") or "").strip() or DEFAULT_HELPLINE_HOURS
    alternate_helpline = str(getattr(scheme, "alternate_helpline", "") or "").strip() or None
    state_service_helpline = get_state_service_helpline(getattr(scheme, "state", None))

    return {
        "helpline": helpline_number or DEFAULT_HELPLINE,
        "helpline_hours": helpline_hours,
        "alternate_helpline": alternate_helpline,
        "state_service_helpline": state_service_helpline,
    }


def _canonical_doc_name(doc_type: str) -> str:
    mapping = {
        "aadhaar": "Aadhaar",
        "income_certificate": "Income certificate",
        "caste_certificate": "Caste certificate",
        "ration_card": "Ration card",
        "bank_passbook": "Bank passbook",
        "land_records": "Land records",
        "pan_card": "PAN card",
        "disability_certificate": "Disability certificate",
    }
    return mapping.get(doc_type, doc_type.replace("_", " ").title())


def _get_user_document_status(required_documents: list[str], user_documents: list[Any] | None) -> tuple[list[str], list[str]]:
    if not user_documents:
        return [], required_documents

    user_doc_names = {
        _normalize_doc_text(_canonical_doc_name(str(getattr(doc, "doc_type", "") or "")))
        for doc in user_documents
        if str(getattr(doc, "extraction_status", "") or "").lower() == "completed"
    }

    has_docs: list[str] = []
    missing_docs: list[str] = []

    for doc in required_documents:
        normalized_required = _normalize_doc_text(doc)
        matched = any(
            normalized_required in user_doc or user_doc in normalized_required
            for user_doc in user_doc_names
        )
        if matched:
            has_docs.append(doc)
        else:
            missing_docs.append(doc)

    return has_docs, missing_docs


def get_application_instructions(
    scheme: Any,
    user_profile: Any | None = None,
    user_documents: list[Any] | None = None,
) -> dict[str, Any]:
    resolved_portal_url, inferred_fallback, _ = resolve_portal_url_for_scheme(scheme)
    portal_url = str(getattr(scheme, "official_portal_url", "") or "").strip() or resolved_portal_url
    state_portal_url = str(getattr(scheme, "state_portal_url", "") or "").strip() or None
    local_csc_name = get_csc_name_by_state(getattr(scheme, "state", None))
    application_mode = _norm(getattr(scheme, "application_mode", "")) or infer_application_mode(scheme)
    required_documents = get_required_documents(scheme)
    documents_user_has, documents_user_missing = _get_user_document_status(required_documents, user_documents)
    helpline_details = get_helpline_details(scheme)

    steps = get_steps_for_scheme(scheme, local_csc_name)

    return {
        "portal_url": portal_url,
        "state_portal_url": state_portal_url,
        "myscheme_fallback": bool(getattr(scheme, "myscheme_fallback", False) or inferred_fallback),
        "application_mode": application_mode,
        "application_mode_text": APPLICATION_MODES.get(application_mode, APPLICATION_MODES["online"]),
        "steps": steps,
        "required_documents": required_documents,
        "documents_user_has": documents_user_has,
        "documents_user_missing": documents_user_missing,
        "helpline": helpline_details["helpline"],
        "helpline_hours": helpline_details["helpline_hours"],
        "alternate_helpline": helpline_details["alternate_helpline"],
        "state_service_helpline": helpline_details["state_service_helpline"],
        "local_csc_name": local_csc_name,
        "csc_locator_url": CSC_LOCATOR_URL,
        "estimated_time": str(getattr(scheme, "processing_time", "") or "").strip() or get_default_processing_time(),
        "processing_time": str(getattr(scheme, "processing_time", "") or "").strip() or get_default_processing_time(),
        "validity_period": str(getattr(scheme, "validity_period", "") or "").strip() or get_default_validity(),
        "faq": get_faqs_for_scheme(scheme),
        "is_ready_to_apply": len(documents_user_missing) == 0,
    }
