"""
Schemes router - list, filter, eligible, details.
"""
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.dependencies import get_admin_user, get_current_user, get_db, get_optional_user
from app.models import User, Scheme, EligibilityResult, Profile, Document
from app.schemas.scheme import SchemeResponse
from app.services.scheme_instructions_service import get_application_instructions

router = APIRouter()

SUPPORTED_LANGUAGES = {"en", "hi", "ta", "te", "mr", "bn", "kn"}

RULE_ACTION_HINTS = {
    "age_min": "Check the minimum age requirement and apply when your age is eligible.",
    "age_max": "This scheme has an upper age limit. Please check other schemes for your age group.",
    "gender": "This scheme is limited by gender. Check women-only or open-category schemes.",
    "income_max": "Get your latest income certificate. This scheme is for lower-income families.",
    "state": "This is state-specific. Apply in your own state schemes if you have moved.",
    "caste_category": "Keep your caste certificate ready and apply under the correct category.",
    "is_farmer": "This scheme is for farmers. Keep land records and farmer registration details ready.",
    "is_student": "This scheme is for students. Keep your admission proof and marksheets ready.",
    "is_bpl": "This scheme needs BPL status. Keep ration/BPL card details ready.",
    "is_disabled": "This scheme is for persons with disability. Keep your disability certificate ready.",
    "is_senior_citizen": "This scheme is for senior citizens. Keep age proof ready.",
    "is_minority": "This scheme is for minority communities. Keep category proof ready if needed.",
}


def _resolve_language(request: Request, lang: str | None) -> str:
    if lang:
        candidate = str(lang).strip().lower().split("-")[0]
        if candidate in SUPPORTED_LANGUAGES:
            return candidate

    header = str(request.headers.get("Accept-Language") or "").strip().lower()
    if header:
        candidate = header.split(",")[0].split("-")[0].strip()
        if candidate in SUPPORTED_LANGUAGES:
            return candidate

    return "en"


def _localized_value(scheme: Scheme, field_prefix: str, lang: str) -> str | None:
    if lang != "en":
        localized = getattr(scheme, f"{field_prefix}_{lang}", None)
        if localized is not None and str(localized).strip():
            return str(localized).strip()

    fallback = getattr(scheme, f"{field_prefix}_en", None)
    if fallback is not None and str(fallback).strip():
        return str(fallback).strip()

    return None


def _serialize_scheme(scheme: Scheme, lang: str) -> dict:
    payload = SchemeResponse.from_orm(scheme).dict()
    payload["name"] = _localized_value(scheme, "name", lang) or payload.get("name_en")
    payload["description"] = _localized_value(scheme, "description", lang) or payload.get("description_en")
    payload["eligibility_rules"] = _parse_json(payload.get("eligibility_rules"), {})
    payload["required_documents"] = _parse_json(payload.get("required_documents"), [])
    payload["application_steps"] = _parse_json(payload.get("application_steps"), [])
    payload["scheme_tags"] = _parse_json(payload.get("scheme_tags"), [])
    payload["faq"] = _parse_json(payload.get("faq"), [])
    payload["full_description"] = payload.get("full_description") or payload.get("description")
    payload["benefits_description"] = payload.get("benefits_description") or payload.get("benefit_details")
    payload["target_beneficiaries"] = (
        payload.get("target_beneficiaries")
        or "All eligible Indian citizens as per scheme criteria"
    )
    payload["processing_time"] = payload.get("processing_time") or "15-30 working days"
    payload["validity_period"] = payload.get("validity_period") or "As per scheme guidelines"
    payload["last_date"] = (
        payload.get("last_date")
        or payload.get("application_deadline")
        or "No deadline - apply anytime"
    )
    payload["csc_applicable"] = bool(payload.get("csc_applicable", True))
    payload["bank_applicable"] = bool(payload.get("bank_applicable", False))
    payload["gram_panchayat_applicable"] = bool(payload.get("gram_panchayat_applicable", False))
    payload["eligibility_criteria_list"] = _derive_eligibility_criteria(scheme)
    payload["selected_language"] = lang
    return payload


def _parse_json(raw_value, default):
    if raw_value is None:
        return default
    if isinstance(raw_value, (dict, list)):
        return raw_value
    try:
        return json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return default


def _to_percentage(score: float) -> float:
    numeric = float(score or 0)
    return round(numeric * 100, 1) if 0 <= numeric <= 1 else round(numeric, 1)


def _to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return int(value) == 1
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y"}
    return False


def _format_rupees(value: Any) -> str:
    try:
        return f"₹{int(float(value)):,}"
    except Exception:
        return str(value)


def _normalize_eligibility_rules(raw_rules: Any) -> dict[str, Any]:
    parsed = _parse_json(raw_rules, {})
    if not isinstance(parsed, dict):
        return {}
    if isinstance(parsed.get("eligibility"), dict):
        return parsed["eligibility"]
    return parsed


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(float(value))
    except Exception:
        return None


def _derive_eligibility_criteria(scheme: Scheme) -> list[dict[str, Any]]:
    rules = _normalize_eligibility_rules(getattr(scheme, "eligibility_rules", None))
    if not rules:
        return []

    criteria: list[dict[str, Any]] = []

    age_min = _as_int(rules.get("age_min") or rules.get("min_age") or rules.get("minimum_age"))
    age_max = _as_int(rules.get("age_max") or rules.get("max_age") or rules.get("maximum_age"))
    if age_min is not None and age_max is not None:
        age_text = f"{age_min} to {age_max} years"
    elif age_min is not None:
        age_text = f"{age_min} years and above"
    elif age_max is not None:
        age_text = f"Up to {age_max} years"
    else:
        age_text = "As per scheme rules"
    criteria.append({"key": "age", "label": "Age", "value": age_text, "rule_keys": ["age_min", "age_max"]})

    gender_raw = str(rules.get("gender") or "").strip().lower()
    if gender_raw in {"female", "women", "woman"} or _to_bool(rules.get("is_woman")):
        gender_text = "Women only"
    elif gender_raw in {"male", "men"}:
        gender_text = "Men only"
    else:
        gender_text = "Open for all"
    criteria.append({"key": "gender", "label": "Gender", "value": gender_text, "rule_keys": ["gender", "is_woman"]})

    income_limit = _as_int(rules.get("income_max") or rules.get("annual_income_max") or rules.get("income_limit"))
    income_text = (
        f"Annual family income below {_format_rupees(income_limit)}"
        if income_limit is not None
        else "As per scheme rules"
    )
    criteria.append({"key": "income", "label": "Income", "value": income_text, "rule_keys": ["income_max"]})

    categories: list[str] = []
    caste_category = rules.get("caste_category") or rules.get("social_category") or rules.get("category")
    if isinstance(caste_category, list):
        categories.extend([str(item).upper() for item in caste_category if str(item).strip()])
    elif caste_category:
        categories.append(str(caste_category).upper())
    if _to_bool(rules.get("is_bpl")):
        categories.append("BPL families")
    if _to_bool(rules.get("is_minority")):
        categories.append("Minority communities")
    category_text = " / ".join(dict.fromkeys(categories)) if categories else "Open category"
    criteria.append(
        {
            "key": "category",
            "label": "Category",
            "value": category_text,
            "rule_keys": ["caste_category", "is_bpl", "is_minority"],
        }
    )

    state_rule = rules.get("state") or rules.get("states") or rules.get("eligible_state")
    if isinstance(state_rule, list):
        state_text = ", ".join(str(item) for item in state_rule if str(item).strip())
    else:
        state_text = str(state_rule or "").strip()
    if not state_text:
        scheme_state = str(getattr(scheme, "state", "") or "").strip()
        if scheme_state and scheme_state.lower() != "central":
            state_text = f"{scheme_state} residents only"
        else:
            state_text = "All India"
    criteria.append({"key": "state", "label": "State", "value": state_text, "rule_keys": ["state"]})

    occupations: list[str] = []
    if _to_bool(rules.get("is_farmer")):
        occupations.append("Farmers with land records")
    if _to_bool(rules.get("is_student")):
        occupations.append("Students")
    if _to_bool(rules.get("is_senior_citizen")):
        occupations.append("Senior citizens")
    if _to_bool(rules.get("is_disabled")):
        occupations.append("Persons with disability")
    occupation_text = " / ".join(occupations) if occupations else "Any occupation"
    criteria.append(
        {
            "key": "occupation",
            "label": "Occupation",
            "value": occupation_text,
            "rule_keys": ["is_farmer", "is_student", "is_senior_citizen", "is_disabled"],
        }
    )

    return criteria


def _criterion_status(rule_keys: list[str], condition_payload: dict[str, Any]) -> str:
    matched = set(condition_payload.get("matched_conditions") or [])
    failed = set(condition_payload.get("failed_conditions") or [])
    unknown = set(condition_payload.get("unknown_conditions") or [])

    keys = set(rule_keys)
    if keys & failed:
        return "not_met"
    if keys & matched:
        return "met"
    if keys & unknown:
        return "unknown"
    return "unknown"


def _build_conditions_payload(
    criteria: list[dict[str, Any]],
    condition_payload: dict[str, Any] | None,
) -> tuple[list[dict[str, Any]], int, int, list[str], list[str]]:
    condition_payload = condition_payload or {}
    conditions: list[dict[str, Any]] = []
    unmet_labels: list[str] = []
    action_hints: list[str] = []
    met_count = 0

    for criterion in criteria:
        status = _criterion_status(criterion.get("rule_keys", []), condition_payload)
        if status == "met":
            met_count += 1
        if status == "not_met":
            unmet_labels.append(criterion.get("label", "Requirement"))
            for rule_key in criterion.get("rule_keys", []):
                if rule_key in RULE_ACTION_HINTS:
                    action_hints.append(RULE_ACTION_HINTS[rule_key])

        conditions.append(
            {
                "key": criterion.get("key"),
                "label": criterion.get("label"),
                "value": criterion.get("value"),
                "status": status,
                # compatibility for older UI consumers
                "name": criterion.get("label"),
                "description": criterion.get("value"),
                "result": status,
            }
        )

    return conditions, met_count, len(criteria), sorted(set(unmet_labels)), sorted(set(action_hints))


async def _run_pipeline_summary(user_id: str, db: Session) -> dict[str, Any]:
    """Run the eligibility pipeline once and return normalized aggregate counts."""
    from app.agents.agent_orchestrator import run_full_eligibility_pipeline

    payload = await run_full_eligibility_pipeline(user_id, db)
    results = payload.get("raw_results", [])
    eligible_count = sum(1 for item in results if item.get("is_eligible"))
    partial_count = sum(1 for item in results if item.get("is_partially_eligible"))

    return {
        "total_checked": len(results),
        "eligible_count": eligible_count,
        "partially_eligible_count": partial_count,
        "payload": payload,
    }


def _serialize_eligibility_scheme(
    scheme: Scheme,
    eligibility: EligibilityResult,
    partial: bool = False,
    lang: str = "en",
) -> dict:
    return {
        "id": scheme.id,
        "scheme_id": scheme.id,
        "scheme_code": scheme.scheme_code,
        "name_en": scheme.name_en,
        "name_hi": scheme.name_hi,
        "name": _localized_value(scheme, "name", lang) or scheme.name_en,
        "description_en": scheme.description_en,
        "description": _localized_value(scheme, "description", lang) or scheme.description_en,
        "sector": scheme.sector,
        "benefit_amount": scheme.benefit_amount or 0,
        "benefit_type": scheme.benefit_type,
        "benefit_frequency": scheme.benefit_frequency,
        "eligibility_score": float(eligibility.eligibility_score or 0),
        "eligibility_percentage": _to_percentage(eligibility.eligibility_score or 0),
        "is_eligible": bool(eligibility.is_eligible),
        "is_partially_eligible": partial,
        "condition_results": _parse_json(eligibility.condition_results, []),
        "official_portal_url": scheme.official_portal_url,
        "application_mode": scheme.application_mode,
        "ministry": scheme.ministry,
    }


@router.get("/")
async def list_schemes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sector: str = None,
    state: str = None,
    search: str = None,
    lang: str | None = Query(None, description="Preferred language code"),
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """List all schemes with pagination and filters."""
    resolved_lang = _resolve_language(request, lang)
    query = db.query(Scheme).filter(Scheme.is_active == 1)

    if sector:
        sectors = [value.strip() for value in sector.split(",") if value.strip()]
        if sectors:
            query = query.filter(Scheme.sector.in_(sectors))
    if state:
        states = [value.strip() for value in state.split(",") if value.strip()]
        if states:
            query = query.filter(Scheme.state.in_(states))
    if search:
        query = query.filter(
            or_(
                Scheme.name_en.ilike(f"%{search}%"),
                Scheme.description_en.ilike(f"%{search}%"),
            )
        )

    total = query.count()
    schemes = query.offset(skip).limit(limit).all()

    serialized_schemes = [_serialize_scheme(s, resolved_lang) for s in schemes]

    if current_user and serialized_schemes:
        scheme_ids = [str(item.get("id")) for item in serialized_schemes if item.get("id")]
        if scheme_ids:
            eligibility_rows = db.query(EligibilityResult).filter(
                and_(
                    EligibilityResult.user_id == current_user.id,
                    EligibilityResult.scheme_id.in_(scheme_ids),
                )
            ).all()

            eligibility_by_scheme = {str(row.scheme_id): row for row in eligibility_rows}
            for item in serialized_schemes:
                row = eligibility_by_scheme.get(str(item.get("id")))
                if not row:
                    continue

                score = float(row.eligibility_score or 0)
                item["eligibility_score"] = score
                item["eligibility_percentage"] = _to_percentage(score)
                item["is_eligible"] = bool(row.is_eligible)
                item["is_partially_eligible"] = bool(row.is_partially_eligible)
                item["condition_results"] = _parse_json(row.condition_results, {})
                item["eligibility_computed"] = True

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "language": resolved_lang,
        "schemes": serialized_schemes,
    }


@router.get("/public/list")
async def list_public_schemes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sector: str = None,
    state: str = None,
    search: str = None,
    lang: str | None = Query(None, description="Preferred language code"),
    db: Session = Depends(get_db),
):
    """Public list route for unauthenticated browsing."""
    return await list_schemes(
        request=request,
        skip=skip,
        limit=limit,
        sector=sector,
        state=state,
        search=search,
        lang=lang,
        current_user=None,
        db=db,
    )


@router.get("/public/{scheme_id}")
async def get_public_scheme_detail(
    request: Request,
    scheme_id: str,
    lang: str | None = Query(None, description="Preferred language code"),
    db: Session = Depends(get_db),
):
    """Public detail route alias for unauthenticated clients."""
    return await get_scheme_detail(request=request, scheme_id=scheme_id, lang=lang, db=db)


@router.get("/public/{scheme_id}/apply-info")
async def get_public_apply_info(
    scheme_id: str,
    db: Session = Depends(get_db),
):
    """Public apply-info route alias for unauthenticated clients."""
    return await get_apply_info(scheme_id=scheme_id, current_user=None, db=db)


@router.get("/search")
async def search_schemes(
    request: Request,
    q: str = Query(..., min_length=2),
    lang: str | None = Query(None, description="Preferred language code"),
    db: Session = Depends(get_db),
):
    """Search schemes by name or description."""
    resolved_lang = _resolve_language(request, lang)
    results = db.query(Scheme).filter(
        or_(
            Scheme.name_en.ilike(f"%{q}%"),
            Scheme.description_en.ilike(f"%{q}%"),
        ),
        Scheme.is_active == 1,
    ).limit(20).all()

    return [_serialize_scheme(s, resolved_lang) for s in results]


@router.get("/sectors")
async def get_sectors(db: Session = Depends(get_db)):
    """Get list of unique sectors."""
    sectors = db.query(Scheme.sector).distinct().filter(Scheme.is_active == 1).all()
    return [s[0] for s in sectors if s[0]]


@router.get("/states")
async def get_states(db: Session = Depends(get_db)):
    """Get list of unique states."""
    states = db.query(Scheme.state).distinct().filter(Scheme.is_active == 1).all()
    return [s[0] for s in states if s[0]]


@router.post("/check-eligibility")
async def check_user_eligibility(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run eligibility check against all schemes and return ranked results."""
    summary = await _run_pipeline_summary(current_user.id, db)
    
    return {
        "status": "completed",
        "total_checked": summary["total_checked"],
        "eligible_count": summary["eligible_count"],
        "partially_eligible_count": summary["partially_eligible_count"],
    }


@router.post("/check-all")
async def check_all_schemes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run eligibility check against all schemes."""
    summary = await _run_pipeline_summary(current_user.id, db)

    return {
        "user_id": current_user.id,
        "total_checked": summary["total_checked"],
        "eligible_count": summary["eligible_count"],
        "partial_count": summary["partially_eligible_count"],
    }


@router.get("/eligible")
async def get_eligible_schemes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    lang: str | None = Query(None, description="Preferred language code"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get schemes user is eligible for, ranked by benefit amount."""
    resolved_lang = _resolve_language(request, lang)
    # Get eligibility results for fully eligible schemes
    eligibility = db.query(EligibilityResult).filter(
        and_(
            EligibilityResult.user_id == current_user.id,
            EligibilityResult.is_eligible == 1,
        )
    ).all()

    scheme_ids = [e.scheme_id for e in eligibility]
    scheme_map = {
        scheme.id: scheme
        for scheme in db.query(Scheme).filter(Scheme.id.in_(scheme_ids)).all()
    } if scheme_ids else {}

    results = []
    for e in eligibility:
        scheme = scheme_map.get(e.scheme_id)
        if scheme:
            results.append(_serialize_eligibility_scheme(scheme, e, partial=False, lang=resolved_lang))
    
    # Sort by benefit_amount (descending) then by eligibility_score (descending)
    results.sort(key=lambda x: (-x["benefit_amount"], -x["eligibility_score"]))
    
    # Apply pagination
    total = len(results)
    paginated = results[skip:skip + limit]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "language": resolved_lang,
        "eligible_count": total,
        "schemes": paginated,
    }


@router.get("/partially-eligible")
async def get_partial_schemes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    lang: str | None = Query(None, description="Preferred language code"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get schemes user is partially eligible for, ranked by benefit amount."""
    resolved_lang = _resolve_language(request, lang)
    eligibility = db.query(EligibilityResult).filter(
        and_(
            EligibilityResult.user_id == current_user.id,
            EligibilityResult.is_partially_eligible == 1,
        )
    ).all()

    scheme_ids = [e.scheme_id for e in eligibility]
    scheme_map = {
        scheme.id: scheme
        for scheme in db.query(Scheme).filter(Scheme.id.in_(scheme_ids)).all()
    } if scheme_ids else {}

    results = []
    for e in eligibility:
        scheme = scheme_map.get(e.scheme_id)
        if scheme:
            results.append(_serialize_eligibility_scheme(scheme, e, partial=True, lang=resolved_lang))
    
    # Sort by benefit_amount (descending) then by eligibility_score (descending)
    results.sort(key=lambda x: (-x["benefit_amount"], -x["eligibility_score"]))
    
    # Apply pagination
    total = len(results)
    paginated = results[skip:skip + limit]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "language": resolved_lang,
        "partially_eligible_count": total,
        "schemes": paginated,
    }


@router.get("/{scheme_id}")
async def get_scheme_detail(
    request: Request,
    scheme_id: str,
    lang: str | None = Query(None, description="Preferred language code"),
    db: Session = Depends(get_db),
):
    """Get scheme details."""
    resolved_lang = _resolve_language(request, lang)
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    return _serialize_scheme(scheme, resolved_lang)


@router.get("/{scheme_id}/apply-info")
async def get_apply_info(
    scheme_id: str,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Get application portal and step-by-step guidance.

    This endpoint works with or without login; user-specific document readiness is included
    only when an authenticated user is available.
    """
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    profile = None
    user_documents = []
    if current_user:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        user_documents = (
            db.query(Document)
            .filter(Document.user_id == current_user.id)
            .all()
        )

    info = get_application_instructions(scheme=scheme, user_profile=profile, user_documents=user_documents)

    return {
        "portal_url": info.get("portal_url"),
        "state_portal_url": info.get("state_portal_url"),
        "myscheme_fallback": bool(info.get("myscheme_fallback", False)),
        "application_mode": info.get("application_mode"),
        "steps": info.get("steps", []),
        "required_documents": info.get("required_documents", []),
        "documents_user_has": info.get("documents_user_has", []),
        "documents_user_missing": info.get("documents_user_missing", []),
        "helpline": info.get("helpline"),
        "helpline_hours": info.get("helpline_hours"),
        "alternate_helpline": info.get("alternate_helpline"),
        "state_service_helpline": info.get("state_service_helpline"),
        "local_csc_name": info.get("local_csc_name"),
        "csc_url": info.get("csc_locator_url"),
        "estimated_time": info.get("estimated_time"),
        "processing_time": info.get("processing_time"),
        "validity_period": info.get("validity_period"),
        "faq": info.get("faq", []),
        "is_ready_to_apply": info.get("is_ready_to_apply", False),
    }


@router.get("/{scheme_id}/eligibility")
async def get_scheme_eligibility(
    scheme_id: str,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Get scheme criteria for everyone and user-specific status when logged in."""
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    criteria = _derive_eligibility_criteria(scheme)
    criteria_unavailable = len(criteria) == 0

    result = None
    if current_user:
        result = db.query(EligibilityResult).filter(
            and_(
                EligibilityResult.user_id == current_user.id,
                EligibilityResult.scheme_id == scheme_id,
            )
        ).first()

    condition_payload = _parse_json(getattr(result, "condition_results", None), {}) if result else {}
    conditions, met_count, total_count, unmet_labels, action_hints = _build_conditions_payload(
        criteria=criteria,
        condition_payload=condition_payload,
    )

    if criteria_unavailable:
        message = (
            "Eligibility criteria for this scheme are not available in our database yet. "
            "Please visit the official portal or your nearest CSC / Jan Seva Kendra for details."
        )
    elif current_user and result:
        message = f"You meet {met_count} out of {total_count} criteria"
    elif current_user and not result:
        message = "Sign in and run eligibility check to see your personal match for this scheme."
    else:
        message = "Sign in to check if you personally qualify for this scheme."

    missing_summary = ""
    if unmet_labels:
        missing_summary = ", ".join(unmet_labels)

    return {
        "scheme_id": scheme_id,
        "is_logged_in": bool(current_user),
        "criteria_unavailable": criteria_unavailable,
        "message": message,
        "criteria": [
            {
                "key": item.get("key"),
                "label": item.get("label"),
                "value": item.get("value"),
            }
            for item in criteria
        ],
        "conditions": conditions,
        "user_result": {
            "available": bool(result),
            "met_count": met_count,
            "total_count": total_count,
            "unmet_criteria": unmet_labels,
            "action_hints": action_hints,
            "missing_summary": missing_summary,
        },
        # Backward-compatible fields used by existing consumers.
        "user_id": getattr(result, "user_id", None),
        "is_eligible": bool(getattr(result, "is_eligible", False)),
        "is_partially_eligible": bool(getattr(result, "is_partially_eligible", False)),
        "eligibility_score": float(getattr(result, "eligibility_score", 0) or 0),
        "eligible_percentage": _to_percentage(getattr(result, "eligibility_score", 0) or 0),
        "condition_results": condition_payload,
        "explanation_en": getattr(result, "explanation_en", None),
        "missing_docs": _parse_json(getattr(result, "missing_docs", None), []),
        "probability_pct": getattr(result, "probability_pct", None),
        "estimated_days": getattr(result, "estimated_days", None),
    }


@router.get("/{scheme_id}/apply-guide")
async def get_apply_guide(
    scheme_id: str,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Get step-by-step application guide for a scheme."""
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    profile = None
    user_documents = []
    if current_user:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        user_documents = db.query(Document).filter(Document.user_id == current_user.id).all()

    info = get_application_instructions(scheme=scheme, user_profile=profile, user_documents=user_documents)

    return {
        "scheme_id": scheme_id,
        "scheme_name": scheme.name_en,
        "steps": info.get("steps", []),
        "portal_url": info.get("portal_url"),
        "state_portal_url": info.get("state_portal_url"),
        "application_mode": info.get("application_mode"),
        "documents_required": info.get("required_documents", []),
        "documents_user_has": info.get("documents_user_has", []),
        "documents_user_missing": info.get("documents_user_missing", []),
        "helpline": info.get("helpline"),
        "helpline_hours": info.get("helpline_hours"),
        "alternate_helpline": info.get("alternate_helpline"),
        "state_service_helpline": info.get("state_service_helpline"),
        "local_csc_name": info.get("local_csc_name"),
        "faq": info.get("faq", []),
        "csc_locator_url": info.get("csc_locator_url"),
    }
