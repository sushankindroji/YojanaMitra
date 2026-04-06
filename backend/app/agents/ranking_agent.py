"""Ranking agent for eligibility results."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List


class RankingAgent:
    """Rank and categorize eligibility matches."""

    def _is_farmer_profile(self, profile: Any) -> bool:
        occupation = str(getattr(profile, "occupation", "") or "").lower()
        is_farmer_flag = int(getattr(profile, "is_farmer", 0) or 0) == 1
        return is_farmer_flag or "farmer" in occupation or "agri" in occupation

    @staticmethod
    def _parse_created_at(created_at: str | None) -> datetime | None:
        if not created_at:
            return None
        try:
            return datetime.fromisoformat(created_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            return None

    def _compute_rank_score(self, result: Dict[str, Any], is_farmer: bool) -> float:
        score = float(result.get("match_score", 0.0) or 0.0) * 100.0
        benefit = float(result.get("benefit_amount", 0) or 0)
        score += min(benefit / 10000.0, 40.0)

        sector = str(result.get("sector") or "").lower()
        if is_farmer and any(token in sector for token in ["agri", "farmer", "crop", "horticulture"]):
            score += 12.0

        created_at = self._parse_created_at(result.get("created_at"))
        if created_at and created_at >= (datetime.utcnow() - timedelta(days=180)):
            score += 4.0

        if len(result.get("failed_conditions", [])) <= 1:
            score += 1.0

        return round(score, 4)

    def run(self, raw_results: List[Dict[str, Any]], profile: Any) -> Dict[str, Any]:
        is_farmer = self._is_farmer_profile(profile)

        enriched: List[Dict[str, Any]] = []
        for item in raw_results:
            enriched_item = dict(item)
            enriched_item["rank_score"] = self._compute_rank_score(enriched_item, is_farmer)
            enriched.append(enriched_item)

        fully_eligible = [r for r in enriched if float(r.get("match_score", 0)) == 1.0]
        highly_eligible = [r for r in enriched if 0.7 <= float(r.get("match_score", 0)) < 1.0]
        partially_eligible = [r for r in enriched if 0.4 <= float(r.get("match_score", 0)) < 0.7]
        one_step_away = [
            r for r in enriched
            if not r.get("is_eligible") and len(r.get("failed_conditions", [])) == 1
        ]

        fully_eligible.sort(key=lambda r: float(r.get("benefit_amount", 0) or 0), reverse=True)
        highly_eligible.sort(key=lambda r: float(r.get("benefit_amount", 0) or 0), reverse=True)
        partially_eligible.sort(key=lambda r: float(r.get("match_score", 0) or 0), reverse=True)
        one_step_away.sort(key=lambda r: float(r.get("rank_score", 0) or 0), reverse=True)

        combined = sorted(
            enriched,
            key=lambda r: (float(r.get("rank_score", 0) or 0), float(r.get("match_score", 0) or 0)),
            reverse=True,
        )

        top_10 = combined[:10]
        top_50 = combined[:50]

        eligible_for_benefit = [r for r in enriched if r.get("is_eligible") or float(r.get("match_score", 0)) >= 0.7]
        top_benefit_amount = max((float(r.get("benefit_amount", 0) or 0) for r in eligible_for_benefit), default=0.0)

        sectors_matched = sorted({
            str(r.get("sector")).strip()
            for r in enriched
            if (r.get("is_eligible") or float(r.get("match_score", 0)) >= 0.4) and str(r.get("sector") or "").strip()
        })

        return {
            "fully_eligible": fully_eligible,
            "highly_eligible": highly_eligible,
            "partially_eligible": partially_eligible,
            "one_step_away": one_step_away,
            "top_10": top_10,
            "top_50": top_50,
            "total_eligible": len([r for r in enriched if r.get("is_eligible")]),
            "total_checked": len(enriched),
            "top_benefit_amount": top_benefit_amount,
            "sectors_matched": sectors_matched,
        }
