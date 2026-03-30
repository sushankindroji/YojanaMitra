# YojanaMitra - Complete Implementation Guide

## 🎯 Project Status

**Completed (✅ Ready to Use):**
- ✅ Phase 1: Foundation (DB models, schemas, core services)
- ✅ Phase 2: Authentication (JWT, OTP, Google OAuth stub)
- ✅ Phase 3: Document Upload (file encryption, OCR stubs)
- ✅ Phase 4: Eligibility Checker (rule-based engine)
- ✅ Phase 5: Profile System (basic structure)
- ✅ Phase 6: Schemes Database (seeding structure ready)

**In Progress (📝 Next to Complete):**
- 📝 Phase 3: Document OCR Integration
- 📝 Phase 4: Profile + Onboarding UI
- 📝 Phase 5: Scheme Results UI
- 📝 Phase 6: Scheme Scraper
- 📝 Phase 7: Admin Panel

---

## 🚀 IMMEDIATE NEXT STEPS (To Get Working)

### Step 1: Start Backend
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

API should be available at: `http://localhost:8000/docs`

### Step 2: Start Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend should be available at: `http://localhost:5173`

### Step 3: Test Auth Flows
1. Visit http://localhost:5173/register
2. Create account with email/password
3. Should redirect to `/dashboard`
4. Check browser DevTools → Network tab to verify API calls

### Step 4: Seed Schemes
```bash
cd backend
python ../seed_data/seed_db.py
```

Check output for "✅ Added: PM-KISAN" etc.

---

## 📋 REMAINING COMPONENTS TO BUILD

### Phase 3.1: Complete OCR Integration

**File:** `backend/app/services/ocr_service.py` (already started)

Remaining: Integration with test endpoint

**Test OCR:**
```python
# backend/test_ocr.py
import asyncio
from app.services.ocr_service import ocr_service

async def test():
    # Download a test Aadhaar image
    with open("test_aadhaar.jpg", "rb") as f:
        result = await ocr_service.extract_structured_data(f.read(), "aadhaar")
    print(result)

asyncio.run(test())
```

### Phase 4: Profile + Onboarding Wizard

**Frontend Files to Create:**

1. **Onboarding.jsx** — 6-step wizard
```javascript
// frontend/src/pages/Onboarding.jsx
// Step 1: Welcome → Step 2: Upload doc → Step 3: Processing
// Step 4: Review extracted → Step 5: Optional questions → Step 6: Complete
// Each step calls profile/documents API
```

2. **ProfileForm.jsx** — Editable profile with auto-fill
```javascript
// frontend/src/components/profile/ProfileForm.jsx
// Fields: name, DOB, gender, state, income, occupation, etc.
// Auto-fill from extracted document data
// Show confidence scores
```

3. **Profile.jsx** — Show/edit profile
```javascript
// frontend/src/pages/Profile.jsx
// Display profile with completeness meter
// Edit form with optional questions
```

**Backend Files Already Created:**
- ✅ app/routers/profile.py
- ✅ app/schemas/profile.py

---favicon.ico:1  GET http://localhost:5173/favicon.ico 404 (Not Found)

### Phase 5: Scheme Results & Details

**Frontend Files to Create:**

1. **SchemeResults.jsx** — List eligible schemes
```javascript
// frontend/src/pages/SchemeResults.jsx
// Call schemeService.getEligibleSchemes()
// Show SchemeCard component for each
// Filter by sector/state
```

2. **SchemeCard.jsx** — Single scheme card
```javascript
// frontend/src/components/schemes/SchemeCard.jsx
// Display name, ministry, benefit amount
// Show eligibility badge (✅/⚠️/❌)
// "View Details" button
```
![alt text](image.png)
3. **SchemeDetail.jsx** — Full scheme page
```javascript
// frontend/src/pages/SchemeDetail.jsx
// Show all scheme info
// Call getSchemeEligibility() to show why user qualifies
// Show EligibilityBadges for each condition
// Show EligibilitySummary with Gemini explanation
// "How to Apply" button
```

4. **EligibilityBadges.jsx** — Per-condition status
```javascript
// frontend/src/components/schemes/EligibilityBadges.jsx
// Parse condition_results from eligibility API
// Show badge for each condition: ✅ PASS, ❌ FAIL, ⚠️ MISSING_DATA
```

5. **EligibilitySummary.jsx** — Plain-language explanation
```javascript
// frontend/src/components/schemes/EligibilitySummary.jsx
// Display explanation_user_lang from eligibility result
// Show in user's preferred language
```

**Backend Files Already Created:**
- ✅ app/routers/schemes.py
- ✅ app/agents/eligibility_agent.py
- ✅ app/schemas/scheme.py

---

### Phase 6: Scheme Scraper

**Backend Files to Create:**

1. **app/services/scraper_service.py** — Scrape myscheme.gov.in
```python
# Fetch schemes from myscheme API
# Convert free-text eligibility to structured rules using Gemini
# Compare with DB using hash to find new/updated schemes
# Insert/update into DB
```

2. **app/tasks/scheduler.py** — APScheduler job
```python
# Run nightly at 2AM IST
# Call scraper_service.scrape_all()
# Log results to scheme_sync_logs table
```

3. **app/routers/sync.py** — Manual sync trigger
```python
# POST /api/v1/sync/run — trigger scraper immediately
# GET /api/v1/sync/status — check last sync status
```

---

### Phase 7: Admin Panel

**Frontend Pages to Create:**

1. **pages/admin/AdminDashboard.jsx** — Stats + controls
```javascript
// Show total users, schemes, applications
// Button to trigger manual sync
// View audit logs
```

2. **pages/admin/ManageSchemes.jsx** — CRUD for schemes
```javascript
// Table of all schemes
// Add/Edit/Delete buttons
// Bulk verify schemes
```

3. **pages/admin/ManageUsers.jsx** — User management
```javascript
// List all users
// Deactivate/delete accounts
// View user profile completeness
```

**Backend File to Create:**

1. **app/routers/admin.py** — Admin endpoints
```python
# POST /admin/schemes — create
# PUT /admin/schemes/{id} — update
# DELETE /admin/schemes/{id}
# GET /admin/stats
# GET /admin/users
# PUT /admin/users/{id}/deactivate
# GET /admin/audit-logs
```

---

## 🔑 KEY IMPLEMENTATION PATTERNS

### Pattern 1: Frontend Component with API Call
```javascript
export default function MyComponent() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const response = await myService.getData()
        setData(response.data)
      } catch (err) {
        setError(err.message)
        toast.error('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) return <div>Loading...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!data) return <div>No data</div>

  return <div>{/* Display data */}</div>
}
```

### Pattern 2: Backend API Endpoint
```python
@router.get("/endpoint", response_model=ResponseSchema)
async def get_something(
    param: str = Query(..., description="Parameter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Description."""
    # Validate
    obj = db.query(Model).filter(Model.user_id == current_user.id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")

    # Process
    # ...

    # Log audit
    log_audit(db, "action", "resource", obj.id, current_user.id)

    return obj
```

### Pattern 3: Zustand Store Usage
```javascript
// In component
const items = useMyStore((state) => state.items)
const setItems = useMyStore((state) => state.setItems)

// Update
setItems(newItems)

// Or use hook
const { items, setItems } = useMyStore((state) => ({
  items: state.items,
  setItems: state.setItems,
}))
```

---

## 📊 API ENDPOINT REFERENCE

### Implemented ✅
```
POST       /api/v1/auth/register
POST       /api/v1/auth/login
POST       /api/v1/auth/refresh
POST       /api/v1/auth/send-otp
POST       /api/v1/auth/verify-otp
GET        /api/v1/auth/me
POST       /api/v1/auth/logout

POST       /api/v1/documents/upload
GET        /api/v1/documents
GET        /api/v1/documents/{doc_id}
DELETE     /api/v1/documents/{doc_id}
POST       /api/v1/documents/{doc_id}/reprocess

GET        /api/v1/profile
PUT        /api/v1/profile
GET        /api/v1/profile/completeness
POST       /api/v1/profile/optional-questions

GET        /api/v1/schemes
GET        /api/v1/schemes/eligible
GET        /api/v1/schemes/partially-eligible
GET        /api/v1/schemes/{scheme_id}
GET        /api/v1/schemes/{scheme_id}/eligibility
GET        /api/v1/schemes/{scheme_id}/apply-guide
POST       /api/v1/schemes/check-all
GET        /api/v1/schemes/search
GET        /api/v1/schemes/sectors
GET        /api/v1/schemes/states
```

### To Implement 📝
```
POST       /api/v1/applications/save
GET        /api/v1/applications
GET        /api/v1/applications/{app_id}
DELETE     /api/v1/applications/{app_id}
GET        /api/v1/applications/{app_id}/prefilled

GET        /api/v1/admin/stats
GET        /api/v1/admin/users
PUT        /api/v1/admin/users/{id}/deactivate
POST       /api/v1/admin/schemes
PUT        /api/v1/admin/schemes/{id}
DELETE     /api/v1/admin/schemes/{id}
GET        /api/v1/admin/audit-logs

GET        /api/v1/sync/status
POST       /api/v1/sync/run
```

---

## 🗂️ FILE CREATION CHECKLIST

### Backend Remaining
- [ ] app/services/recommendation_agent.py (Gemini ranking)
- [ ] app/services/scraper_service.py (myscheme.gov.in)
- [ ] app/routers/applications.py
- [ ] app/routers/admin.py
- [ ] app/routers/sync.py
- [ ] app/tasks/scheduler.py
- [ ] app/agents/recommendation_agent.py
- [ ] app/agents/application_agent.py

### Frontend Remaining
- [ ] pages/Onboarding.jsx
- [ ] pages/Profile.jsx
- [ ] pages/SchemeResults.jsx
- [ ] pages/SchemeDetail.jsx
- [ ] pages/ApplyGuide.jsx
- [ ] pages/SavedApplications.jsx
- [ ] pages/admin/AdminDashboard.jsx
- [ ] pages/admin/ManageSchemes.jsx
- [ ] pages/admin/ManageUsers.jsx
- [ ] components/documents/DocumentUploader.jsx
- [ ] components/documents/CameraCapture.jsx
- [ ] components/documents/ExtractionReview.jsx
- [ ] components/profile/ProfileForm.jsx
- [ ] components/profile/ProfileCard.jsx
- [ ] components/profile/ProfileBadges.jsx
- [ ] components/schemes/SchemeCard.jsx
- [ ] components/schemes/SchemeFilter.jsx
- [ ] components/schemes/EligibilityBadges.jsx
- [ ] components/schemes/EligibilitySummary.jsx
- [ ] components/schemes/RiskAnalysis.jsx
- [ ] components/dashboard/AlertCard.jsx
- [ ] components/dashboard/ApplicationTracker.jsx
- [ ] components/dashboard/DeadlineReminder.jsx
- [ ] components/common/Navbar.jsx
- [ ] components/common/Footer.jsx
- [ ] components/common/LoadingSpinner.jsx
- [ ] hooks/useAuth.js
- [ ] hooks/useProfile.js
- [ ] hooks/useSchemes.js

### Translations
- [ ] public/locales/en/translation.json
- [ ] public/locales/hi/translation.json
- [ ] public/locales/te/translation.json
- [ ] public/locales/ta/translation.json
- [ ] public/locales/mr/translation.json
- [ ] public/locales/bn/translation.json
- [ ] public/locales/kn/translation.json

### Seed Data
- [ ] seed_data/schemes_states.json (add 150+ state schemes)

---

## ⚡ QUICK WINS (Easy to Implement)

Do these first to get momentum:

1. **Create Navbar.jsx** — 10 min
```javascript
// Header with logo, language switcher, login/profile button
```

2. **Create Footer.jsx** — 10 min
```javascript
// Company info, links, social
```

3. **Expand schemes_central.json** — 20 min
```bash
# Add ALL schemes from README
# Copy-paste the scheme list from README
```

4. **Create translation.json files** — 30 min
```javascript
// 7 language files with all UI strings
// Can use Google Translate for initial draft
```

5. **Create LoadingSpinner.jsx** — 5 min
```javascript
// Simple spinning loader component
```

6. **Add more API calls to services** — 20 min
```javascript
// profileService.getCompleteness()
// schemeService.getEligibleSchemes()
// etc.
```

---

## 🔍 DEBUGGING COMMON ISSUES

### Backend Error: "ModuleNotFoundError: No module named 'google.generativeai'"
```bash
pip install google-generativeai
```

### Frontend: "Cannot find module '@react-pdf/renderer'"
```bash
npm install @react-pdf/renderer
```

### Backend: "jwt.exceptions.JWTError: Token is invalid or expired"
→ Refresh token has expired (7 days). User needs to login again.

### Frontend: API returns 401 without retry
→ Check that refresh interceptor is set up in `api.js`

### OCR not extracting data
→ Check GEMINI_API_KEY is set in .env
→ Test with: `python backend/test_ocr.py`

### Database locked/corrupted
```bash
# Delete and recreate
rm backend/yojanamitra.db
cd backend
alembic upgrade head
python ../seed_data/seed_db.py
```

---

## 📚 LEARNING RESOURCES

- **FastAPI:** https://fastapi.tiangolo.com/tutorial/
- **React:** https://react.dev/learn
- **Zustand:** https://github.com/pmndrs/zustand
- **SQLAlchemy:** https://docs.sqlalchemy.org/
- **Tailwind:** https://tailwindcss.com/docs
- **Gemini API:** https://ai.google.dev/docs

---

## 🎓 IMPLEMENTATION ORDER (Recommended)

For fastest completion:

1. ✅ Backend foundation (done)
2. ✅ Authentication (done)
3. **Complete Profile UI** (1-2 days)
4. **Scheme Results UI** (1-2 days)
5. **Document Upload UI** (1 day)
6. **Onboarding Wizard** (2 days)
7. Scheme Scraper (1 day)
8. Admin Panel (2 days)
9. Translations (1 day)
10. Polish + Deployment (1 day)

**Total: 10-12 days for solo developer**

---

## ✨ FINAL NOTES

- **Ask for Help:** Every file here has clear docstrings and comments
- **Test Often:** Use Swagger at /api/v1/docs to test endpoints
- **Commit Often:** Git commit after each component
- **Mobile First:** Test on mobile simulator in DevTools
- **Performance:** Use React.memo() for list items

**You've got this! 🚀**

Build one component at a time, test it, then move on. Progress compounds.

