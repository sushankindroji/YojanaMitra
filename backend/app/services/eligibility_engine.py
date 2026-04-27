"""Deterministic rule-based eligibility engine.

This module contains no model or LLM calls.
Given the same profile and rules, it always returns the same output.
"""
from __future__ import annotations

from typing import Any, Dict, List


def _to_number(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return int(value) != 0
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y"}:
            return True
        if lowered in {"false", "0", "no", "n"}:
            return False
    return None


def _ensure_list(value: Any) -> List[Any]:
    if isinstance(value, list):
        return value
    if value is None:
        return []
    return [value]


def _is_profile_missing(profile: Dict[str, Any], field: str) -> bool:
    return field not in profile or profile.get(field) is None


def _build_check(field: str, required: Any, user_value: Any, status: str, message: str) -> Dict[str, Any]:
    return {
        "field": field,
        "required": required,
        "user_value": user_value,
        "status": status,
        "message": message,
    }


def check_eligibility(profile: dict, rules: dict) -> dict:
    """Evaluate eligibility for a profile against a normalized rules dictionary.

    Supported rules:
    - age_min: profile["age"] >= rules["age_min"]
    - age_max: profile["age"] <= rules["age_max"]
    - annual_income_max: profile["annual_income"] <= rules["annual_income_max"]
    - occupation: profile["occupation"] in rules["occupation"] (list or string)
    - residence: exact string match
    - gender: exact string match
    - caste: profile["caste"] in rules["caste"] (list or string)
    - bpl: exact boolean match
    - state: rules["state"] == "All" OR exact match

    Notes:
    - Missing profile fields are skipped (they do not fail).
    - Empty rules return eligible=True with confidence_score=50.
    """
    profile = profile if isinstance(profile, dict) else {}
    rules = rules if isinstance(rules, dict) else {}

    if not rules:
        return {
            "eligible": True,
            "confidence_score": 50,
            "passed_checks": [],
            "failed_checks": [],
            "suggestion": "No eligibility rules were provided for this scheme.",
            "rules_evaluated": 0,
            "rules_passed": 0,
        }

    passed_checks: List[Dict[str, Any]] = []
    failed_checks: List[Dict[str, Any]] = []

    # 1) age_min
    if "age_min" in rules and not _is_profile_missing(profile, "age"):
        required_value = rules.get("age_min")
        user_value = profile.get("age")
        required_num = _to_number(required_value)
        user_num = _to_number(user_value)

        if required_num is None or user_num is None:
            failed_checks.append(
                _build_check(
                    field="age",
                    required=f">={required_value}",
                    user_value=user_value,
                    status="fail",
                    message="Age could not be validated against the minimum age requirement.",
                )
            )
        elif user_num >= required_num:
            passed_checks.append(
                _build_check(
                    field="age",
                    required=f">={int(required_num) if required_num.is_integer() else required_num}",
                    user_value=user_value,
                    status="pass",
                    message=f"Age {user_value} meets minimum age requirement ✓",
                )
            )
        else:
            failed_checks.append(
                _build_check(
                    field="age",
                    required=f">={int(required_num) if required_num.is_integer() else required_num}",
                    user_value=user_value,
                    status="fail",
                    message=f"Minimum age required is {int(required_num) if required_num.is_integer() else required_num}",
                )
            )

    # 2) age_max
    if "age_max" in rules and not _is_profile_missing(profile, "age"):
        required_value = rules.get("age_max")
        user_value = profile.get("age")
        required_num = _to_number(required_value)
        user_num = _to_number(user_value)

        if required_num is None or user_num is None:
            failed_checks.append(
                _build_check(
                    field="age",
                    required=f"<={required_value}",
                    user_value=user_value,
                    status="fail",
                    message="Age could not be validated against the maximum age requirement.",
                )
            )
        elif user_num <= required_num:
            passed_checks.append(
                _build_check(
                    field="age",
                    required=f"<={int(required_num) if required_num.is_integer() else required_num}",
                    user_value=user_value,
                    status="pass",
                    message=f"Age {user_value} is within maximum age limit ✓",
                )
            )
        else:
            failed_checks.append(
                _build_check(
                    field="age",
                    required=f"<={int(required_num) if required_num.is_integer() else required_num}",
                    user_value=user_value,
                    status="fail",
                    message=f"Maximum age allowed is {int(required_num) if required_num.is_integer() else required_num}",
                )
            )

    # 3) annual_income_max
    if "annual_income_max" in rules and not _is_profile_missing(profile, "annual_income"):
        required_value = rules.get("annual_income_max")
        user_value = profile.get("annual_income")
        required_num = _to_number(required_value)
        user_num = _to_number(user_value)

        if required_num is None or user_num is None:
            failed_checks.append(
                _build_check(
                    field="annual_income",
                    required=f"<={required_value}",
                    user_value=user_value,
                    status="fail",
                    message="Annual income could not be validated against the income limit.",
                )
            )
        elif user_num <= required_num:
            passed_checks.append(
                _build_check(
                    field="annual_income",
                    required=f"<={int(required_num) if required_num.is_integer() else required_num}",
                    user_value=user_value,
                    status="pass",
                    message=f"Annual income {user_value} is within allowed limit ✓",
                )
            )
        else:
            failed_checks.append(
                _build_check(
                    field="annual_income",
                    required=f"<={int(required_num) if required_num.is_integer() else required_num}",
                    user_value=user_value,
                    status="fail",
                    message=(
                        "Annual income exceeds allowed limit of "
                        f"{int(required_num) if required_num.is_integer() else required_num}"
                    ),
                )
            )

    # 4) occupation (list or string)
    if "occupation" in rules and not _is_profile_missing(profile, "occupation"):
        required_raw = rules.get("occupation")
        required_list = _ensure_list(required_raw)
        user_value = profile.get("occupation")

        if user_value in required_list:
            passed_checks.append(
                _build_check(
                    field="occupation",
                    required=required_raw,
                    user_value=user_value,
                    status="pass",
                    message=f"Occupation {user_value} matches scheme requirement ✓",
                )
            )
        else:
            if len(required_list) == 1:
                fail_message = f"This scheme is only for {required_list[0]} applicants"
            else:
                options = ", ".join(str(item) for item in required_list)
                fail_message = f"This scheme is only for these occupations: {options}"

            failed_checks.append(
                _build_check(
                    field="occupation",
                    required=required_raw,
                    user_value=user_value,
                    status="fail",
                    message=fail_message,
                )
            )

    # 5) residence (exact string match)
    if "residence" in rules and not _is_profile_missing(profile, "residence"):
        required_value = rules.get("residence")
        user_value = profile.get("residence")

        if user_value == required_value:
            passed_checks.append(
                _build_check(
                    field="residence",
                    required=required_value,
                    user_value=user_value,
                    status="pass",
                    message=f"Residence {user_value} matches scheme requirement ✓",
                )
            )
        else:
            failed_checks.append(
                _build_check(
                    field="residence",
                    required=required_value,
                    user_value=user_value,
                    status="fail",
                    message=f"This scheme is only for {required_value} residents",
                )
            )

    # 6) gender (exact string match)
    if "gender" in rules and not _is_profile_missing(profile, "gender"):
        required_value = rules.get("gender")
        user_value = profile.get("gender")

        if user_value == required_value:
            passed_checks.append(
                _build_check(
                    field="gender",
                    required=required_value,
                    user_value=user_value,
                    status="pass",
                    message=f"Gender {user_value} matches scheme requirement ✓",
                )
            )
        else:
            failed_checks.append(
                _build_check(
                    field="gender",
                    required=required_value,
                    user_value=user_value,
                    status="fail",
                    message=f"This scheme is only for {required_value} applicants",
                )
            )

    # 7) caste (list or string)
    if "caste" in rules and not _is_profile_missing(profile, "caste"):
        required_raw = rules.get("caste")
        required_list = _ensure_list(required_raw)
        user_value = profile.get("caste")

        if user_value in required_list:
            passed_checks.append(
                _build_check(
                    field="caste",
                    required=required_raw,
                    user_value=user_value,
                    status="pass",
                    message=f"Caste {user_value} matches scheme requirement ✓",
                )
            )
        else:
            if len(required_list) == 1:
                fail_message = f"This scheme is for {required_list[0]} category applicants"
            else:
                options = "/".join(str(item) for item in required_list)
                fail_message = f"This scheme is for {options} categories only"

            failed_checks.append(
                _build_check(
                    field="caste",
                    required=required_raw,
                    user_value=user_value,
                    status="fail",
                    message=fail_message,
                )
            )

    # 8) bpl (exact boolean match)
    if "bpl" in rules and not _is_profile_missing(profile, "bpl"):
        required_value = rules.get("bpl")
        user_value = profile.get("bpl")

        required_bool = _to_bool(required_value)
        user_bool = _to_bool(user_value)

        if required_bool is None or user_bool is None:
            is_match = user_value == required_value
            required_repr = required_value
        else:
            is_match = user_bool == required_bool
            required_repr = required_bool

        if is_match:
            passed_checks.append(
                _build_check(
                    field="bpl",
                    required=required_repr,
                    user_value=user_value,
                    status="pass",
                    message=f"BPL status {user_value} matches scheme requirement ✓",
                )
            )
        else:
            failed_checks.append(
                _build_check(
                    field="bpl",
                    required=required_repr,
                    user_value=user_value,
                    status="fail",
                    message=f"This scheme requires BPL status to be {required_repr}",
                )
            )

    # 9) state (All OR exact match)
    if "state" in rules:
        required_value = rules.get("state")

        if required_value == "All":
            passed_checks.append(
                _build_check(
                    field="state",
                    required="All",
                    user_value=profile.get("state"),
                    status="pass",
                    message="This scheme is available for all states ✓",
                )
            )
        elif not _is_profile_missing(profile, "state"):
            user_value = profile.get("state")
            if user_value == required_value:
                passed_checks.append(
                    _build_check(
                        field="state",
                        required=required_value,
                        user_value=user_value,
                        status="pass",
                        message=f"State {user_value} matches scheme requirement ✓",
                    )
                )
            else:
                failed_checks.append(
                    _build_check(
                        field="state",
                        required=required_value,
                        user_value=user_value,
                        status="fail",
                        message=f"This scheme is only for {required_value} residents",
                    )
                )

    rules_passed = len(passed_checks)
    rules_evaluated = rules_passed + len(failed_checks)
    eligible = len(failed_checks) == 0

    if rules_evaluated == 0:
        confidence_score = 50
    else:
        confidence_score = int(round((rules_passed / rules_evaluated) * 100))

    if failed_checks:
        suggestion = (
            f"You meet {rules_passed} of {rules_evaluated} conditions. "
            f"{failed_checks[0]['message']}"
        )
    elif rules_evaluated == 0:
        suggestion = "Profile fields needed for eligibility checks are missing."
    else:
        suggestion = f"You meet all {rules_evaluated} evaluated conditions."

    return {
        "eligible": eligible,
        "confidence_score": confidence_score,
        "passed_checks": passed_checks,
        "failed_checks": failed_checks,
        "suggestion": suggestion,
        "rules_evaluated": rules_evaluated,
        "rules_passed": rules_passed,
    }
