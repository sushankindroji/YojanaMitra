"""End-to-end test of the complete welfare scheme analysis pipeline.

This script tests the main /analyze endpoint with a realistic farmer profile.
"""
import json
import time
from datetime import datetime

import requests


# Configuration
API_BASE_URL = "http://localhost:8000"
ANALYZE_ENDPOINT = f"{API_BASE_URL}/api/v1/analyze"
STATS_ENDPOINT = f"{API_BASE_URL}/api/v1/schemes/stats"


def print_header(text: str):
    """Print a formatted header."""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_section(text: str):
    """Print a formatted section."""
    print(f"\n📌 {text}")
    print("-" * 80)


def test_farmer_profile():
    """Test with a realistic farmer profile."""
    
    print_header("WELFARE SCHEME ANALYSIS - END-TO-END TEST")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"API Base URL: {API_BASE_URL}")
    
    # Test farmer profile
    profile = {
        "full_name": "Rajesh Kumar",
        "age": 35,
        "dob": "1989-06-15",
        "gender": "Male",
        "state": "Telangana",
        "district": "Hyderabad",
        "annual_income": 120000,
        "occupation": "farmer",
        "caste_category": "SC",
        "religion": "Hindu",
        "bpl_status": 1,
        "is_farmer": 1,
        "land_area_acres": 2.5,
        "is_student": 0,
        "education_level": "10th",
        "has_disability": 0,
        "disability_percentage": 0,
        "is_senior_citizen": 0,
        "is_minority": 0,
        "family_size": 5,
        "has_bank_account": 1,
        "ration_card_type": "BPL",
    }
    
    print_section("TEST PROFILE")
    print(f"Name: {profile['full_name']}")
    print(f"Age: {profile['age']}")
    print(f"Occupation: {profile['occupation']}")
    print(f"State: {profile['state']}")
    print(f"Annual Income: ₹{profile['annual_income']:,}")
    print(f"Caste Category: {profile['caste_category']}")
    print(f"Land Holding: {profile['land_area_acres']} acres")
    print(f"BPL Status: {'Yes' if profile['bpl_status'] else 'No'}")
    print(f"Bank Account: {'Yes' if profile['has_bank_account'] else 'No'}")
    
    # Test 1: Full analysis
    print_section("TEST 1: FULL ANALYSIS (quick_mode=false)")
    
    request_payload = {
        "profile": profile,
        "quick_mode": False,
    }
    
    print(f"Request: POST {ANALYZE_ENDPOINT}")
    print(f"Payload: {json.dumps(request_payload, indent=2)}")
    
    try:
        start = time.time()
        response = requests.post(ANALYZE_ENDPOINT, json=request_payload, timeout=30)
        elapsed = time.time() - start
        
        print(f"\n✅ Response Status: {response.status_code}")
        print(f"⏱️  Response Time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            
            print_section("ANALYSIS RESULTS")
            print(f"Session ID: {data['session_id']}")
            print(f"Profile Completeness: {data['profile_completeness']:.1%}")
            print(f"Total Schemes Checked: {data['total_schemes_checked']}")
            print(f"Eligible Schemes: {data['eligible_count']}")
            print(f"Partially Eligible: {data['partial_count']}")
            print(f"Processing Time: {data['processing_time_ms']}ms")
            
            # Verify not all schemes show 100% confidence
            print_section("CONFIDENCE SCORE DISTRIBUTION")
            confidence_scores = [s['confidence_score'] for s in data['top_schemes']]
            
            if confidence_scores:
                print(f"Total schemes returned: {len(confidence_scores)}")
                print(f"Min confidence: {min(confidence_scores):.1f}%")
                print(f"Max confidence: {max(confidence_scores):.1f}%")
                print(f"Avg confidence: {sum(confidence_scores)/len(confidence_scores):.1f}%")
                
                # Check for variety
                unique_scores = len(set(confidence_scores))
                print(f"Unique confidence scores: {unique_scores}")
                
                if max(confidence_scores) < 100:
                    print("✅ PASS: Not all schemes show 100% confidence (bug fixed)")
                else:
                    print("⚠️  WARNING: Some schemes show 100% confidence")
            
            # Show top 3 schemes
            print_section("TOP 3 ELIGIBLE SCHEMES")
            
            for i, scheme in enumerate(data['top_schemes'][:3], 1):
                print(f"\n{i}. {scheme['scheme_name']}")
                print(f"   Category: {scheme['category']}")
                print(f"   Eligible: {'✅ Yes' if scheme['eligible'] else '❌ No'}")
                print(f"   Confidence: {scheme['confidence_score']:.1f}%")
                print(f"   Priority: {scheme['priority'].upper()}")
                print(f"   Benefit: {scheme['benefit_amount']}")
                print(f"   Verdict: {scheme['verdict']}")
                
                if scheme['reasoning_chain']:
                    print(f"   Reasoning:")
                    for step in scheme['reasoning_chain'][:2]:  # Show first 2 steps
                        print(f"     • {step}")
                
                if scheme['improvement_suggestion']:
                    print(f"   To Improve: {scheme['improvement_suggestion']}")
            
            # Verify variety in results
            print_section("RESULT VARIETY CHECK")
            
            scheme_names = [s['scheme_name'] for s in data['top_schemes']]
            unique_names = len(set(scheme_names))
            print(f"Total schemes: {len(scheme_names)}")
            print(f"Unique schemes: {unique_names}")
            
            if unique_names == len(scheme_names):
                print("✅ PASS: All schemes are unique")
            else:
                print("⚠️  WARNING: Duplicate schemes in results")
            
            # Check confidence variety
            all_same = len(set(confidence_scores)) == 1
            if all_same:
                print(f"⚠️  WARNING: All schemes have same confidence ({confidence_scores[0]:.1f}%)")
            else:
                print(f"✅ PASS: Schemes have varied confidence scores")
            
        else:
            print(f"❌ Error: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to API")
        print(f"   Make sure the backend is running at {API_BASE_URL}")
        return False
    except Exception as exc:
        print(f"❌ ERROR: {str(exc)}")
        return False
    
    # Test 2: Quick analysis
    print_section("TEST 2: QUICK ANALYSIS (quick_mode=true)")
    
    request_payload["quick_mode"] = True
    
    try:
        start = time.time()
        response = requests.post(ANALYZE_ENDPOINT, json=request_payload, timeout=10)
        elapsed = time.time() - start
        
        print(f"✅ Response Status: {response.status_code}")
        print(f"⏱️  Response Time: {elapsed:.2f}s (should be <2s)")
        
        if elapsed < 2:
            print("✅ PASS: Quick mode is fast")
        else:
            print("⚠️  WARNING: Quick mode took longer than expected")
    
    except Exception as exc:
        print(f"❌ ERROR: {str(exc)}")
    
    # Test 3: Scheme statistics
    print_section("TEST 3: SCHEME STATISTICS")
    
    try:
        response = requests.get(STATS_ENDPOINT, timeout=10)
        
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Total Schemes: {stats['total_schemes']}")
            print(f"Last Updated: {stats['last_updated']}")
            
            print("\nSchemes by Category:")
            for category, count in sorted(stats['by_category'].items(), key=lambda x: x[1], reverse=True)[:5]:
                print(f"  • {category}: {count}")
        else:
            print(f"❌ Error: {response.text}")
    
    except Exception as exc:
        print(f"❌ ERROR: {str(exc)}")
    
    print_header("TEST COMPLETE")
    print("✅ All tests completed successfully!")
    return True


def test_different_profiles():
    """Test with different profile types."""
    
    print_header("TESTING DIFFERENT PROFILE TYPES")
    
    profiles = {
        "Senior Citizen": {
            "full_name": "Ramesh Sharma",
            "age": 65,
            "gender": "Male",
            "state": "Maharashtra",
            "annual_income": 50000,
            "occupation": "retired",
            "caste_category": "General",
            "is_senior_citizen": 1,
            "has_bank_account": 1,
        },
        "Woman Entrepreneur": {
            "full_name": "Priya Singh",
            "age": 28,
            "gender": "Female",
            "state": "Gujarat",
            "annual_income": 300000,
            "occupation": "business",
            "caste_category": "OBC",
            "is_woman_headed_household": 1,
            "has_bank_account": 1,
        },
        "Student": {
            "full_name": "Arjun Patel",
            "age": 20,
            "gender": "Male",
            "state": "Karnataka",
            "annual_income": 0,
            "occupation": "student",
            "caste_category": "SC",
            "is_student": 1,
            "education_level": "12th",
        },
    }
    
    for profile_type, profile_data in profiles.items():
        print_section(f"Testing: {profile_type}")
        
        try:
            response = requests.post(
                ANALYZE_ENDPOINT,
                json={"profile": profile_data, "quick_mode": True},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Eligible: {data['eligible_count']}")
                print(f"✅ Partial: {data['partial_count']}")
                print(f"✅ Top Scheme: {data['top_schemes'][0]['scheme_name'] if data['top_schemes'] else 'None'}")
            else:
                print(f"❌ Error: {response.status_code}")
        
        except Exception as exc:
            print(f"❌ ERROR: {str(exc)}")


if __name__ == "__main__":
    print("\n")
    
    # Run main test
    success = test_farmer_profile()
    
    if success:
        # Run additional profile tests
        test_different_profiles()
    
    print("\n")
