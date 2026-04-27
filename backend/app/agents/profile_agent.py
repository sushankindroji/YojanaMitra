"""ProfileAgent: Validates and enriches raw profile input.

No LLM. Pure Python logic only.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional


# Fields expected in a complete profile
PROFILE_FIELDS = [
    "full_name", "age", "dob", "gender", "state", "district",
    "annual_income", "occupation", "caste_category", "religion",
    "bpl_status", "is_farmer", "land_area_acres", "is_student",
    "education_level", "has_disability", "disability_percentage",
    "is_senior_citizen", "is_minority", "family_size",
    "has_bank_account", "ration_card_type",
]

# Fields that are critical for eligibility matching
CRITICAL_FIELDS = [
    "age", "gender", "state", "annual_income", "caste_category",
]


def _to_int(value: Any) -> Optional[int]:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _to_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _classify_age_group(age: Optional[int]) -> Optional[str]:
    if age is None:
        return None
    if age < 18:
        return "youth"
    if age < 60:
        return "adult"
    return "senior"


def _classify_income_category(income: Optional[float]) -> Optional[str]:
    """BPL < 1L, low < 3L, middle >= 3L (annual, INR)."""
    if income is None:
        return None
    if income < 100_000:
        return "BPL"
    if income < 300_000:
        return "low"
    return "middle"


def _classify_land_category(acres: Optional[float]) -> Optional[str]:
    if acres is None:
        return None
    if acres == 0:
        return "landless"
    if acres <= 2.5:
        return "marginal"
    return "small"


class ProfileAgent:
    """Validates profile fields and computes derived categories."""

    def run(self, raw_input: dict) -> dict:
        """
        Args:
            raw_input: Raw profile dict from form/API input.

        Returns:
            {
                validated_profile: dict,
                completeness_score: float (0-1),
                missing_fields: list[str],
                age_group: str | None,
                income_category: str | None,
                land_category: str | None,
            }
        """
        validated: Dict[str, Any] = {}
        missing_fields: List[str] = []

        for field in PROFILE_FIELDS:
            value = raw_input.get(field)
            # Never assume — missing stays None
            validated[field] = value if value is not None else None
            if value is None:
                missing_fields.append(field)

        # Type coercions
        validated["age"] = _to_int(validated.get("age"))
        validated["annual_income"] = _to_float(validated.get("annual_income"))
        validated["land_area_acres"] = _to_float(validated.get("land_area_acres"))
        validated["disability_percentage"] = _to_int(validated.get("disability_percentage"))
        validated["family_size"] = _to_int(validated.get("family_size"))

        # Derived categories
        age_group = _classify_age_group(validated["age"])
        income_category = _classify_income_category(validated["annual_income"])
        land_category = _classify_land_category(validated["land_area_acres"])

        validated["age_group"] = age_group
        validated["income_category"] = income_category
        validated["land_category"] = land_category

        # Completeness: weight critical fields more heavily
        critical_present = sum(1 for f in CRITICAL_FIELDS if validated.get(f) is not None)
        total_present = sum(1 for f in PROFILE_FIELDS if validated.get(f) is not None)

        critical_score = critical_present / len(CRITICAL_FIELDS)
        total_score = total_present / len(PROFILE_FIELDS)
        completeness_score = round(0.6 * critical_score + 0.4 * total_score, 4)

        return {
            "validated_profile": validated,
            "completeness_score": completeness_score,
            "missing_fields": missing_fields,
            "age_group": age_group,
            "income_category": income_category,
            "land_category": land_category,
        }
