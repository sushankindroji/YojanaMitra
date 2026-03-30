# YojanaMitra - Quick Start Checklist

## 🚀 Get Running (5 min)

- [ ] **Start Backend**
  ```bash
  cd backend
  source venv/bin/activate  # or venv\Scripts\activate on Windows
  uvicorn app.main:app --reload --port 8000
  ```
  ✅ Should see: "Uvicorn running on http://127.0.0.1:8000"

- [ ] **Start Frontend**
  ```bash
  cd frontend
  npm install  # if not done yet
  npm run dev
  ```
  ✅ Should see: "VITE v... ready in ... ms"

- [ ] **Verify Both Running**
  - Backend: http://localhost:8000/docs (Swagger UI)
  - Frontend: http://localhost:5173 (React app)

- [ ] **Seed Schemes Database**
  ```bash
  cd backend
  python ../seed_data/seed_db.py
  ```
  ✅ Should see: "✅ Added: PM-KISAN", "✅ Added: PM-YASASVI", etc.

---

## 🧪 Test Auth Flow (2 min)

- [ ] Visit http://localhost:5173
- [ ] Click "Register"
- [ ] Fill form:
  - Name: Test User
  - Email: test@example.com
  - Password: Test@123
- [ ] Click "Register"
- [ ] ✅ Should redirect to /dashboard
- [ ] Check browser DevTools → Application tab → localStorage → see `access_token` and `refresh_token`

---

## 📋 Phase-by-Phase Completion

### ✅ Phase 1: Foundation (DONE)
- ✅ Database models (8 tables)
- ✅ Pydantic schemas (all endpoints)
- ✅ Security (JWT, encryption, audit)
- ✅ Configuration (.env, config.py)

### ✅ Phase 2: Authentication (DONE)
- ✅ Password-based login/register
- ✅ OTP-based login (mock)
- ✅ JWT token generation
- ✅ Token refresh flow
- ✅ Frontend forms (LoginForm, RegisterForm)
- ✅ Protected routes (ProtectedRoute)

### 🟡 Phase 3: Document Upload (IN PROGRESS)

Backend Done ✅:
- ✅ File encryption/decryption
- ✅ Upload endpoint
- ✅ OCR services (Gemini + Tesseract stubs)
- ✅ Background processing

Frontend TODO:
- [ ] **DocumentUploader.jsx** (drag-and-drop + file select)
  - Accepts: JPEG, PNG, PDF
  - Shows upload progress
  - Calls documentService.uploadDocument()
  - Estimated: 80 lines

- [ ] **CameraCapture.jsx** (react-webcam integration)
  - Live camera view
  - Capture photo
  - Convert to blob
  - Estimated: 60 lines

- [ ] **DocumentPreview.jsx** (image display)
  - Shows uploaded/captured image
  - Rotate/crop buttons *(optional)*
  - Estimated: 40 lines

- [ ] **ExtractionReview.jsx** (confirm extracted data)
  - Display extracted fields from OCR
  - Show confidence scores
  - Allow manual corrections
  - Confirm/cancel buttons
  - Estimated: 100 lines

- [ ] **UploadDocuments.jsx** (page + workflow)
  - Stepper: Select → Capture/Upload → Preview → Review
  - Manage state across components
  - Call API to save extracted data
  - Estimated: 120 lines

**Phase 3 Effort:** ~5 hours for experienced dev, ~8 hours for learning

---

### 🟡 Phase 4: Profile System (IN PROGRESS)

Backend Done ✅:
- ✅ Profile GET/PUT endpoints
- ✅ Completeness calculation
- ✅ Optional questions endpoint

Frontend TODO:
- [ ] **ProfileForm.jsx** (editable profile form)
  - 30+ fields organized in tabs/sections
  - Auto-fill from extracted documents
  - Show confidence badges
  - Estimated: 200 lines

- [ ] **OptionalQuestions.jsx** (dynamic sections)
  - Farmer questions (land size, crops, etc.)
  - Student questions (degree, marks, etc.)
  - Disability questions (percentage, type, etc.)
  - Each section conditional on user type
  - Estimated: 150 lines

- [ ] **Profile.jsx** (page)
  - Show profile + completeness meter
  - Edit form with ProfileForm
  - Call profileService.updateProfile()
  - Estimated: 80 lines

- [ ] **Onboarding.jsx** (6-step wizard)
  - Step 1: Welcome + skip option
  - Step 2: Upload documents (DocumentUploader)
  - Step 3: Processing... (check extraction_status)
  - Step 4: Review extracted data (ExtractionReview)
  - Step 5: Complete profile (ProfileForm)
  - Step 6: Optional questions (OptionalQuestions)
  - Summary + finish button
  - Estimated: 300 lines

**Phase 4 Effort:** ~8 hours for experienced dev, ~12 hours for learning

---

### 🟡 Phase 5: Scheme Discovery (IN PROGRESS)

Backend Done ✅:
- ✅ Schemes list endpoint with filtering
- ✅ Eligible schemes endpoint
- ✅ Eligibility checker (EligibilityAgent)
- ✅ Seed schemes database

Frontend TODO:
- [ ] **SchemeCard.jsx** (single scheme display)
  - Show name, ministry, sector
  - Benefit amount badge
  - Eligibility indicator (✅/⚠️/❌)
  - "View Details" button
  - Estimated: 80 lines

- [ ] **SchemeFilter.jsx** (filter sidebar)
  - Filter by sector
  - Filter by state
  - Search by name
  - Apply/clear filters
  - Estimated: 100 lines

- [ ] **SchemeResults.jsx** (main schemes page)
  - Call schemeService.getEligibleSchemes()
  - Show SchemeCard for each
  - Include SchemeFilter
  - Pagination (20 per page)
  - Sort by eligibility %
  - Estimated: 120 lines

- [ ] **EligibilityBadges.jsx** (per-condition status)
  - Parse condition_results from API
  - Show badge for each condition
  - Color code: ✅ green, ❌ red, ⚠️ yellow
  - Hover tooltip with details
  - Estimated: 80 lines

- [ ] **EligibilitySummary.jsx** (plain-language explanation)
  - Display explanation_user_lang from API
  - Formatted as bullet points
  - Show missing documents if any
  - Estimated: 60 lines

- [ ] **SchemeDetail.jsx** (full scheme page)
  - Call schemeService.getSchemeDetail(schemeId)
  - Call schemeService.getSchemeEligibility(schemeId)
  - Show all scheme info
  - Show EligibilityBadges for each condition
  - Show EligibilitySummary
  - Show application guide steps
  - "How to Apply" button → ApplyGuide page
  - Estimated: 150 lines

- [ ] **RiskAnalysis.jsx** (optional - show approval likelihood)
  - Display probability_pct from API
  - Show similar_users_pct (how many like user qualified?)
  - Show estimated_days (processing time)
  - Estimated: 80 lines

**Phase 5 Effort:** ~6 hours for experienced dev, ~10 hours for learning

---

### 📝 Phase 6: Applications & Tracking

**Backend TODO:**
- [ ] **app/routers/applications.py** (save/track applications)
  - POST /save (save draft application)
  - GET / (list user's applications)
  - GET /{id} (get single application)
  - DELETE /{id} (delete draft)
  - GET /{id}/prefilled (get pre-filled form)

- [ ] **app/agents/application_agent.py** (pre-fill forms)
  - Get saved document extractions
  - Get profile data
  - Generate pre-filled JSON for application form

**Frontend TODO:**
- [ ] **ApplyGuide.jsx** (guided application page)
  - Show scheme info + steps
  - Pre-filled form (from application_agent)
  - Step-by-step form filling
  - Save draft button
  - Submit button → acknowledgement

- [ ] **SavedApplications.jsx** (list saved drafts)
  - Show all saved applications
  - Filter by status (draft, submitted, acknowledged)
  - Edit draft button → ApplyGuide
  - Delete button
  - View acknowledgement button

---

### 📝 Phase 7: Scheme Scraping (Optional but Recommended)

**Backend TODO:**
- [ ] **app/services/scraper_service.py** (myscheme.gov.in scraper)
  ```python
  # Fetch schemes from myscheme API
  # Parse JSON response
  # Convert free-text eligibility to structured rules using Gemini
  # Compare with DB using hash to find new/updated schemes
  # Insert/update into DB
  # Return sync results
  ```

- [ ] **app/tasks/scheduler.py** (APScheduler job)
  ```python
  # Run nightly at 2AM IST
  # Call scraper_service.scrape_all()
  # Log results to scheme_sync_logs
  ```

- [ ] **app/routers/sync.py** (manual trigger)
  - POST /run (trigger scraper immediately)
  - GET /status (check last sync)

---

### 📝 Phase 8: Admin Panel

**Backend TODO:**
- [ ] **app/routers/admin.py** (admin endpoints)
  - GET /stats (total users, schemes, applications)
  - GET /users (list all users)
  - PUT /users/{id}/deactivate (disable user)
  - POST /schemes (create scheme)
  - PUT /schemes/{id} (edit scheme)
  - DELETE /schemes/{id} (delete scheme)
  - GET /audit-logs (view audit trail)

**Frontend TODO:**
- [ ] **pages/admin/AdminDashboard.jsx** (stats + overview)
  - Display dashboard stats
  - Manual sync button
  - Quick links to manage screens

- [ ] **pages/admin/ManageSchemes.jsx** (CRUD for schemes)
  - Table of all schemes
  - Search/filter
  - Add/edit/delete buttons
  - Bulk verify checkbox

- [ ] **pages/admin/ManageUsers.jsx** (user management)
  - Table of all users
  - View profile completeness
  - Deactivate/delete user
  - View audit logs for user

---

### 📝 Phase 9: Translations (Multilingual Support)

**Create 7 Translation Files:**

- [ ] **public/locales/en/translation.json** (English)
- [ ] **public/locales/hi/translation.json** (Hindi)
- [ ] **public/locales/te/translation.json** (Telugu)
- [ ] **public/locales/ta/translation.json** (Tamil)
- [ ] **public/locales/mr/translation.json** (Marathi)
- [ ] **public/locales/bn/translation.json** (Bengali)
- [ ] **public/locales/kn/translation.json** (Kannada)

**Process:**
1. Extract all hardcoded strings from .jsx files
2. Create structure with keys (e.g., `buttons.register`, `pages.dashboard.title`)
3. Translate to each language (Google Translate OK for initial draft)
4. Update .jsx files to use `useTranslation()` hook
5. Test language switcher in Navbar

**Time:** 4-6 hours (mostly copy-paste + Google Translate)

---

### 📝 Phase 10: Polish & Deployment

**Frontend Polish:**
- [ ] Add loading spinners (LoadingSpinner.jsx)
- [ ] Add error boundaries (ErrorBoundary.jsx)
- [ ] Add Navbar.jsx (logo, language switcher, profile button)
- [ ] Add Footer.jsx (links, social)
- [ ] Mobile responsive testing
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Dark mode option *(optional)*

**Backend Polish:**
- [ ] Add comprehensive error handling
- [ ] Add logging (requests/responses)
- [ ] Add data validation improvements
- [ ] Add rate limiting per endpoint
- [ ] Performance optimization (DB indexes, query optimization)

**Testing:**
- [ ] Unit tests (backend routers)
- [ ] Integration tests (auth flow → profile → schemes)
- [ ] E2E tests (Playwright or Cypress)
- [ ] Manual QA on mobile + desktop

**Deployment:**
- [ ] Backend to Render.com (free tier)
- [ ] Frontend to Vercel (free tier)
- [ ] Setup production .env
- [ ] Configure database backups
- [ ] Setup monitoring/logs

---

## 📊 Progress Summary

| Phase | Task | Status | Est. Time | Priority |
|-------|------|--------|-----------|----------|
| 1 | Foundation | ✅ Done | N/A | N/A |
| 2 | Authentication | ✅ Done | N/A | N/A |
| 3 | Document Upload | 🟡 40% | 6-8 hrs | 🔴 High |
| 4 | Profile System | 🟡 10% | 8-12 hrs | 🔴 High |
| 5 | Scheme Discovery | 🟡 20% | 6-10 hrs | 🔴 High |
| 6 | Applications | 📝 0% | 4-6 hrs | 🟡 Medium |
| 7 | Scraping | 📝 0% | 4-6 hrs | 🟡 Medium |
| 8 | Admin Panel | 📝 0% | 6-8 hrs | 🟡 Medium |
| 9 | Translations | 📝 0% | 4-6 hrs | 🟢 Low |
| 10 | Deployment | 📝 0% | 4-6 hrs | 🟢 Low |

**Total Remaining: ~42-72 hours (5-9 days solo dev, ~2 weeks with learning)**

---

## 💡 Pro Tips

1. **Build One Component at a Time**
   - Finish complete → Test → Commit → Next
   - Don't try to build all 20 components simultaneously

2. **Test After Each Component**
   - DevTools Network tab to verify API calls
   - Browser console for errors
   - Swagger UI to test API endpoints manually

3. **Use Placeholder Data**
   - Mock API responses while testing frontend
   - Use `localStorage` to test auth flow without backend

4. **Commit Often**
   ```bash
   git add .
   git commit -m "feat: add ProfileForm component"
   ```

5. **Reference Existing Components**
   - Use LoginForm.jsx as template for ProfileForm.jsx
   - Use Landing.jsx as template for other pages
   - Copy patterns from existing routers

6. **Performance First**
   - Use React.memo() for large lists
   - Implement pagination (20 items per page)
   - Lazy load routes with React.lazy()

7. **Accessibility**
   - Add `aria-label` attributes
   - Use semantic HTML (button, form, etc.)
   - Test with keyboard navigation only

---

## 🆘 Getting Help

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Backend not starting | Check Python version (3.11+), reinstall venv |
| Frontend blank page | Check console for errors, `npm install` |
| API 500 errors | Check .env variables, check backend logs |
| JWT invalid | Restart both servers, clear localStorage |
| OCR not working | Check GEMINI_API_KEY, test with /docs |
| Tailwind not applying | Run `npm run build` to check for errors |

**Resources:**
- Swagger API docs: http://localhost:8000/docs
- React docs: https://react.dev/learn
- Tailwind docs: https://tailwindcss.com/docs
- FastAPI docs: https://fastapi.tiangolo.com/

---

## 🎉 Next Action

**Start with Phase 3, Component 1:**

```bash
# Create DocumentUploader.jsx
cd frontend/src/components/documents
# [Create DocumentUploader.jsx with drag-and-drop]
```

**Then test:**
1. Upload document in browser
2. Check DevTools Network → POST /api/v1/documents/upload
3. Check backend logs for processing
4. Verify file in backend/uploads/{user_id}/

**You've got this! 🚀**

