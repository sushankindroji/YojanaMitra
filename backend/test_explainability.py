"""Test script for OCR processor and explainability engine.

Run: python test_explainability.py
"""
from app.engine.explainer import ExplainabilityEngine
from app.services.eligibility_engine import check_eligibility


def test_explainability_engine():
    """Test explanation generation in multiple languages."""
    
    # Sample profile
    profile = {
        "age": 35,
        "annual_income": 500000,
        "state": "Telangana",
        "gender": "Male",
        "caste_category": "General",
        "is_farmer": True,
        "land_area_acres": 2.5,
    }
    
    # Sample scheme rules
    rules = {
        "age_min": 18,
        "age_max": 60,
        "income_max": 1000000,
        "is_farmer": True,
        "land_area_min": 0.5,
        "state": "Telangana",
    }
    
    # Get eligibility result
    engine_result = check_eligibility(profile, rules)
    
    print("=" * 80)
    print("ELIGIBILITY ENGINE RESULT")
    print("=" * 80)
    print(f"Eligible: {engine_result['eligible']}")
    print(f"Confidence Score: {engine_result['confidence_score']}")
    print(f"Rules Passed: {engine_result['rules_passed']}/{engine_result['rules_evaluated']}")
    print()
    
    # Test explanation generation in all languages
    languages = ["en", "hi", "te", "ta", "kn", "mr", "bn"]
    explainer = ExplainabilityEngine()
    
    for lang in languages:
        print("=" * 80)
        print(f"EXPLANATION IN {lang.upper()}")
        print("=" * 80)
        
        explanation = explainer.generate_explanation(
            scheme_name="PM-KISAN Yojana",
            profile=profile,
            engine_result=engine_result,
            language=lang,
            benefit_amount=6000.0,
        )
        
        print(f"\n📋 VERDICT:")
        print(f"   {explanation['verdict']}")
        
        print(f"\n🔍 REASONING CHAIN:")
        for step in explanation["reasoning_chain"]:
            print(f"   {step}")
        
        if explanation["improvement_suggestion"]:
            print(f"\n💡 IMPROVEMENT SUGGESTION:")
            print(f"   {explanation['improvement_suggestion']}")
        
        print(f"\n⭐ PRIORITY: {explanation['priority'].upper()}")
        print(f"   {explanation['priority_explanation']}")
        print()


def test_partial_eligibility():
    """Test explanation for partial eligibility."""
    
    profile = {
        "age": 65,  # Too old
        "annual_income": 500000,
        "state": "Telangana",
        "gender": "Female",
        "is_farmer": False,  # Not a farmer
    }
    
    rules = {
        "age_min": 18,
        "age_max": 60,
        "income_max": 1000000,
        "is_farmer": True,
        "gender": "Female",
    }
    
    engine_result = check_eligibility(profile, rules)
    
    print("=" * 80)
    print("PARTIAL ELIGIBILITY TEST")
    print("=" * 80)
    print(f"Eligible: {engine_result['eligible']}")
    print(f"Confidence Score: {engine_result['confidence_score']}")
    print()
    
    explainer = ExplainabilityEngine()
    explanation = explainer.generate_explanation(
        scheme_name="Women Farmer Scheme",
        profile=profile,
        engine_result=engine_result,
        language="en",
        benefit_amount=50000.0,
    )
    
    print(f"📋 VERDICT:\n   {explanation['verdict']}\n")
    print(f"🔍 REASONING CHAIN:")
    for step in explanation["reasoning_chain"]:
        print(f"   {step}")
    print()
    print(f"💡 IMPROVEMENT SUGGESTION:\n   {explanation['improvement_suggestion']}\n")
    print(f"⭐ PRIORITY: {explanation['priority'].upper()}")
    print(f"   {explanation['priority_explanation']}")


def test_not_eligible():
    """Test explanation for not eligible."""
    
    profile = {
        "age": 25,
        "annual_income": 2000000,  # Too high
        "state": "Maharashtra",  # Wrong state
        "gender": "Male",
    }
    
    rules = {
        "age_min": 18,
        "age_max": 60,
        "income_max": 1000000,
        "state": "Telangana",
    }
    
    engine_result = check_eligibility(profile, rules)
    
    print("=" * 80)
    print("NOT ELIGIBLE TEST")
    print("=" * 80)
    print(f"Eligible: {engine_result['eligible']}")
    print(f"Confidence Score: {engine_result['confidence_score']}")
    print()
    
    explainer = ExplainabilityEngine()
    explanation = explainer.generate_explanation(
        scheme_name="State-Specific Scheme",
        profile=profile,
        engine_result=engine_result,
        language="hi",
        benefit_amount=100000.0,
    )
    
    print(f"📋 VERDICT:\n   {explanation['verdict']}\n")
    print(f"🔍 REASONING CHAIN:")
    for step in explanation["reasoning_chain"]:
        print(f"   {step}")
    print()
    print(f"💡 IMPROVEMENT SUGGESTION:\n   {explanation['improvement_suggestion']}\n")
    print(f"⭐ PRIORITY: {explanation['priority'].upper()}")
    print(f"   {explanation['priority_explanation']}")


if __name__ == "__main__":
    print("\n")
    print("🔬 EXPLAINABILITY ENGINE TEST SUITE")
    print("=" * 80)
    print()
    
    test_explainability_engine()
    print("\n\n")
    test_partial_eligibility()
    print("\n\n")
    test_not_eligible()
    
    print("\n" + "=" * 80)
    print("✅ All tests completed!")
    print("=" * 80)
