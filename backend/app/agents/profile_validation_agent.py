"""Profile validation agent for eligibility readiness."""
from __future__ import annotations

from typing import Any, Dict, List


class ProfileValidationAgent:
    """Validate profile sufficiency and produce a confidence score."""

    CRITICAL_FIELDS = [
        "full_name",
        "age",
        "gender",
        "state",
        "annual_income",
        "caste_category",
        "has_bank_account",
    ]

    FIELD_SUGGESTIONS = {
        "full_name": "Confirm Aadhaar extraction so your name is verified.",
        "age": "Upload Aadhaar or senior-citizen card to confirm age.",
        "gender": "Upload Aadhaar to confirm gender.",
        "state": "Confirm address fields from Aadhaar or voter ID.",
        "annual_income": "Upload income certificate for accurate income filtering.",
        "caste_category": "Upload caste certificate if applicable.",
        "has_bank_account": "Answer the bank-account quick question for DBT schemes.",
    }

    @staticmethod
    def _is_filled(value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        return True

    def run(self, profile: Any, documents: List[Any] | None = None) -> Dict[str, Any]:
        documents = documents or []

        missing_critical_fields: List[str] = []
        filled_critical = 0
        for field in self.CRITICAL_FIELDS:
            if self._is_filled(getattr(profile, field, None)):
                filled_critical += 1
            else:
                missing_critical_fields.append(field)

        aadhaar_verified = int(getattr(profile, "aadhaar_verified", 0) or 0) == 1
        verified_docs_count = sum(1 for doc in documents if int(getattr(doc, "is_verified", 0) or 0) == 1)

        confidence = 0
        if aadhaar_verified:
            confidence += 35

        confidence += min(verified_docs_count * 8, 35)
        confidence += int((filled_critical / max(len(self.CRITICAL_FIELDS), 1)) * 30)
        confidence = min(confidence, 100)

        is_sufficient = confidence >= 30 and filled_critical >= 3

        suggestions = [
            self.FIELD_SUGGESTIONS.get(field, f"Add {field.replace('_', ' ')}")
            for field in missing_critical_fields
        ]

        if confidence < 30:
            message = "Your profile needs more information for accurate matching"
        elif confidence < 60:
            message = "We can run eligibility now, but adding more documents will improve accuracy"
        else:
            message = "Profile is sufficient for high-quality matching"

        return {
            "is_sufficient": is_sufficient,
            "confidence": confidence,
            "missing_critical_fields": missing_critical_fields,
            "suggestions": suggestions,
            "message": message,
        }
