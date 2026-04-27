"""Orchestrator: Coordinates the multi-agent pipeline.

Exposes:
  - run_full_pipeline: profile + documents + scheme discovery + reasoning
  - run_quick_pipeline: profile + scheme discovery + reasoning (no OCR)
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.agents.profile_agent import ProfileAgent
from app.agents.scheme_discovery_agent import SchemeDiscoveryAgent
from app.agents.eligibility_agent import EligibilityReasoningAgent
from app.agents.document_agent import DocumentIntelligenceAgent
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


def _merge_ocr_into_profile(profile: dict, ocr_results: List[dict]) -> dict:
    """
    Merge OCR-extracted fields into profile.
    Form data (profile) always takes priority over OCR.
    """
    merged = dict(profile)

    field_map = {
        "name": "full_name",
        "dob": "dob",
        "gender": "gender",
        "caste": "caste_category",
        "income": "annual_income",
        "aadhaar": "aadhaar_number",
        "pan": "pan_number",
    }

    for ocr in ocr_results:
        fields = ocr.get("fields", {})
        for ocr_field, profile_field in field_map.items():
            ocr_value = fields.get(ocr_field)
            # Only fill if profile field is missing
            if ocr_value and merged.get(profile_field) is None:
                merged[profile_field] = ocr_value

    return merged


def _run_reasoning_for_schemes(
    eligible_schemes: List[dict],
    profile: dict,
) -> List[dict]:
    """Run EligibilityReasoningAgent for each scheme in the list."""
    agent = EligibilityReasoningAgent()
    results = []
    for scheme in eligible_schemes:
        # Reconstruct a minimal engine_result from the scheme entry
        engine_result = {
            "eligible": scheme.get("eligible", False),
            "confidence_score": scheme.get("confidence_score", 0),
            "passed_checks": scheme.get("passed_checks", []),
            "failed_checks": scheme.get("failed_checks", []),
            "suggestion": scheme.get("suggestion", ""),
            "rules_evaluated": scheme.get("rules_evaluated", 0),
            "rules_passed": scheme.get("rules_passed", 0),
        }
        reasoning = agent.run(scheme, profile, engine_result)
        results.append({**scheme, **reasoning})
    return results


class Orchestrator:
    """Coordinates all agents in the welfare scheme recommendation pipeline."""

    def run_full_pipeline(
        self,
        profile_data: dict,
        documents: List[bytes],
        db: Session,
    ) -> dict:
        """
        Full pipeline: profile validation → OCR → merge → scheme discovery → reasoning.

        Steps:
          1. ProfileAgent validates and enriches profile_data
          2. DocumentIntelligenceAgent processes each document image
          3. OCR results merged into profile (form data takes priority)
          4. SchemeDiscoveryAgent queries DB and checks eligibility
          5. EligibilityReasoningAgent generates explanations for top 20
          6. Returns complete analysis

        Args:
            profile_data: Raw profile dict from form/API.
            documents: List of raw image bytes.
            db: SQLAlchemy session.

        Returns:
            Full pipeline result dict.
        """
        # Step 1: Validate profile
        profile_result = ProfileAgent().run(profile_data)
        validated_profile = profile_result["validated_profile"]

        # Step 2: Process documents
        ocr_results: List[dict] = []
        if documents:
            doc_agent = DocumentIntelligenceAgent()
            for img_bytes in documents:
                ocr_result = doc_agent.run(img_bytes)
                ocr_results.append(ocr_result)

        # Step 3: Merge OCR into profile
        merged_profile = _merge_ocr_into_profile(validated_profile, ocr_results)

        # Step 4: Scheme discovery
        discovery_result = SchemeDiscoveryAgent().run(merged_profile, db)

        # Step 5: Reasoning for top 20 eligible schemes
        top_schemes = discovery_result["eligible"]  # already capped at 20
        reasoned = _run_reasoning_for_schemes(top_schemes, merged_profile)

        # Step 6: Return complete analysis
        return {
            "pipeline": "full",
            "profile_validation": {
                "completeness_score": profile_result["completeness_score"],
                "missing_fields": profile_result["missing_fields"],
                "age_group": profile_result["age_group"],
                "income_category": profile_result["income_category"],
                "land_category": profile_result["land_category"],
            },
            "documents_processed": len(ocr_results),
            "ocr_results": ocr_results,
            "merged_profile": merged_profile,
            "scheme_discovery": {
                "total_schemes_checked": discovery_result["total_schemes_checked"],
                "eligible_count": len(discovery_result["eligible"]),
                "partial_count": len(discovery_result["partial"]),
                "not_eligible_count": discovery_result["not_eligible_count"],
            },
            "top_eligible_schemes": reasoned,
            "partial_schemes": discovery_result["partial"],
        }

    def run_quick_pipeline(self, basic_input: dict, db: Session) -> dict:
        """
        Quick pipeline: profile validation → scheme discovery → reasoning.
        No document processing. Designed to return in under 2 seconds.

        Steps:
          1. ProfileAgent validates basic_input
          4. SchemeDiscoveryAgent queries DB and checks eligibility
          5. EligibilityReasoningAgent generates explanations for top 20

        Args:
            basic_input: Raw profile dict.
            db: SQLAlchemy session.

        Returns:
            Quick pipeline result dict.
        """
        # Step 1
        profile_result = ProfileAgent().run(basic_input)
        validated_profile = profile_result["validated_profile"]

        # Step 4
        discovery_result = SchemeDiscoveryAgent().run(validated_profile, db)

        # Step 5
        top_schemes = discovery_result["eligible"]
        reasoned = _run_reasoning_for_schemes(top_schemes, validated_profile)

        return {
            "pipeline": "quick",
            "profile_validation": {
                "completeness_score": profile_result["completeness_score"],
                "missing_fields": profile_result["missing_fields"],
                "age_group": profile_result["age_group"],
                "income_category": profile_result["income_category"],
                "land_category": profile_result["land_category"],
            },
            "scheme_discovery": {
                "total_schemes_checked": discovery_result["total_schemes_checked"],
                "eligible_count": len(discovery_result["eligible"]),
                "partial_count": len(discovery_result["partial"]),
                "not_eligible_count": discovery_result["not_eligible_count"],
            },
            "top_eligible_schemes": reasoned,
            "partial_schemes": discovery_result["partial"],
        }
