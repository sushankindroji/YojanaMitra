"""Template-based explanation agent for scheme eligibility results."""
from __future__ import annotations

from typing import Any, Dict, List


class ExplanationAgent:
    """Generate human-readable explanations without LLM calls."""

    CONDITION_REASON_TEMPLATES = {
        "gender": lambda profile: f"you are {getattr(profile, 'gender', 'eligible gender')}",
        "state": lambda profile: f"you are in {getattr(profile, 'state', 'your state')}",
        "income_max": lambda profile: "your income is within the eligible limit",
        "age_min": lambda profile: f"your age ({getattr(profile, 'age', 'N/A')}) meets the minimum criterion",
        "age_max": lambda profile: f"your age ({getattr(profile, 'age', 'N/A')}) is within the upper age limit",
        "caste_category": lambda profile: "your social category matches this scheme",
        "is_farmer": lambda profile: "you are recognized as a farmer",
        "is_student": lambda profile: "you are identified as a student",
        "is_bpl": lambda profile: "your profile indicates BPL eligibility",
        "is_disabled": lambda profile: "your disability status matches the scheme requirement",
        "is_senior_citizen": lambda profile: "you qualify under senior citizen criteria",
        "is_minority": lambda profile: "you qualify under minority beneficiary criteria",
        "is_woman": lambda profile: "you qualify under women-focused criteria",
        "is_woman_headed_household": lambda profile: "your household is marked as woman-headed",
        "has_bank_account": lambda profile: "you have a bank account for direct benefit transfer",
        "land_area_min": lambda profile: "your land holding meets the minimum area",
        "land_area_max": lambda profile: "your land holding is within the allowed maximum",
        "education_min": lambda profile: "your education level meets the minimum requirement",
        "family_size_max": lambda profile: "your family size fits the scheme cap",
    }

    FAIL_REASON_TEMPLATES = {
        "gender": "this scheme has a gender-specific requirement",
        "state": "this scheme is limited to specific states",
        "income_max": "your income appears above the scheme limit",
        "age_min": "the minimum age condition is not met",
        "age_max": "the maximum age condition is exceeded",
        "caste_category": "the scheme is reserved for another social category",
        "is_farmer": "the scheme is intended for farmers",
        "is_student": "the scheme is intended for students",
        "is_bpl": "the scheme is meant for BPL households",
        "is_disabled": "a qualifying disability certificate is required",
        "is_senior_citizen": "the scheme targets senior citizens",
        "is_minority": "the scheme targets minority communities",
        "is_woman": "the scheme is targeted to women beneficiaries",
        "is_woman_headed_household": "the scheme requires woman-headed household status",
        "has_bank_account": "an active bank account is required",
        "land_area_min": "minimum land area is not met",
        "land_area_max": "your land area exceeds the scheme limit",
        "education_min": "minimum education requirement is not met",
        "family_size_max": "family size exceeds the allowed limit",
    }

    QUALIFY_ACTIONS = {
        "is_disabled": "upload a disability certificate showing eligible disability percentage",
        "caste_category": "upload a caste certificate to validate your social category",
        "is_bpl": "upload your ration/BPL card to confirm poverty status",
        "income_max": "upload an income certificate to confirm annual household income",
        "has_bank_account": "add bank account and IFSC details for direct benefit transfer",
        "is_farmer": "add land or farmer registration details to verify farming status",
        "is_student": "upload education certificates to establish student eligibility",
        "state": "ensure your state and district details are accurate from Aadhaar",
        "education_min": "add education details or upload marksheets/degree certificate",
    }

    def generate_why_eligible(self, scheme: Dict[str, Any], profile: Any, matched_conditions: List[str]) -> str:
        reasons: List[str] = []
        for condition in matched_conditions:
            formatter = self.CONDITION_REASON_TEMPLATES.get(condition)
            if not formatter:
                continue
            try:
                reasons.append(formatter(profile))
            except Exception:
                continue

        if not reasons:
            return "You qualify because your profile satisfies this scheme's current eligibility checks."

        if len(reasons) == 1:
            return f"You qualify because {reasons[0]}."

        return "You qualify because " + ", and ".join(reasons[:4]) + "."

    def generate_why_not_eligible(self, failed_conditions: List[str]) -> str:
        if not failed_conditions:
            return "No blocking eligibility condition was detected."

        reasons = [self.FAIL_REASON_TEMPLATES.get(condition, f"{condition.replace('_', ' ')} requirement is not met") for condition in failed_conditions]

        if len(reasons) == 1:
            return f"You don't fully qualify because {reasons[0]}."

        return "You don't fully qualify because " + "; and ".join(reasons[:3]) + "."

    def generate_how_to_qualify(self, failed_conditions: List[str], missing_fields: List[str]) -> str:
        actions: List[str] = []
        for condition in failed_conditions:
            suggestion = self.QUALIFY_ACTIONS.get(condition)
            if suggestion and suggestion not in actions:
                actions.append(suggestion)

        for missing_field in missing_fields:
            normalized = str(missing_field or "").strip().lower().replace(" ", "_")
            suggestion = self.QUALIFY_ACTIONS.get(normalized)
            if suggestion and suggestion not in actions:
                actions.append(suggestion)

        if not actions:
            return "Update your profile and upload supporting documents, then run eligibility check again."

        if len(actions) == 1:
            return f"To qualify, {actions[0]}."

        return "To improve eligibility: " + "; ".join(actions[:3]) + "."

    @staticmethod
    def generate_benefit_summary(scheme: Dict[str, Any]) -> str:
        amount = float(scheme.get("benefit_amount", 0) or 0)
        benefit_type = scheme.get("benefit_type") or "benefit"
        frequency = scheme.get("benefit_frequency") or "as per scheme guidelines"

        if amount > 0:
            amount_text = f"Rs {amount:,.0f}"
            return f"{amount_text} ({benefit_type}) provided {frequency}."

        return f"Benefit type: {benefit_type}; disbursement: {frequency}."

    @staticmethod
    def generate_next_action(scheme: Dict[str, Any]) -> str:
        portal = scheme.get("official_portal_url")
        mode = str(scheme.get("application_mode") or "").strip().lower()

        if portal:
            return f"Apply online at {portal}"
        if mode == "offline":
            return "Visit your nearest CSC or district welfare office to apply offline"
        return "Open scheme details and follow the listed application steps"

    def run(self, schemes: List[Dict[str, Any]], profile: Any) -> List[Dict[str, Any]]:
        explained: List[Dict[str, Any]] = []
        for scheme in schemes:
            matched_conditions = list(scheme.get("matched_conditions", []))
            failed_conditions = list(scheme.get("failed_conditions", []))
            missing_fields = list(scheme.get("missing_data_for_full_check", []))

            explained.append(
                {
                    **scheme,
                    "why_eligible": self.generate_why_eligible(scheme, profile, matched_conditions),
                    "why_not_eligible": self.generate_why_not_eligible(failed_conditions),
                    "how_to_qualify": self.generate_how_to_qualify(failed_conditions, missing_fields),
                    "benefit_summary": self.generate_benefit_summary(scheme),
                    "next_action": self.generate_next_action(scheme),
                }
            )

        return explained
