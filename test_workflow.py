"""
Complete end-to-end workflow test for YojanaMitra application.
Tests: Registration -> Login -> Profile -> Schemes -> Eligibility -> Application
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = f"testuser_{datetime.now().strftime('%Y%m%d_%H%M%S')}@test.com"
TEST_PASSWORD = "TestPassword123!"

print("=" * 70)
print("YojanaMitra Complete Workflow Test")
print("=" * 70)

# Track results
results = {
    "registration": {"status": "pending"},
    "login": {"status": "pending"},
    "profile": {"status": "pending"},
    "schemes": {"status": "pending"},
    "eligibility": {"status": "pending"},
    "application": {"status": "pending"},
}

# ============================================================================
# 1. REGISTRATION
# ============================================================================
print("\n1. Testing User Registration...")
try:
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test User",
        }
    )
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"   ✓ Registration successful")
        print(f"     Email: {data.get('email', 'N/A')}")
        print(f"     User ID: {data.get('user_id', 'N/A')}")
        results["registration"]["status"] = "success"
        results["registration"]["user_id"] = data.get("user_id")
    else:
        print(f"   ✗ Registration failed: {response.status_code}")
        print(f"     Response: {response.text}")
        results["registration"]["status"] = "failed"
except Exception as e:
    print(f"   ✗ Error: {str(e)}")
    results["registration"]["status"] = "error"

# ============================================================================
# 2. LOGIN
# ============================================================================
print("\n2. Testing User Login...")
access_token = None
try:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        }
    )
    if response.status_code == 200:
        data = response.json()
        access_token = data["access_token"]
        print(f"   ✓ Login successful")
        print(f"     Token type: {data['token_type']}")
        results["login"]["status"] = "success"
        results["login"]["token"] = access_token[:20] + "..."
    else:
        print(f"   ✗ Login failed: {response.status_code}")
        print(f"     Response: {response.text}")
        results["login"]["status"] = "failed"
except Exception as e:
    print(f"   ✗ Error: {str(e)}")
    results["login"]["status"] = "error"

# Set up headers for authenticated requests
headers = {"Authorization": f"Bearer {access_token}"} if access_token else {}

# ============================================================================
# 3. COMPLETE PROFILE
# ============================================================================
print("\n3. Testing Profile Completion...")
if access_token:
    try:
        response = requests.put(
            f"{BASE_URL}/profile/",
            headers=headers,
            json={
                "phone": "9876543210",
                "state": "Maharashtra",
                "district": "Mumbai",
                "annual_income": 300000,
                "social_category": "General",
                "disability_status": "No",
                "education_level": "Graduate",
                "employment_status": "Employed",
            }
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Profile updated")
            print(f"     State: {data.get('state')}")
            print(f"     Income: {data.get('annual_income')}")
            results["profile"]["status"] = "success"
        else:
            print(f"   ✗ Profile update failed: {response.status_code}")
            print(f"     Response: {response.text}")
            results["profile"]["status"] = "failed"
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        results["profile"]["status"] = "error"
else:
    print("   ⊘ Skipped (no access token)")
    results["profile"]["status"] = "skipped"

# ============================================================================
# 4. FETCH SCHEMES LIST
# ============================================================================
print("\n4. Testing Schemes Search...")
if access_token:
    try:
        response = requests.get(
            f"{BASE_URL}/schemes",
            headers=headers,
            params={"skip": 0, "limit": 10}
        )
        if response.status_code == 200:
            data = response.json()
            schemes_count = data.get("total", 0)
            schemes_sample = data.get("schemes", [])
            print(f"   ✓ Schemes fetched")
            print(f"     Total schemes: {schemes_count}")
            print(f"     Sample schemes: {len(schemes_sample)}")
            if schemes_sample:
                print(f"     First scheme: {schemes_sample[0].get('name', 'N/A')}")
            results["schemes"]["status"] = "success"
            results["schemes"]["total"] = schemes_count
        else:
            print(f"   ✗ Schemes fetch failed: {response.status_code}")
            print(f"     Response: {response.text}")
            results["schemes"]["status"] = "failed"
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        results["schemes"]["status"] = "error"
else:
    print("   ⊘ Skipped (no access token)")
    results["schemes"]["status"] = "skipped"

# ============================================================================
# 5. CHECK ELIGIBILITY
# ============================================================================
print("\n5. Testing Eligibility Check...")
if access_token:
    try:
        response = requests.post(
            f"{BASE_URL}/eligibility/check",
            headers=headers,
            json={"refresh": False}
        )
        if response.status_code == 200:
            data = response.json()
            eligible_count = data.get("total_eligible", 0)
            top_matches = data.get("top_matches", [])
            print(f"   ✓ Eligibility check complete")
            print(f"     Eligible schemes: {eligible_count}")
            print(f"     Top matches: {len(top_matches)}")
            if top_matches:
                print(f"     Top match: {top_matches[0].get('scheme_name', 'N/A')} ({top_matches[0].get('score', 0):.2%})")
            results["eligibility"]["status"] = "success"
            results["eligibility"]["eligible_count"] = eligible_count
        else:
            print(f"   ✗ Eligibility check failed: {response.status_code}")
            print(f"     Response: {response.text}")
            results["eligibility"]["status"] = "failed"
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        results["eligibility"]["status"] = "error"
else:
    print("   ⊘ Skipped (no access token)")
    results["eligibility"]["status"] = "skipped"

# ============================================================================
# 6. CREATE APPLICATION
# ============================================================================
print("\n6. Testing Application Creation...")
if access_token:
    try:
        # First, get a scheme ID
        response = requests.get(
            f"{BASE_URL}/schemes",
            headers=headers,
            params={"skip": 0, "limit": 1}
        )
        if response.status_code == 200:
            schemes = response.json().get("schemes", [])
            if schemes:
                scheme_id = schemes[0].get("id", "")
                # Try to create an application
                app_response = requests.post(
                    f"{BASE_URL}/applications/save-scheme",
                    headers=headers,
                    json={
                        "scheme_id": scheme_id,
                    }
                )
                if app_response.status_code in [200, 201]:
                    app_data = app_response.json()
                    print(f"   ✓ Application created")
                    print(f"     Scheme: {schemes[0].get('name', 'N/A')}")
                    print(f"     Status: {app_data.get('status', 'N/A')}")
                    results["application"]["status"] = "success"
                    results["application"]["scheme_id"] = scheme_id
                else:
                    print(f"   ✗ Application creation failed: {app_response.status_code}")
                    print(f"     Response: {app_response.text}")
                    results["application"]["status"] = "failed"
            else:
                print("   ⊘ No schemes available to test application")
                results["application"]["status"] = "skipped"
        else:
            print(f"   ✗ Could not fetch scheme: {response.status_code}")
            results["application"]["status"] = "failed"
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        results["application"]["status"] = "error"
else:
    print("   ⊘ Skipped (no access token)")
    results["application"]["status"] = "skipped"

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 70)
print("TEST SUMMARY")
print("=" * 70)

passed = sum(1 for r in results.values() if r["status"] == "success")
failed = sum(1 for r in results.values() if r["status"] == "failed")
errors = sum(1 for r in results.values() if r["status"] == "error")
skipped = sum(1 for r in results.values() if r["status"] == "skipped")

for test_name, result in results.items():
    status_icon = "✓" if result["status"] == "success" else "✗" if result["status"] == "failed" else "!" if result["status"] == "error" else "⊘"
    status_text = result["status"].upper()
    print(f"{status_icon} {test_name.upper():20} - {status_text}")

print("\n" + "-" * 70)
print(f"Results: {passed} Passed | {failed} Failed | {errors} Errors | {skipped} Skipped")
print("-" * 70)

if failed == 0 and errors == 0:
    print("✓ WORKFLOW TEST PASSED - Application is working correctly!")
else:
    print("✗ WORKFLOW TEST FAILED - Some components need attention")
