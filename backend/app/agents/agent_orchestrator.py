"""Agent orchestrator for full eligibility and personalization pipeline."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.orm import Session

from app.agents.eligibility_matching_agent import EligibilityMatchingAgent
from app.agents.explanation_agent import ExplanationAgent
from app.agents.personalization_agent import PersonalizationAgent
from app.agents.profile_validation_agent import ProfileValidationAgent
from app.agents.ranking_agent import RankingAgent
from app.models import Document, EligibilityResult, Profile, SavedApplication, Scheme, User
from app.services.profile_completeness import sync_profile_aliases, update_profile_completeness


PIPELINE_CACHE: Dict[str, Dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def get_cached_pipeline_result(user_id: str) -> Dict[str, Any] | None:
    return PIPELINE_CACHE.get(user_id)


def set_cached_pipeline_result(user_id: str, payload: Dict[str, Any]) -> None:
    PIPELINE_CACHE[user_id] = payload


def clear_cached_pipeline_result(user_id: str) -> None:
    PIPELINE_CACHE.pop(user_id, None)


async def _emit_progress(progress_callback: Optional[Callable[[int, str], None]], pct: int, stage: str) -> None:
    if not progress_callback:
        return
    progress_callback(int(max(0, min(100, pct))), stage)


def _attach_explanations(ranked: Dict[str, Any], explained_top: List[Dict[str, Any]]) -> Dict[str, Any]:
    explained_by_scheme = {item.get("scheme_id"): item for item in explained_top}

    def _merge(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        merged: List[Dict[str, Any]] = []
        for item in items:
            explanation = explained_by_scheme.get(item.get("scheme_id"), {})
            if explanation:
                merged.append({**item, **{k: v for k, v in explanation.items() if k not in item or k.startswith("why_") or k in {"benefit_summary", "next_action", "how_to_qualify"}}})
            else:
                merged.append(item)
        return merged

    payload = dict(ranked)
    payload["fully_eligible"] = _merge(ranked.get("fully_eligible", []))
    payload["highly_eligible"] = _merge(ranked.get("highly_eligible", []))
    payload["partially_eligible"] = _merge(ranked.get("partially_eligible", []))
    payload["one_step_away"] = _merge(ranked.get("one_step_away", []))
    payload["top_10"] = _merge(ranked.get("top_10", []))
    payload["top_50"] = _merge(ranked.get("top_50", []))
    return payload


def _save_eligibility_results(
    db: Session,
    user_id: str,
    raw_results: List[Dict[str, Any]],
    explanations: Dict[str, Dict[str, Any]],
) -> None:
    db.query(EligibilityResult).filter(EligibilityResult.user_id == user_id).delete(synchronize_session=False)

    computed_at = _now_iso()
    records: List[EligibilityResult] = []

    for result in raw_results:
        scheme_id = str(result.get("scheme_id", ""))
        if not scheme_id:
            continue

        explanation = explanations.get(scheme_id, {})

        condition_payload = {
            "matched_conditions": result.get("matched_conditions", []),
            "failed_conditions": result.get("failed_conditions", []),
            "unknown_conditions": result.get("unknown_conditions", []),
            "missing_data_for_full_check": result.get("missing_data_for_full_check", []),
            "normalized_rules": result.get("normalized_rules", {}),
        }

        records.append(
            EligibilityResult(
                id=str(uuid.uuid4()),
                user_id=user_id,
                scheme_id=scheme_id,
                is_eligible=1 if result.get("is_eligible") else 0,
                is_partially_eligible=1 if result.get("is_partially_eligible") else 0,
                eligibility_score=float(result.get("match_score", 0.0) or 0.0),
                mandatory_pass=1 if result.get("is_eligible") else 0,
                condition_results=json.dumps(condition_payload),
                explanation_en=explanation.get("why_eligible") or explanation.get("why_not_eligible") or "Eligibility computed from profile conditions.",
                explanation_user_lang=explanation.get("benefit_summary"),
                missing_docs=json.dumps(result.get("missing_data_for_full_check", [])),
                missing_conditions=json.dumps(result.get("failed_conditions", [])),
                computed_at=computed_at,
            )
        )

    if records:
        db.bulk_save_objects(records)
    db.commit()


async def run_full_eligibility_pipeline(
    user_id: str,
    db: Session,
    progress_callback: Optional[Callable[[int, str], None]] = None,
) -> Dict[str, Any]:
    """Run the full multi-agent pipeline and return personalized dashboard payload."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")

    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        raise ValueError("Profile not found")

    sync_profile_aliases(profile)
    update_profile_completeness(profile)
    db.commit()

    documents = db.query(Document).filter(Document.user_id == user_id).all()
    await _emit_progress(progress_callback, 10, "profile_validation")

    validation = ProfileValidationAgent().run(profile, documents)

    await _emit_progress(progress_callback, 20, "eligibility_matching")
    schemes = db.query(Scheme).filter(Scheme.is_active == 1).all()
    raw_results = await EligibilityMatchingAgent().run(profile, schemes)

    await _emit_progress(progress_callback, 58, "ranking")
    ranked = RankingAgent().run(raw_results, profile)

    await _emit_progress(progress_callback, 72, "explanations")
    explained_top = ExplanationAgent().run(ranked.get("top_50", []), profile)
    ranked_with_explanations = _attach_explanations(ranked, explained_top)

    explanation_map = {item.get("scheme_id"): item for item in explained_top}

    await _emit_progress(progress_callback, 84, "persistence")
    _save_eligibility_results(db, user_id, raw_results, explanation_map)

    applied_count = db.query(SavedApplication).filter(SavedApplication.user_id == user_id).count()

    await _emit_progress(progress_callback, 92, "personalization")
    dashboard_payload = PersonalizationAgent().run(
        profile=profile,
        ranked=ranked_with_explanations,
        explained_top_results=ranked_with_explanations.get("top_10", []),
        raw_results=raw_results,
        applied_count=applied_count,
        last_checked=_now_iso(),
    )

    pipeline_payload = {
        "user_id": user_id,
        "validation": validation,
        "ranked_results": ranked_with_explanations,
        "dashboard": dashboard_payload,
        "raw_results": raw_results,
        "computed_at": _now_iso(),
    }

    set_cached_pipeline_result(user_id, pipeline_payload)
    await _emit_progress(progress_callback, 100, "complete")

    return pipeline_payload
