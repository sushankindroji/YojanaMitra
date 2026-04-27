"""EligibilityReasoningAgent: Generates plain-English explanations from engine output.

No LLM for decisions. String templates only.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional


# Maps failed check field names to human-readable improvement tips
_IMPROVEMENT_TIPS: Dict[str, str] = {
    "age": "Your age does not meet the scheme's age requirement.",
    "annual_income": "Your annual income exceeds the allowed limit for this scheme. Consider schemes with higher income thresholds.",
    "gender": "This scheme is restricted to a specific gender.",
    "residence": "This scheme is only available for residents of a specific state or region.",
    "state": "This scheme is only available for residents of a specific state.",
    "occupation": "Your occupation does not match the target group for this scheme.",
    "caste": "Your social category does not qualify for this scheme.",
    "bpl": "Your BPL status does not match the requirement. Obtain a BPL certificate if eligible.",
    "is_farmer": "This scheme is for farmers only. Ensure your occupation is registered as farmer.",
    "is_student": "This scheme is for students only.",
    "is_disabled": "This scheme requires a disability certificate.",
    "is_senior_citizen": "This scheme is for senior citizens (age 60+).",
    "is_minority": "This scheme is for minority communities only.",
    "is_woman": "This scheme is for women applicants only.",
    "has_bank_account": "A linked bank account is required. Open a Jan Dhan account at your nearest bank.",
    "land_area_min": "Your land holding is below the minimum required for this scheme.",
    "land_area_max": "Your land holding exceeds the maximum allowed for this scheme.",
    "education_min": "Your education level does not meet the minimum requirement.",
    "family_size_max": "Your family size exceeds the maximum allowed for this scheme.",
}


def _priority_from_score(confidence_score: int) -> str:
    if confidence_score > 80:
        return "high"
    if confidence_score > 50:
        return "medium"
    return "low"


def _build_explanation(scheme: dict, profile: dict, engine_result: dict) -> str:
    scheme_name = scheme.get("scheme_name") or scheme.get("name_en", "This scheme")
    passed = engine_result.get("passed_checks", [])
    failed = engine_result.get("failed_checks", [])
    rules_evaluated = engine_result.get("rules_evaluated", 0)
    rules_passed = engine_result.get("rules_passed", 0)

    if engine_result.get("eligible"):
        if rules_evaluated == 0:
            return f"You appear eligible for {scheme_name}. No specific eligibility rules were defined."
        return (
            f"You meet all {rules_evaluated} eligibility condition(s) for {scheme_name}. "
            f"You qualify based on: {', '.join(c['field'] for c in passed) if passed else 'general criteria'}."
        )

    if rules_evaluated == 0:
        return f"Eligibility for {scheme_name} could not be determined — no rules were available."

    failed_fields = [c["field"] for c in failed]
    passed_fields = [c["field"] for c in passed]

    parts = [f"You meet {rules_passed} of {rules_evaluated} condition(s) for {scheme_name}."]
    if passed_fields:
        parts.append(f"You qualify on: {', '.join(passed_fields)}.")
    if failed_fields:
        parts.append(f"You do not meet: {', '.join(failed_fields)}.")

    return " ".join(parts)


def _build_improvement_tip(failed_checks: List[Dict[str, Any]]) -> Optional[str]:
    if not failed_checks:
        return None
    # Use the first failed check for the primary tip
    first_field = failed_checks[0].get("field", "")
    tip = _IMPROVEMENT_TIPS.get(first_field)
    if tip:
        return tip
    # Fallback to the engine's own message
    return failed_checks[0].get("message")


class EligibilityReasoningAgent:
    """Generates human-readable eligibility explanations using string templates."""

    def run(self, scheme: dict, profile: dict, engine_result: dict) -> dict:
        """
        Args:
            scheme: Scheme dict (from SchemeDiscoveryAgent output entry).
            profile: Validated profile dict.
            engine_result: Output from eligibility_engine.check_eligibility().

        Returns:
            {
                scheme_id: str,
                scheme_name: str,
                priority: "high" | "medium" | "low",
                explanation: str,
                improvement_tip: str | None,
                confidence_score: int,
                eligible: bool,
            }
        """
        confidence_score = engine_result.get("confidence_score", 0)
        failed_checks = engine_result.get("failed_checks", [])

        return {
            "scheme_id": scheme.get("scheme_id") or scheme.get("id"),
            "scheme_name": scheme.get("scheme_name") or scheme.get("name_en"),
            "priority": _priority_from_score(confidence_score),
            "explanation": _build_explanation(scheme, profile, engine_result),
            "improvement_tip": _build_improvement_tip(failed_checks),
            "confidence_score": confidence_score,
            "eligible": bool(engine_result.get("eligible", False)),
        }
