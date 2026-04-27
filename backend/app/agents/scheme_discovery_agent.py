"""SchemeDiscoveryAgent: Queries all active schemes and runs eligibility checks.

No LLM. Pure database + engine logic only.
"""
from __future__ import annotations

from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models.scheme import Scheme
from app.services.eligibility_engine import check_eligibility

import json


def _parse_rules(raw: Any) -> dict:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return {}
    return {}


class SchemeDiscoveryAgent:
    """Discovers eligible schemes for a given profile from the database."""

    TOP_N = 20

    def run(self, profile: dict, db: Session) -> dict:
        """
        Args:
            profile: Validated profile dict (output of ProfileAgent).
            db: SQLAlchemy session.

        Returns:
            {
                eligible: list[dict],        # top 20, sorted by confidence_score desc
                partial: list[dict],         # partially eligible
                not_eligible_count: int,
                total_schemes_checked: int,
            }
        """
        schemes: List[Scheme] = db.query(Scheme).filter(Scheme.is_active == 1).all()

        eligible: List[Dict[str, Any]] = []
        partial: List[Dict[str, Any]] = []
        not_eligible_count = 0

        for scheme in schemes:
            rules = _parse_rules(scheme.eligibility_rules)
            result = check_eligibility(profile, rules)

            entry = {
                "scheme_id": scheme.id,
                "scheme_code": scheme.scheme_code,
                "scheme_name": scheme.name_en,
                "sector": scheme.sector,
                "state": scheme.state,
                "benefit_type": scheme.benefit_type,
                "benefit_amount": scheme.benefit_amount,
                "official_portal_url": scheme.official_portal_url,
                "confidence_score": result["confidence_score"],
                "eligible": result["eligible"],
                "passed_checks": result["passed_checks"],
                "failed_checks": result["failed_checks"],
                "suggestion": result["suggestion"],
                "rules_evaluated": result["rules_evaluated"],
                "rules_passed": result["rules_passed"],
            }

            if result["eligible"]:
                eligible.append(entry)
            elif result["confidence_score"] > 0:
                partial.append(entry)
            else:
                not_eligible_count += 1

        # Sort by confidence_score descending
        eligible.sort(key=lambda x: x["confidence_score"], reverse=True)
        partial.sort(key=lambda x: x["confidence_score"], reverse=True)

        return {
            "eligible": eligible[: self.TOP_N],
            "partial": partial,
            "not_eligible_count": not_eligible_count,
            "total_schemes_checked": len(schemes),
        }
