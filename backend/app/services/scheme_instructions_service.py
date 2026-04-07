"""Application guidance service for scheme detail and apply-info APIs."""

from __future__ import annotations

import json
from typing import Any

from app.data.scheme_portals import (
    APPLICATION_MODES,
    get_ministry_helpline,
    get_portal_url_for_scheme,
    infer_application_mode,
)

CSC_LOCATOR_URL = "https://locator.csccloud.in/"


DEFAULT_REQUIRED_DOCS_BY_SECTOR = {
    "agriculture": ["Aadhaar", "Land records", "Bank passbook"],
    "education": ["Aadhaar", "Education certificate", "Income certificate"],
    "health": ["Aadhaar", "Income certificate", "Residence proof"],
    "housing": ["Aadhaar", "Income certificate", "Residence proof"],
    "social security": ["Aadhaar", "Income certificate", "Bank passbook"],
}


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


def get_fallback_url(scheme: Any) -> str:
    return get_portal_url_for_scheme(scheme) or CSC_LOCATOR_URL


def get_required_documents(scheme: Any) -> list[str]:
    parsed = _parse_json(getattr(scheme, "required_documents", None), [])
    if isinstance(parsed, list) and parsed:
        return [str(item).strip() for item in parsed if str(item).strip()]

    sector = _norm(getattr(scheme, "sector", ""))
    for key, docs in DEFAULT_REQUIRED_DOCS_BY_SECTOR.items():
        if key in sector:
            return docs

    return ["Aadhaar", "Income certificate", "Bank passbook"]


def get_helpline(ministry: str | None) -> str:
    return get_ministry_helpline(ministry)


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
        _canonical_doc_name(str(getattr(doc, "doc_type", "") or "")).lower()
        for doc in user_documents
        if str(getattr(doc, "extraction_status", "") or "").lower() == "completed"
    }

    has_docs: list[str] = []
    missing_docs: list[str] = []

    for doc in required_documents:
        if doc.lower() in user_doc_names:
            has_docs.append(doc)
        else:
            missing_docs.append(doc)

    return has_docs, missing_docs


def generate_steps(scheme: Any, profile: Any | None = None, portal_url: str | None = None) -> list[str]:
    mode = _norm(getattr(scheme, "application_mode", "")) or infer_application_mode(scheme)
    portal_url = portal_url or get_fallback_url(scheme)

    if mode == "online":
        return [
            f"Visit {portal_url}",
            "Click 'New Registration' or 'Apply Now'",
            "Login with your Aadhaar-linked mobile OTP",
            "Fill the application form with your details",
            "Upload required documents",
            "Submit and note your application reference number",
        ]

    if mode == "csc":
        return [
            "Find your nearest CSC at locator.csccloud.in",
            "Carry original documents and photocopies",
            "The CSC operator will fill the form on your behalf",
            "Pay CSC service fee if applicable (usually Rs 30-50)",
            "Collect your acknowledgement slip",
        ]

    if mode == "bank":
        return [
            "Visit your nearest nationalized bank branch",
            "Carry Aadhaar, income proof, and passbook",
            "Ask for the scheme application form",
            "Fill and submit the form with supporting documents",
            "Collect acknowledgement and reference number",
        ]

    if mode == "gram_panchayat":
        return [
            "Visit your Gram Panchayat or Ward office",
            "Carry all required original documents",
            "Get beneficiary registration form from local office",
            "Submit form and collect acknowledgement",
            "Track status at Panchayat office or CSC center",
        ]

    return [
        "Visit the concerned government department office",
        "Collect the latest application form",
        "Attach required documents and submit",
        "Collect acknowledgement receipt",
        "Track your application using receipt number",
    ]


def get_application_instructions(
    scheme: Any,
    user_profile: Any | None = None,
    user_documents: list[Any] | None = None,
) -> dict[str, Any]:
    portal_url = str(getattr(scheme, "official_portal_url", "") or "").strip() or get_fallback_url(scheme)
    application_mode = _norm(getattr(scheme, "application_mode", "")) or infer_application_mode(scheme)
    required_documents = get_required_documents(scheme)
    documents_user_has, documents_user_missing = _get_user_document_status(required_documents, user_documents)

    return {
        "portal_url": portal_url,
        "application_mode": application_mode,
        "application_mode_text": APPLICATION_MODES.get(application_mode, APPLICATION_MODES["online"]),
        "steps": generate_steps(scheme, user_profile, portal_url),
        "required_documents": required_documents,
        "documents_user_has": documents_user_has,
        "documents_user_missing": documents_user_missing,
        "helpline": get_helpline(getattr(scheme, "ministry", None)),
        "csc_locator_url": CSC_LOCATOR_URL,
        "estimated_time": "15-30 minutes online / 1-2 hours at CSC",
        "is_ready_to_apply": len(documents_user_missing) == 0,
    }
