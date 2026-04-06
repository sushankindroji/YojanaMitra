"""Personalization agent to build user-specific dashboard payloads."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from app.services.profile_completeness import calculate_profile_completeness


FIELD_TO_DOC_HINT = {
    "disability_percentage": "disability_certificate",
    "caste_category": "caste_certificate",
    "annual_income": "income_certificate",
    "education_level": "education_details",
    "land_area_acres": "land_records",
    "has_bank_account": "bank_passbook",
}


class PersonalizationAgent:
    """Create dashboard payload that is unique to each user profile."""

    @staticmethod
    def _first_name(profile: Any) -> str:
        full_name = str(getattr(profile, "full_name", "") or "").strip()
        if not full_name:
            return ""
        return full_name.split()[0]

    @staticmethod
    def _build_sector_breakdown(results: List[Dict[str, Any]]) -> Dict[str, int]:
        sector_counts: Dict[str, int] = {}
        for item in results:
            sector = str(item.get("sector") or "").strip()
            if not sector:
                continue
            sector_counts[sector] = sector_counts.get(sector, 0) + 1
        return dict(sorted(sector_counts.items(), key=lambda kv: kv[1], reverse=True)[:8])

    @staticmethod
    def _unlock_message(raw_results: List[Dict[str, Any]], missing_fields: List[str]) -> str:
        if not missing_fields:
            return "Your profile is complete. Re-run eligibility to refresh recommendations."

        field_unlocks: Dict[str, int] = {}
        for result in raw_results:
            if result.get("is_eligible"):
                continue
            for missing in result.get("missing_data_for_full_check", []):
                field_unlocks[missing] = field_unlocks.get(missing, 0) + 1

        if not field_unlocks:
            return "Add more documents to improve match confidence and unlock additional schemes."

        best_field = max(field_unlocks, key=field_unlocks.get)
        unlock_count = field_unlocks[best_field]
        hint = FIELD_TO_DOC_HINT.get(best_field, best_field)
        pretty_hint = hint.replace("_", " ")
        return f"Add {pretty_hint} to unlock about {unlock_count} more schemes"

    def run(
        self,
        profile: Any,
        ranked: Dict[str, Any],
        explained_top_results: List[Dict[str, Any]],
        raw_results: List[Dict[str, Any]],
        applied_count: int,
        last_checked: str | None = None,
    ) -> Dict[str, Any]:
        greeting_name = self._first_name(profile)

        fully_eligible = ranked.get("fully_eligible", [])
        highly_eligible = ranked.get("highly_eligible", [])
        partially_eligible = ranked.get("partially_eligible", [])
        one_step_away = ranked.get("one_step_away", [])

        total_eligible_count = len(fully_eligible) + len(highly_eligible)

        top_scheme = explained_top_results[0] if explained_top_results else None
        top_scheme_payload = (
            {
                "name": top_scheme.get("scheme_name"),
                "benefit": float(top_scheme.get("benefit_amount", 0) or 0),
                "match_score": float(top_scheme.get("match_score", 0) or 0),
            }
            if top_scheme
            else None
        )

        completeness_pct, missing_fields, _, _ = calculate_profile_completeness(profile)
        missing_field_keys = [field.lower().replace(" ", "_") for field in missing_fields]

        profile_message = self._unlock_message(raw_results, missing_field_keys)

        if total_eligible_count > 0 and top_scheme:
            highlight = (
                f"{top_scheme.get('scheme_name', 'Top scheme')} gives "
                f"Rs {float(top_scheme.get('benefit_amount', 0) or 0):,.0f} and you qualify"
            )
        else:
            highlight = "Complete your profile to unlock more accurate scheme matches"

        top_3 = explained_top_results[:3]

        sector_source = fully_eligible + highly_eligible + partially_eligible
        sector_breakdown = self._build_sector_breakdown(sector_source)

        payload = {
            "greeting_name": greeting_name,
            "total_eligible_count": total_eligible_count,
            "top_benefit_amount": float(ranked.get("top_benefit_amount", 0) or 0),
            "top_scheme": top_scheme_payload,
            "scheme_insight": {
                "headline": f"{total_eligible_count} schemes are fully or highly matched",
                "highlight": highlight,
                "action_label": "View all eligible schemes",
            },
            "profile_completeness": {
                "pct": completeness_pct,
                "missing_fields": missing_fields,
                "message": profile_message,
            },
            "quick_stats": {
                "eligible": total_eligible_count,
                "fully_eligible": len(fully_eligible),
                "highly_eligible": len(highly_eligible),
                "partially_eligible": len(partially_eligible),
                "applied": int(applied_count),
                "one_step_away": len(one_step_away),
            },
            "featured_schemes": top_3,
            "sector_breakdown": sector_breakdown,
            "last_checked": last_checked or datetime.utcnow().isoformat(),
        }

        return payload
