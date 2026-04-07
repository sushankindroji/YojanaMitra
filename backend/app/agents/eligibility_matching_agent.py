"""Eligibility matching agent for scheme-profile evaluation."""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Dict, List, Tuple


EDUCATION_RANK = {
    "illiterate": 0,
    "primary": 1,
    "middle": 2,
    "8th": 2,
    "10th": 3,
    "10th pass": 3,
    "matric": 3,
    "12th": 4,
    "12th pass": 4,
    "intermediate": 4,
    "diploma": 5,
    "graduate": 6,
    "postgraduate": 7,
    "post-graduate": 7,
    "phd": 8,
}


class EligibilityMatchingAgent:
    """Match all schemes against one profile using normalized eligibility rules."""

    def __init__(self):
        self.rule_missing_field_map = {
            "age_min": "age",
            "age_max": "age",
            "gender": "gender",
            "income_max": "annual_income",
            "state": "state",
            "caste_category": "caste_category",
            "is_farmer": "occupation",
            "is_student": "occupation",
            "is_bpl": "bpl_status",
            "is_disabled": "disability_percentage",
            "is_senior_citizen": "age",
            "is_minority": "minority_status",
            "is_woman": "gender",
            "is_woman_headed_household": "is_woman_headed_household",
            "has_bank_account": "has_bank_account",
            "land_area_min": "land_area_acres",
            "land_area_max": "land_area_acres",
            "education_min": "education_level",
            "family_size_max": "family_size",
        }

    @staticmethod
    def _normalize_text(value: Any) -> str:
        return str(value or "").strip().lower()

    @staticmethod
    def _parse_json(raw_value: Any) -> Any:
        if raw_value is None:
            return {}
        if isinstance(raw_value, (dict, list)):
            return raw_value
        try:
            return json.loads(raw_value)
        except Exception:
            return {}

    @staticmethod
    def _to_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return int(value) == 1
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "y"}
        return False

    def _profile_known_bool(self, profile: Any, primary_field: str, fallback_field: str | None = None) -> Tuple[bool | None, bool]:
        value = getattr(profile, primary_field, None)
        if value is None and fallback_field:
            value = getattr(profile, fallback_field, None)

        if value is None:
            return None, False

        int_value = int(value) if isinstance(value, (bool, int, float)) else None
        if int_value is None:
            return self._to_bool(value), True

        if int_value == 1:
            return True, True

        # Zero values are treated as known for users who completed quick-question step.
        onboarding_step = int(getattr(profile, "onboarding_step", 1) or 1)
        if onboarding_step >= 4:
            return False, True

        return None, False

    def _profile_age(self, profile: Any) -> Tuple[int | None, bool]:
        age = getattr(profile, "age", None)
        if age is None:
            dob = getattr(profile, "dob", None)
            if dob and isinstance(dob, str):
                try:
                    dob_date = datetime.strptime(dob, "%Y-%m-%d")
                    today = datetime.utcnow()
                    age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
                except Exception:
                    age = None
        if age is None:
            return None, False
        try:
            age_int = int(age)
        except Exception:
            return None, False
        return age_int, True

    def _profile_caste(self, profile: Any) -> Tuple[str | None, bool]:
        caste = getattr(profile, "caste_category", None) or getattr(profile, "social_category", None)
        caste = self._normalize_text(caste)
        if not caste:
            return None, False
        return caste, True

    def _profile_income(self, profile: Any) -> Tuple[float | None, bool]:
        value = getattr(profile, "annual_income", None)
        if value is None:
            return None, False
        try:
            return float(value), True
        except Exception:
            return None, False

    def _profile_state(self, profile: Any) -> Tuple[str | None, bool]:
        state = self._normalize_text(getattr(profile, "state", None))
        if not state:
            return None, False
        return state, True

    def _profile_gender(self, profile: Any) -> Tuple[str | None, bool]:
        gender = self._normalize_text(getattr(profile, "gender", None))
        if not gender:
            return None, False
        return gender, True

    def _profile_land_area(self, profile: Any) -> Tuple[float | None, bool]:
        value = getattr(profile, "land_area_acres", None)
        if value is None:
            value = getattr(profile, "land_holding_acres", None)
        if value is None:
            return None, False
        try:
            return float(value), True
        except Exception:
            return None, False

    def _profile_family_size(self, profile: Any) -> Tuple[int | None, bool]:
        value = getattr(profile, "family_size", None)
        if value is None:
            return None, False
        try:
            return int(value), True
        except Exception:
            return None, False

    def _profile_education(self, profile: Any) -> Tuple[str | None, bool]:
        value = self._normalize_text(getattr(profile, "education_level", None))
        if not value:
            return None, False
        return value, True

    def _profile_is_farmer(self, profile: Any) -> Tuple[bool | None, bool]:
        known_bool, known = self._profile_known_bool(profile, "is_farmer")
        if known and known_bool is not None:
            return known_bool, True

        occupation = self._normalize_text(getattr(profile, "occupation", None))
        land_area, has_land = self._profile_land_area(profile)
        if occupation:
            return ("farmer" in occupation or "agri" in occupation), True
        if has_land:
            return (land_area or 0) > 0, True
        return None, False

    def _profile_is_student(self, profile: Any) -> Tuple[bool | None, bool]:
        known_bool, known = self._profile_known_bool(profile, "is_student")
        if known and known_bool is not None:
            return known_bool, True

        occupation = self._normalize_text(getattr(profile, "occupation", None))
        if occupation:
            return ("student" in occupation), True

        education = self._normalize_text(getattr(profile, "education_level", None))
        if education:
            return True, True
        return None, False

    def _profile_is_disabled(self, profile: Any) -> Tuple[bool | None, bool]:
        percentage = getattr(profile, "disability_percentage", None)
        if percentage is None:
            percentage = getattr(profile, "disability_pct", None)

        if percentage is not None:
            try:
                return int(percentage) > 0, True
            except Exception:
                pass

        known_bool, known = self._profile_known_bool(profile, "has_disability")
        if known and known_bool is not None:
            return known_bool, True
        return None, False

    def _profile_is_senior(self, profile: Any) -> Tuple[bool | None, bool]:
        age, has_age = self._profile_age(profile)
        if has_age:
            return age >= 60, True

        known_bool, known = self._profile_known_bool(profile, "is_senior_citizen")
        if known and known_bool is not None:
            return known_bool, True
        return None, False

    def _profile_is_minority(self, profile: Any) -> Tuple[bool | None, bool]:
        known_bool, known = self._profile_known_bool(profile, "minority_status", fallback_field="is_minority")
        if known and known_bool is not None:
            return known_bool, True

        religion = self._normalize_text(getattr(profile, "religion", None))
        if religion:
            return religion in {"muslim", "christian", "sikh", "buddhist", "jain", "parsi"}, True

        return None, False

    @staticmethod
    def _parse_rule_value(value: Any) -> Any:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.isdigit():
                return int(stripped)
            try:
                return float(stripped.replace(",", ""))
            except Exception:
                return stripped
        return value

    def _normalize_rules(self, scheme: Any) -> Dict[str, Any]:
        payload = self._parse_json(getattr(scheme, "eligibility_rules", None))
        rules: Dict[str, Any] = {}

        source = payload.get("eligibility", payload) if isinstance(payload, dict) else payload

        if isinstance(source, dict):
            aliases = {
                "age_min": ["age_min", "min_age", "minimum_age"],
                "age_max": ["age_max", "max_age", "maximum_age"],
                "gender": ["gender", "sex", "target_gender"],
                "income_max": ["income_max", "max_income", "annual_income_max", "income_limit"],
                "state": ["state", "states", "eligible_state"],
                "caste_category": ["caste_category", "social_category", "category"],
                "is_farmer": ["is_farmer", "farmer"],
                "is_student": ["is_student", "student"],
                "is_bpl": ["is_bpl", "bpl_status", "bpl"],
                "is_disabled": ["is_disabled", "disabled", "disability_required"],
                "is_senior_citizen": ["is_senior_citizen", "senior_citizen"],
                "is_minority": ["is_minority", "minority"],
                "is_woman": ["is_woman", "female_only", "women_only"],
                "is_woman_headed_household": ["is_woman_headed_household", "woman_headed_household"],
                "has_bank_account": ["has_bank_account", "bank_account_required", "bank_linked"],
                "land_area_min": ["land_area_min", "min_land_area"],
                "land_area_max": ["land_area_max", "max_land_area"],
                "education_min": ["education_min", "minimum_education"],
                "family_size_max": ["family_size_max", "max_family_size"],
            }

            for target_key, source_keys in aliases.items():
                for source_key in source_keys:
                    if source_key in source:
                        rules[target_key] = self._parse_rule_value(source[source_key])
                        break

            # Convert generic condition blocks when present.
            conditions = source.get("conditions")
            if isinstance(conditions, list):
                for condition in conditions:
                    field = self._normalize_text(condition.get("field"))
                    operator = self._normalize_text(condition.get("operator") or "equals")
                    value = self._parse_rule_value(condition.get("value"))

                    if field in {"age", "age_min", "min_age"} and operator in {"greater_than_or_equal", ">=", "gte"}:
                        rules.setdefault("age_min", value)
                    elif field in {"age", "age_max", "max_age"} and operator in {"less_than_or_equal", "<=", "lte"}:
                        rules.setdefault("age_max", value)
                    elif field in {"gender", "sex"}:
                        rules.setdefault("gender", value)
                    elif field in {"annual_income", "income"} and operator in {"less_than_or_equal", "<=", "lte"}:
                        rules.setdefault("income_max", value)
                    elif field in {"state"}:
                        rules.setdefault("state", value)
                    elif field in {"social_category", "caste_category", "category"}:
                        rules.setdefault("caste_category", value)
                    elif field in {"is_farmer", "farmer"}:
                        rules.setdefault("is_farmer", self._to_bool(value))
                    elif field in {"is_student", "student"}:
                        rules.setdefault("is_student", self._to_bool(value))
                    elif field in {"is_bpl", "bpl_status", "bpl"}:
                        rules.setdefault("is_bpl", self._to_bool(value))
                    elif field in {"is_disabled", "disabled"}:
                        rules.setdefault("is_disabled", self._to_bool(value))
                    elif field in {"is_senior_citizen", "senior_citizen"}:
                        rules.setdefault("is_senior_citizen", self._to_bool(value))
                    elif field in {"is_minority", "minority"}:
                        rules.setdefault("is_minority", self._to_bool(value))
                    elif field in {"is_woman", "female", "female_only"}:
                        rules.setdefault("is_woman", self._to_bool(value) if isinstance(value, (int, bool)) else str(value))
                    elif field in {"is_woman_headed_household", "woman_headed_household"}:
                        rules.setdefault("is_woman_headed_household", self._to_bool(value))
                    elif field in {"has_bank_account", "bank_account_required"}:
                        rules.setdefault("has_bank_account", self._to_bool(value))
                    elif field in {"land_area", "land_area_acres", "land_holding_acres"} and operator in {"greater_than_or_equal", ">=", "gte"}:
                        rules.setdefault("land_area_min", value)
                    elif field in {"land_area", "land_area_acres", "land_holding_acres"} and operator in {"less_than_or_equal", "<=", "lte"}:
                        rules.setdefault("land_area_max", value)
                    elif field in {"education", "education_level"}:
                        rules.setdefault("education_min", value)
                    elif field in {"family_size", "members"} and operator in {"less_than_or_equal", "<=", "lte"}:
                        rules.setdefault("family_size_max", value)

        # State is often encoded directly on scheme.
        scheme_state = self._normalize_text(getattr(scheme, "state", None))
        if scheme_state and scheme_state != "central" and "state" not in rules:
            rules["state"] = getattr(scheme, "state", None)

        # Heuristic fallback for sparse/empty rules.
        if not rules:
            sector = self._normalize_text(getattr(scheme, "sector", None))
            description = self._normalize_text(getattr(scheme, "description_en", None))
            haystack = f"{sector} {description}"
            if any(token in haystack for token in ["agri", "farmer", "crop", "kisan"]):
                rules["is_farmer"] = True
            if any(token in haystack for token in ["student", "education", "scholarship"]):
                rules["is_student"] = True
            if any(token in haystack for token in ["women", "female", "girl"]):
                rules["is_woman"] = True
            if any(token in haystack for token in ["senior", "elderly", "pension"]):
                rules["is_senior_citizen"] = True
            if any(token in haystack for token in ["disabled", "disability", "divyang"]):
                rules["is_disabled"] = True
            if any(token in haystack for token in ["bpl", "poor", "antyodaya"]):
                rules["is_bpl"] = True
            if any(token in haystack for token in ["minority"]):
                rules["is_minority"] = True

        return rules

    def _evaluate_rule(self, rule_key: str, rule_value: Any, profile: Any) -> Tuple[str, str]:
        """Return (status, detail) where status in matched/failed/unknown."""
        # age range rules
        if rule_key in {"age_min", "age_max"}:
            age, known = self._profile_age(profile)
            if not known:
                return "unknown", "age"
            try:
                value = int(float(rule_value))
            except Exception:
                return "unknown", "age"

            if rule_key == "age_min":
                return ("matched", "age_min") if age >= value else ("failed", "age_min")
            return ("matched", "age_max") if age <= value else ("failed", "age_max")

        if rule_key == "gender":
            gender, known = self._profile_gender(profile)
            if not known:
                return "unknown", "gender"

            expected = self._normalize_text(rule_value)
            if not expected or expected in {"all", "any", "both"}:
                return "matched", "gender"
            if "/" in expected or "," in expected:
                options = [item.strip() for item in re.split(r"[/,]", expected) if item.strip()]
                return ("matched", "gender") if gender in options else ("failed", "gender")
            return ("matched", "gender") if gender == expected else ("failed", "gender")

        if rule_key == "income_max":
            income, known = self._profile_income(profile)
            if not known:
                return "unknown", "annual_income"
            try:
                expected = float(rule_value)
            except Exception:
                return "unknown", "annual_income"
            return ("matched", "income_max") if income <= expected else ("failed", "income_max")

        if rule_key == "state":
            state, known = self._profile_state(profile)
            if not known:
                return "unknown", "state"

            expected_raw = rule_value
            if isinstance(expected_raw, list):
                options = [self._normalize_text(v) for v in expected_raw]
            else:
                expected = self._normalize_text(expected_raw)
                options = [item.strip() for item in re.split(r"[/,]", expected) if item.strip()] if expected else []

            if not options or "central" in options or "all" in options:
                return "matched", "state"

            return ("matched", "state") if state in options else ("failed", "state")

        if rule_key == "caste_category":
            caste, known = self._profile_caste(profile)
            if not known:
                return "unknown", "caste_category"

            expected = rule_value
            if isinstance(expected, list):
                options = [self._normalize_text(v) for v in expected]
            else:
                options = [item.strip() for item in re.split(r"[/,]", self._normalize_text(expected)) if item.strip()]

            if not options or "all" in options:
                return "matched", "caste_category"
            return ("matched", "caste_category") if caste in options else ("failed", "caste_category")

        if rule_key == "is_farmer":
            value, known = self._profile_is_farmer(profile)
            if not known:
                return "unknown", "is_farmer"
            required = True if rule_value is None else self._to_bool(rule_value)
            return ("matched", "is_farmer") if value == required or (required and value) else ("failed", "is_farmer")

        if rule_key == "is_student":
            value, known = self._profile_is_student(profile)
            if not known:
                return "unknown", "is_student"
            required = True if rule_value is None else self._to_bool(rule_value)
            return ("matched", "is_student") if value == required or (required and value) else ("failed", "is_student")

        if rule_key == "is_bpl":
            value, known = self._profile_known_bool(profile, "bpl_status", fallback_field="is_bpl")
            if not known:
                return "unknown", "bpl_status"
            required = True if rule_value is None else self._to_bool(rule_value)
            return ("matched", "is_bpl") if value == required or (required and value) else ("failed", "is_bpl")

        if rule_key == "is_disabled":
            value, known = self._profile_is_disabled(profile)
            if not known:
                return "unknown", "is_disabled"
            required = True if rule_value is None else self._to_bool(rule_value)
            return ("matched", "is_disabled") if value == required or (required and value) else ("failed", "is_disabled")

        if rule_key == "is_senior_citizen":
            value, known = self._profile_is_senior(profile)
            if not known:
                return "unknown", "is_senior_citizen"
            required = True if rule_value is None else self._to_bool(rule_value)
            return ("matched", "is_senior_citizen") if value == required or (required and value) else ("failed", "is_senior_citizen")

        if rule_key == "is_minority":
            value, known = self._profile_is_minority(profile)
            if not known:
                return "unknown", "is_minority"
            required = True if rule_value is None else self._to_bool(rule_value)
            return ("matched", "is_minority") if value == required or (required and value) else ("failed", "is_minority")

        if rule_key == "is_woman":
            gender, known = self._profile_gender(profile)
            if not known:
                return "unknown", "gender"
            return ("matched", "is_woman") if gender == "female" else ("failed", "is_woman")

        if rule_key == "is_woman_headed_household":
            value, known = self._profile_known_bool(profile, "is_woman_headed_household", fallback_field="is_woman_headed")
            if not known:
                return "unknown", "is_woman_headed_household"
            required = True if rule_value is None else self._to_bool(rule_value)
            return ("matched", "is_woman_headed_household") if value == required or (required and value) else ("failed", "is_woman_headed_household")

        if rule_key == "has_bank_account":
            value, known = self._profile_known_bool(profile, "has_bank_account", fallback_field="bank_account_linked")
            if not known:
                return "unknown", "has_bank_account"
            required = True if rule_value is None else self._to_bool(rule_value)
            return ("matched", "has_bank_account") if value == required or (required and value) else ("failed", "has_bank_account")

        if rule_key in {"land_area_min", "land_area_max"}:
            area, known = self._profile_land_area(profile)
            if not known:
                return "unknown", "land_area_acres"
            try:
                expected = float(rule_value)
            except Exception:
                return "unknown", "land_area_acres"
            if rule_key == "land_area_min":
                return ("matched", "land_area_min") if area >= expected else ("failed", "land_area_min")
            return ("matched", "land_area_max") if area <= expected else ("failed", "land_area_max")

        if rule_key == "education_min":
            education, known = self._profile_education(profile)
            if not known:
                return "unknown", "education_level"

            expected = self._normalize_text(rule_value)
            profile_rank = EDUCATION_RANK.get(education, 0)
            expected_rank = EDUCATION_RANK.get(expected, 0)
            return ("matched", "education_min") if profile_rank >= expected_rank else ("failed", "education_min")

        if rule_key == "family_size_max":
            family_size, known = self._profile_family_size(profile)
            if not known:
                return "unknown", "family_size"
            try:
                expected = int(float(rule_value))
            except Exception:
                return "unknown", "family_size"
            return ("matched", "family_size_max") if family_size <= expected else ("failed", "family_size_max")

        return "unknown", self.rule_missing_field_map.get(rule_key, rule_key)

    def evaluate_scheme(self, profile: Any, scheme: Any) -> Dict[str, Any]:
        rules = self._normalize_rules(scheme)

        matched_conditions: List[str] = []
        failed_conditions: List[str] = []
        unknown_conditions: List[str] = []

        for rule_key, rule_value in rules.items():
            status, detail = self._evaluate_rule(rule_key, rule_value, profile)
            if status == "matched":
                matched_conditions.append(rule_key)
            elif status == "failed":
                failed_conditions.append(rule_key)
            else:
                unknown_conditions.append(rule_key)

        mandatory_missing_docs: List[str] = []
        aadhaar_verified = int(getattr(profile, "aadhaar_verified", 0) or 0) == 1
        annual_income_known = getattr(profile, "annual_income", None) is not None

        if not aadhaar_verified:
            mandatory_missing_docs.append("aadhaar")
        if not annual_income_known:
            mandatory_missing_docs.append("income_certificate")

        total = len(matched_conditions) + len(failed_conditions) + len(unknown_conditions)
        if total == 0:
            match_score = 0.0
        else:
            match_score = (len(matched_conditions) + 0.25 * len(unknown_conditions)) / total

        if mandatory_missing_docs:
            match_score = min(match_score, 0.35 if len(mandatory_missing_docs) == 1 else 0.2)

        match_score = round(float(min(max(match_score, 0.0), 1.0)), 4)

        is_eligible = len(failed_conditions) == 0 and len(unknown_conditions) == 0 and total > 0
        is_partially_eligible = (not is_eligible) and (
            match_score >= 0.4 or (len(failed_conditions) <= 1 and len(matched_conditions) > 0)
        )

        if mandatory_missing_docs:
            is_eligible = False
            is_partially_eligible = is_partially_eligible or bool(matched_conditions)

        missing_data_for_full_check = sorted(
            {
                self.rule_missing_field_map.get(rule_key, rule_key)
                for rule_key in unknown_conditions
            }
        )
        missing_data_for_full_check = sorted(set(missing_data_for_full_check + mandatory_missing_docs))

        return {
            "scheme_id": str(getattr(scheme, "id", "")),
            "scheme_code": getattr(scheme, "scheme_code", ""),
            "scheme_name": getattr(scheme, "name_en", ""),
            "is_eligible": bool(is_eligible),
            "is_partially_eligible": bool(is_partially_eligible),
            "match_score": match_score,
            "matched_conditions": matched_conditions,
            "failed_conditions": failed_conditions,
            "unknown_conditions": unknown_conditions,
            "missing_data_for_full_check": missing_data_for_full_check,
            "benefit_amount": float(getattr(scheme, "benefit_amount", 0) or 0),
            "benefit_type": getattr(scheme, "benefit_type", None),
            "benefit_frequency": getattr(scheme, "benefit_frequency", None),
            "sector": getattr(scheme, "sector", None),
            "state": getattr(scheme, "state", None),
            "official_portal_url": getattr(scheme, "official_portal_url", None),
            "application_mode": getattr(scheme, "application_mode", None),
            "description_en": getattr(scheme, "description_en", None),
            "created_at": getattr(scheme, "created_at", None),
            "normalized_rules": rules,
        }

    async def run(self, profile: Any, schemes: List[Any]) -> List[Dict[str, Any]]:
        return [self.evaluate_scheme(profile, scheme) for scheme in schemes]
