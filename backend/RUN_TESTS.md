# Running End-to-End Tests

## Prerequisites

1. **Backend Running**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```
   Should see: `Uvicorn running on http://0.0.0.0:8000`

2. **Database Connected**
   - PostgreSQL running with schemes loaded
   - At least 100+ schemes in database

3. **Dependencies Installed**
   ```bash
   pip install requests
   ```

---

## Running the Test

### Option 1: Run Full Test Suite

```bash
cd backend
python test_pipeline.py
```

### Option 2: Run with Verbose Output

```bash
cd backend
python -u test_pipeline.py 2>&1 | tee test_output.log
```

---

## What the Test Does

### Test 1: Full Analysis (quick_mode=false)
- Creates a realistic farmer profile:
  - Age: 35
  - Income: ₹120,000 (BPL)
  - Occupation: Farmer
  - Land: 2.5 acres
  - Caste: SC
  - State: Telangana

- Calls `POST /api/v1/analyze`
- Verifies:
  - ✅ Response status 200
  - ✅ Session ID generated
  - ✅ Profile completeness calculated
  - ✅ Schemes checked and categorized
  - ✅ Confidence scores are NOT all 100% (bug fix verification)
  - ✅ Top 3 schemes displayed with explanations

### Test 2: Quick Analysis (quick_mode=true)
- Same profile, but with `quick_mode=true`
- Verifies:
  - ✅ Response time < 2 seconds
  - ✅ Results returned quickly

### Test 3: Scheme Statistics
- Calls `GET /api/v1/schemes/stats`
- Verifies:
  - ✅ Total scheme count
  - ✅ Breakdown by category
  - ✅ Last updated timestamp

### Test 4: Different Profile Types
- Tests with:
  - Senior Citizen (age 65)
  - Woman Entrepreneur
  - Student
- Verifies each returns different eligible schemes

---

## Expected Output

```
================================================================================
  WELFARE SCHEME ANALYSIS - END-TO-END TEST
================================================================================
Timestamp: 2026-04-22T10:30:45.123456
API Base URL: http://localhost:8000

📌 TEST PROFILE
--------------------------------------------------------------------------------
Name: Rajesh Kumar
Age: 35
Occupation: farmer
State: Telangana
Annual Income: ₹120,000
Caste Category: SC
Land Holding: 2.5 acres
BPL Status: Yes
Bank Account: Yes

📌 TEST 1: FULL ANALYSIS (quick_mode=false)
--------------------------------------------------------------------------------
Request: POST http://localhost:8000/api/v1/analyze
Payload: {...}

✅ Response Status: 200
⏱️  Response Time: 8.45s

📌 ANALYSIS RESULTS
--------------------------------------------------------------------------------
Session ID: 550e8400-e29b-41d4-a716-446655440000
Profile Completeness: 95.0%
Total Schemes Checked: 4250
Eligible Schemes: 47
Partially Eligible: 23
Processing Time: 8450ms

📌 CONFIDENCE SCORE DISTRIBUTION
--------------------------------------------------------------------------------
Total schemes returned: 15
Min confidence: 45.0%
Max confidence: 95.0%
Avg confidence: 72.3%
Unique confidence scores: 12
✅ PASS: Not all schemes show 100% confidence (bug fixed)

📌 TOP 3 ELIGIBLE SCHEMES
--------------------------------------------------------------------------------

1. PM-KISAN Yojana
   Category: Agriculture
   Eligible: ✅ Yes
   Confidence: 95.0%
   Priority: HIGH
   Benefit: ₹6000
   Verdict: You qualify for PM-KISAN Yojana based on 5 matching criteria.
   Reasoning:
     • Step 1: Age check → Your age 35 meets the minimum requirement of 18 ✓
     • Step 2: Farmer check → You are a farmer ✓
   To Improve: 

2. SC/ST Scholarship Scheme
   Category: Education
   Eligible: ✅ Yes
   Confidence: 88.0%
   Priority: HIGH
   Benefit: ₹50000
   Verdict: You qualify for SC/ST Scholarship Scheme based on 4 matching criteria.
   Reasoning:
     • Step 1: Caste check → Your caste SC matches scheme requirement ✓
     • Step 2: Income check → Your income is within limit ✓
   To Improve: 

3. BPL Food Security Scheme
   Category: Social Security
   Eligible: ✅ Yes
   Confidence: 82.0%
   Priority: MEDIUM
   Benefit: ₹5000
   Verdict: You qualify for BPL Food Security Scheme based on 3 matching criteria.
   Reasoning:
     • Step 1: BPL check → Your BPL status matches requirement ✓
     • Step 2: Income check → Your income is within limit ✓
   To Improve: 

📌 RESULT VARIETY CHECK
--------------------------------------------------------------------------------
Total schemes: 15
Unique schemes: 15
✅ PASS: All schemes are unique
✅ PASS: Schemes have varied confidence scores

📌 TEST 2: QUICK ANALYSIS (quick_mode=true)
--------------------------------------------------------------------------------
✅ Response Status: 200
⏱️  Response Time: 1.23s (should be <2s)
✅ PASS: Quick mode is fast

📌 TEST 3: SCHEME STATISTICS
--------------------------------------------------------------------------------
✅ Total Schemes: 4250
Last Updated: 2026-04-22T10:25:30.000000

Schemes by Category:
  • Agriculture: 850
  • Education: 620
  • Social Security: 580
  • Health: 450
  • Employment: 380

📌 TESTING DIFFERENT PROFILE TYPES
================================================================================

📌 Testing: Senior Citizen
--------------------------------------------------------------------------------
✅ Eligible: 12
✅ Partial: 8
✅ Top Scheme: Senior Citizen Pension Scheme

📌 Testing: Woman Entrepreneur
--------------------------------------------------------------------------------
✅ Eligible: 18
✅ Partial: 14
✅ Top Scheme: Women Entrepreneur Development Scheme

📌 Testing: Student
--------------------------------------------------------------------------------
✅ Eligible: 9
✅ Partial: 6
✅ Top Scheme: National Scholarship Scheme

================================================================================
  TEST COMPLETE
================================================================================
✅ All tests completed successfully!
```

---

## Key Verifications

### ✅ Bug Fix: Confidence Scores Not All 100%

The test verifies that:
- Min confidence < 100%
- Max confidence ≤ 100%
- Multiple unique confidence scores
- Schemes ranked by actual eligibility, not all marked as 100%

**Expected**: Confidence scores vary (e.g., 45%, 72%, 88%, 95%)
**NOT Expected**: All schemes showing 100% confidence

### ✅ Performance

- Full analysis: 5-10 seconds
- Quick analysis: <2 seconds
- Stats endpoint: <1 second

### ✅ Result Quality

- Top schemes are actually eligible for the profile
- Explanations are specific and actionable
- Reasoning chains show actual rule evaluations
- Improvement suggestions are relevant

---

## Troubleshooting

### Error: "Could not connect to API"

**Solution**: Make sure backend is running
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Error: "Database error"

**Solution**: Verify PostgreSQL is running and schemes are loaded
```bash
# Check database connection
psql -U postgres -d yojanamitra -c "SELECT COUNT(*) FROM schemes;"
```

### Error: "No schemes returned"

**Solution**: Verify schemes are in database
```bash
# Check scheme count
psql -U postgres -d yojanamitra -c "SELECT COUNT(*) FROM schemes WHERE is_active = 1;"
```

### Slow Response Times

**Solution**: Check database performance
```bash
# Check if indexes are created
psql -U postgres -d yojanamitra -c "\d schemes"
```

---

## Interpreting Results

### Profile Completeness
- 100%: All fields provided
- 80-99%: Most fields provided
- 60-79%: Some fields missing
- <60%: Many fields missing

### Confidence Scores
- 90-100%: Highly eligible
- 70-89%: Likely eligible
- 50-69%: Possibly eligible
- <50%: Unlikely eligible

### Priority Levels
- HIGH: >80% confidence + good benefit
- MEDIUM: 50-80% confidence
- LOW: <50% confidence

---

## Next Steps

1. **Verify Results**: Check if top schemes are actually relevant for the profile
2. **Test More Profiles**: Try different demographics
3. **Check Explanations**: Verify reasoning chains are accurate
4. **Performance Tuning**: Optimize slow queries if needed
5. **Frontend Integration**: Connect to React frontend

---

## API Endpoints Tested

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/analyze` | POST | Main analysis pipeline |
| `/api/v1/schemes/stats` | GET | Scheme statistics |
| `/api/v1/documents/extract` | POST | Document extraction (optional) |

---

## Test Coverage

- ✅ Profile validation
- ✅ Scheme discovery
- ✅ Eligibility checking
- ✅ Explanation generation
- ✅ Result ranking
- ✅ Performance metrics
- ✅ Error handling
- ✅ Multiple profile types

---

## Success Criteria

All tests pass when:
- ✅ Response status 200
- ✅ Session ID generated
- ✅ Eligible schemes > 0
- ✅ Confidence scores vary (not all 100%)
- ✅ Top schemes are relevant
- ✅ Explanations are clear
- ✅ Processing time < 10s (full) or < 2s (quick)
- ✅ No errors in logs

---

**Last Updated**: April 2026
**Status**: Ready for Testing
