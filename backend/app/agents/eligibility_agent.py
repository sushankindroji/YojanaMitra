"""
Eligibility Agent - rule-based scheme eligibility checker.
"""
import json
from sqlalchemy.orm import Session
from app.models import Scheme, EligibilityResult, Profile
from app.database import SessionLocal
import uuid
from datetime import datetime


class EligibilityAgent:
    """Check user eligibility against schemes using rule-based logic."""

    OPERATORS = {
        "less_than": lambda a, b: a < b,
        "greater_than": lambda a, b: a > b,
        "less_than_or_equal": lambda a, b: a <= b,
        "greater_than_or_equal": lambda a, b: a >= b,
        "between": lambda a, b: b[0] <= a <= b[1],
        "equals": lambda a, b: a == b,
        "not_equals": lambda a, b: a != b,
        "in": lambda a, b: a in b,
        "not_in": lambda a, b: a not in b,
        "is_true": lambda a, b: bool(a),
        "is_false": lambda a, b: not bool(a),
        "exists": lambda a, b: a is not None,
    }

    def __init__(self, db: Session):
        self.db = db

    async def check_all_schemes(self, user_id: str) -> list:
        """Check eligibility against all active schemes."""
        profile = self.db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            return []

        schemes = self.db.query(Scheme).filter(Scheme.is_active == 1).all()
        results = []

        for scheme in schemes:
            result = self.check_scheme(profile, scheme)
            self.db.add(result)
            results.append(result)

        self.db.commit()
        return results

    def check_scheme(self, profile: Profile, scheme: Scheme) -> EligibilityResult:
        """Check if user satisfies all conditions for a scheme."""
        rules = json.loads(scheme.eligibility_rules or '{"conditions": []}')
        conditions = rules.get("conditions", [])

        condition_results = []
        mandatory_passed = 0
        total_mandatory = 0
        total_passed = 0

        for condition in conditions:
            field_value = getattr(profile, condition["field"], None)
            operator = condition.get("operator", "equals")
            required_value = condition.get("value")
            is_mandatory = condition.get("is_mandatory", False)

            if is_mandatory:
                total_mandatory += 1

            # Check condition
            try:
                op_fn = self.OPERATORS.get(operator)
                if field_value is None:
                    passed = False
                    status = "MISSING_DATA"
                else:
                    passed = op_fn(field_value, required_value)
                    status = "PASS" if passed else "FAIL"
            except:
                passed = False
                status = "ERROR"

            if passed:
                total_passed += 1
                if is_mandatory:
                    mandatory_passed += 1

            condition_results.append({
                "field": condition["field"],
                "status": status,
                "label_en": condition.get("label_en", ""),
                "user_value": field_value,
                "required_value": required_value,
                "operator": operator,
                "is_mandatory": is_mandatory,
            })

        # Calculate eligibility
        eligibility_score = (total_passed / max(len(conditions), 1)) * 100 if conditions else 0
        is_eligible = mandatory_passed == total_mandatory if total_mandatory > 0 else eligibility_score >= 100
        is_partially_eligible = not is_eligible and eligibility_score >= 50

        return EligibilityResult(
            id=str(uuid.uuid4()),
            user_id=profile.user_id,
            scheme_id=scheme.id,
            is_eligible=1 if is_eligible else 0,
            is_partially_eligible=1 if is_partially_eligible else 0,
            eligibility_score=round(eligibility_score, 2),
            mandatory_pass=1 if is_eligible else 0,
            condition_results=json.dumps(condition_results),
            explanation_en=f"You {'qualify' if is_eligible else 'may qualify' if is_partially_eligible else 'do not qualify'} for this scheme.",
            computed_at=datetime.utcnow().isoformat(),
        )
