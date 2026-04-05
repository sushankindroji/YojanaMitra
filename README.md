# 🇮🇳 YojanaMitra — "Your Scheme, Your Right"

**Apni Yojana, Apna Haq** — An intelligent government scheme recommendation platform for Indian citizens.

## 📚 Project Overview

YojanaMitra is a production-ready web application that helps millions of Indian citizens discover and apply for government welfare schemes they're eligible for. It combines OCR-based document processing, AI-powered eligibility analysis, and multilingual guidance to make government benefits accessible to everyone.

**Key Features:**
- 📄 Upload and OCR government documents (Aadhaar, income certificates, etc.)
- 🤖 AI-powered eligibility matching against 200+ schemes
- 🌍 7-language support (English, Hindi, Telugu, Tamil, Marathi, Bengali, Kannada)
- 📱 Fully responsive — works on any browser, mobile or desktop
- 🔒 End-to-end encryption for sensitive documents
- ⚡ Production PostgreSQL + local storage

---

## 🏗️ PHASE 1: FOUNDATION — Getting Started

### 1.1 Prerequisites

- **Python 3.11+** 
- **Node.js 18+** & npm
- **Git**
- **Tesseract OCR** (optional, for local OCR fallback)
- **Gemini API Key** (free from aistudio.google.com)

### 1.2 Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Generate required secrets
python -c "import secrets; print('SECRET_KEY:', secrets.token_hex(32))"
python -c "import os,base64; print('ENCRYPTION_KEY:', base64.b64encode(os.urandom(32)).decode())"

# Copy .env file and update with your values
cp .env.example .env
# Edit .env and set:
# - GEMINI_API_KEY (get from aistudio.google.com)
# - SECRET_KEY (generated above)
# - ENCRYPTION_KEY (generated above)
# - Other optional values

# Initialize database
alembic upgrade head

# Seed 200+ schemes
python ../seed_data/seed_db.py

# Run backend
uvicorn app.main:app --reload --port 8000
```

Backend will be running at `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

### 1.3 Frontend Setup

```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env:
# VITE_API_BASE_URL=http://localhost:8000

# Run development server
npm run dev
```

Frontend will be running at `http://localhost:5173`

### 1.4 Verify Setup

1. Open http://localhost:5173 in browser
2. You should see YojanaMitra landing page
3. Try registering with email/phone
4. Check backend logs for connectivity

---

## 🏃 PHASE 2-10: BUILD ORDER & IMPLEMENTATION GUIDE

### Phase 2: Authentication (COMPLETED ✅)
- [x] Backend: JWT tokens, password hashing, OTP flow
- [x] Backend: Google OAuth stub
- [ ] Frontend: Login/Register/OTP pages
- [ ] Frontend: Protected route wrapper

**Remaining Files:**
- Frontend pages: [frontend/src/pages/Login.jsx](./frontend/src/pages/Login.jsx), [Register.jsx](./frontend/src/pages/Register.jsx)
- Frontend component: [ProtectedRoute.jsx](./frontend/src/components/common/ProtectedRoute.jsx)

### Phase 3: Document Upload + OCR
**Backend:**
- Create [app/services/ocr_service.py](./backend/app/services/ocr_service.py) — Gemini Vision API + Tesseract fallback
- Create [app/services/extraction_service.py](./backend/app/services/extraction_service.py) — spaCy NLP + regex parsing
- Create [app/agents/profile_agent.py](./backend/app/agents/profile_agent.py) — orchestrates OCR → extraction → profile update
- Create [app/routers/documents.py](./backend/app/routers/documents.py) — upload, download, reprocess endpoints
- Add to [main.py](./backend/app/main.py): `app.include_router(documents.router, prefix="/api/v1/documents")`

**Frontend:**
- Create [DocumentUploader.jsx](./frontend/src/components/documents/DocumentUploader.jsx) — file + camera upload
- Create [CameraCapture.jsx](./frontend/src/components/documents/CameraCapture.jsx) — webcam integration
- Create [DocumentPreview.jsx](./frontend/src/components/documents/DocumentPreview.jsx)
- Create [ExtractionReview.jsx](./frontend/src/components/documents/ExtractionReview.jsx) — edit extracted data
- Create [pages/UploadDocuments.jsx](./frontend/src/pages/UploadDocuments.jsx)

### Phase 4: Profile System
**Backend:**
- Create [app/routers/profile.py](./backend/app/routers/profile.py) — read, update, calculate completeness
- Add to [main.py](./backend/app/main.py): `app.include_router(profile.router, prefix="/api/v1/profile")`

**Frontend:**
- Create [ProfileForm.jsx](./frontend/src/components/profile/ProfileForm.jsx)
- Create [ProfileCard.jsx](./frontend/src/components/profile/ProfileCard.jsx)
- Create [OptionalQuestions.jsx](./frontend/src/components/profile/OptionalQuestions.jsx)
- Create [pages/Profile.jsx](./frontend/src/pages/Profile.jsx)
- Create [pages/Onboarding.jsx](./frontend/src/pages/Onboarding.jsx) — 6-step wizard

### Phase 5: Scheme Database + Scraper
**Backend:**
- Create [seed_data/schemes_central.json](./seed_data/schemes_central.json) — 200+ central schemes
- Create [seed_data/schemes_states.json](./seed_data/schemes_states.json) — state schemes
- Create [seed_data/seed_db.py](./seed_data/seed_db.py) — populate the active database from JSON
- Create [app/services/scraper_service.py](./backend/app/services/scraper_service.py) — nightly myscheme.gov.in scraper
- Create [app/tasks/scheduler.py](./backend/app/tasks/scheduler.py) — APScheduler nightly job (2AM IST)
- Create [app/routers/sync.py](./backend/app/routers/sync.py) — manual sync trigger

**File:** [backend/app/routers/sync.py](./backend/app/routers/sync.py)

### Phase 6: Eligibility + Recommendation
**Backend:**
- Create [app/agents/eligibility_agent.py](./backend/app/agents/eligibility_agent.py) — rule-based eligibility checker
- Create [app/agents/recommendation_agent.py](./backend/app/agents/recommendation_agent.py) — Gemini ranking + explanation
- Create [app/routers/schemes.py](./backend/app/routers/schemes.py) — list, filter, eligible, detail
- Add to [main.py](./backend/app/main.py): `app.include_router(schemes.router, prefix="/api/v1/schemes")`

**Frontend:**
- Create [SchemeCard.jsx](./frontend/src/components/schemes/SchemeCard.jsx)
- Create [EligibilityBadges.jsx](./frontend/src/components/schemes/EligibilityBadges.jsx) — per-condition badges
- Create [EligibilitySummary.jsx](./frontend/src/components/schemes/EligibilitySummary.jsx) — Gemini explanation
- Create [RiskAnalysis.jsx](./frontend/src/components/schemes/RiskAnalysis.jsx) — probability, timing
- Create [SchemeFilter.jsx](./frontend/src/components/schemes/SchemeFilter.jsx)
- Create [pages/SchemeResults.jsx](./frontend/src/pages/SchemeResults.jsx)
- Create [pages/SchemeDetail.jsx](./frontend/src/pages/SchemeDetail.jsx)

### Phase 7: Application Guidance + Dashboard
**Backend:**
- Create [app/agents/application_agent.py](./backend/app/agents/application_agent.py) — pre-fill forms
- Create [app/routers/applications.py](./backend/app/routers/applications.py) — save, track, prefill

**Frontend:**
- Create [ApplicationStepper.jsx](./frontend/src/components/schemes/ApplicationStepper.jsx)
- Create [pages/ApplyGuide.jsx](./frontend/src/pages/ApplyGuide.jsx)
- Create [Dashboard.jsx](./frontend/src/pages/Dashboard.jsx) — home page
- Create dashboard widgets: [AlertCard](./frontend/src/components/dashboard/AlertCard.jsx), [ApplicationTracker](./frontend/src/components/dashboard/ApplicationTracker.jsx), [DeadlineReminder](./frontend/src/components/dashboard/DeadlineReminder.jsx)

### Phase 8: Admin Panel
**Backend:**
- Create [app/routers/admin.py](./backend/app/routers/admin.py) — scheme CRUD, stats, user management

**Frontend:**
- Create [pages/admin/AdminDashboard.jsx](./frontend/src/pages/admin/AdminDashboard.jsx)
- Create admin components: [ManageSchemes](./frontend/src/pages/admin/ManageSchemes.jsx), [ManageUsers](./frontend/src/pages/admin/ManageUsers.jsx)

### Phase 9: Polish + Security
- Add audit logging on all sensitive actions
- Rate limiting (already in place via slowapi)
- Translate all UI to 7 languages
- Add loading/error/empty states to all pages
- Create [PrivacyPolicy.jsx](./frontend/src/pages/PrivacyPolicy.jsx) page

### Phase 10: Deployment
- Deploy backend to Render (see deployment section below)
- Deploy frontend to Vercel
- End-to-end testing

---

## 📁 PROJECT STRUCTURE

```
yojanamitra/
├── backend/
│   ├── app/
│   │   ├── main.py                    ✅ Created
│   │   ├── config.py                  ✅ Created
│   │   ├── database.py                ✅ Created
│   │   ├── dependencies.py            ✅ Created
│   │   ├── models/                    ✅ All 8 models created
│   │   ├── schemas/                   ✅ Auth, Profile, Document, Scheme
│   │   ├── routers/
│   │   │   ├── auth.py                ✅ Created
│   │   │   ├── documents.py           📝 Needs OCR integration
│   │   │   ├── profile.py             📝 To create
│   │   │   ├── schemes.py             📝 To create
│   │   │   ├── applications.py        📝 To create
│   │   │   ├── admin.py               📝 To create
│   │   │   └── sync.py                📝 To create
│   │   ├── agents/                    📝 All 4 agents to create
│   │   ├── services/
│   │   │   ├── auth_service.py        ✅ Created
│   │   │   ├── storage_service.py     ✅ Created
│   │   │   ├── ocr_service.py         📝 To create
│   │   │   ├── extraction_service.py  📝 To create
│   │   │   ├── scraper_service.py     📝 To create
│   │   │   └── gemini_service.py      📝 To create
│   │   ├── core/                      ✅ Security, encryption, audit
│   │   └── tasks/                     📝 Scheduler to create
│   ├── uploads/                       ✅ Folder created (encrypted files)
│   ├── requirements.txt               ✅ Created
│   └── .env.example                   ✅ Created
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                📝 Navbar, Footer, ProtectedRoute
│   │   │   ├── auth/                  📝 Forms, OTP input, Google button
│   │   │   ├── documents/             📝 Upload, camera, preview
│   │   │   ├── profile/               📝 Forms, badges, wizard
│   │   │   ├── schemes/               📝 Cards, filters, eligibility
│   │   │   └── dashboard/             📝 Widgets
│   │   ├── pages/                     📝 All 15+ pages to create
│   │   ├── store/                     ✅ Zustand stores created
│   │   ├── services/                  ✅ API services created
│   │   ├── hooks/                     📝 useAuth, useCamera
│   │   ├── utils/                     ✅ Constants created
│   │   ├── i18n.js                    ✅ Created (translations pending)
│   │   ├── App.jsx                    ✅ Created (routes pending)
│   │   └── index.css                  ✅ Created
│   ├── public/locales/                ✅ Folders created (JSON pending)
│   ├── package.json                   ✅ Created
│   ├── vite.config.js                 ✅ Created
│   ├── tailwind.config.js             ✅ Created
│   └── .env.example                   ✅ Created
│
├── seed_data/
│   ├── schemes_central.json           📝 200+ central schemes
│   ├── schemes_states.json            📝 State-specific schemes
│   └── seed_db.py                     📝 Populate database
│
├── .gitignore                         📝 To create
└── README.md                          ✅ This file
```

**Status:** ✅ = Done | 📝 = Remaining

---

## 🚀 QUICK START

### Start Backend (Terminal 1)
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

### Test API
```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 🔑 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/yojanamitra
SECRET_KEY=<generated-64-char-hex>
ENCRYPTION_KEY=<generated-base64-32-bytes>
GEMINI_API_KEY=<your-gemini-api-key>
GOOGLE_CLIENT_ID=<optional>
GOOGLE_CLIENT_SECRET=<optional>
ENVIRONMENT=development
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=<optional>
```

---

## 🌐 API ENDPOINTS

```
Authentication
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/send-otp
POST   /api/v1/auth/verify-otp
GET    /api/v1/auth/me
POST   /api/v1/auth/logout

Documents
POST   /api/v1/documents/upload
GET    /api/v1/documents
GET    /api/v1/documents/{doc_id}
DELETE /api/v1/documents/{doc_id}
GET    /api/v1/documents/{doc_id}/download
POST   /api/v1/documents/{doc_id}/reprocess

Profile
GET    /api/v1/profile
PUT    /api/v1/profile
GET    /api/v1/profile/completeness
POST   /api/v1/profile/optional-questions

Schemes
GET    /api/v1/schemes
GET    /api/v1/schemes/eligible
GET    /api/v1/schemes/partially-eligible
GET    /api/v1/schemes/{scheme_id}
GET    /api/v1/schemes/{scheme_id}/eligibility
GET    /api/v1/schemes/{scheme_id}/apply-guide
POST   /api/v1/schemes/check-all
GET    /api/v1/schemes/search?q=

Applications
POST   /api/v1/applications/save-scheme
GET    /api/v1/applications
GET    /api/v1/applications/stats/summary
GET    /api/v1/applications/{app_id}
PATCH  /api/v1/applications/{app_id}
DELETE /api/v1/applications/{app_id}

Eligibility
POST   /api/v1/eligibility/check
GET    /api/v1/eligibility/schemes
GET    /api/v1/eligibility/top
GET    /api/v1/eligibility/summary
GET    /api/v1/eligibility/scheme/{scheme_code}
POST   /api/v1/eligibility/recalculate

Admin
GET    /api/v1/admin/dashboard/stats
GET    /api/v1/admin/users
GET    /api/v1/admin/schemes
GET    /api/v1/admin/applications
PATCH  /api/v1/admin/users/{user_id}/role
GET    /api/v1/admin/audit-logs
```

---

## 🧠 AI/ML INTEGRATION

### Gemini 1.5 Flash
Used for:
- **OCR from images** — extract text + structured fields from documents
- **Eligibility explanations** — generate plain-language "why you qualify"
- **Scheme ranking** — rank schemes by relevance to user
- **Field extraction** — intelligent parsing of ambiguous data

Example:
```python
# app/services/gemini_service.py
import google.generativeai as genai

class GeminiService:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    async def extract_from_image(self, image_bytes, prompt):
        """Extract structured data from document image."""
        import base64
        image_data = base64.b64encode(image_bytes).decode()
        response = self.model.generate_content([
            {"mime_type": "image/jpeg", "data": image_data},
            prompt,
        ])
        return json.loads(response.text)
```

### spaCy + Regex
Used for:
- **Named entity recognition** — extract names, addresses, dates
- **Pattern matching** — Aadhaar (12 digits), PAN, income amounts
- **Fallback parsing** — if Gemini fails or for offline use

---

## 🔐 SECURITY CHECKLIST

- [x] AES-256 encryption for uploaded files
- [x] JWT tokens (30-min access, 7-day refresh)
- [x] bcrypt password hashing
- [x] Rate limiting (slowapi)
- [x] CORS configured
- [x] SQLAlchemy ORM (no raw SQL)
- [ ] HTTPS on production
- [ ] Audit logging (in models, not in routers yet)
- [ ] Account deletion endpoint
- [ ] Sensitive data masked in logs

---

## 📊 DATABASE

### PostgreSQL
- **Location:** local or managed PostgreSQL instance
- **Tables:** 8 (User, Profile, Document, Scheme, EligibilityResult, SavedApplication, AuditLog, SchemeSyncLog)
- **Production ready**

### Create Database
```bash
cd backend
python -m alembic init alembic  # (already initialized)
python -m alembic revision --autogenerate -m "Initial migration"
python -m alembic upgrade head
```

---

## 🧪 TESTING

### Backend
```bash
pip install pytest pytest-asyncio
pytest backend/tests/
```

### Frontend
```bash
npm test
```

---

## 🌍 DEPLOYMENT

Deployment target is **Render (backend)** + **Vercel (frontend)** with **no Docker**.

### Backend (Render, no Docker)
1. Push repo to GitHub.
2. In Render, create a new **Web Service** using repository root directory `backend`.
3. Use the provided [render.yaml](render.yaml) blueprint, or set commands manually:
  Build command: `pip install -r requirements.txt`
  Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Configure required env vars:
  `ENVIRONMENT=production`
  `DEBUG=false`
  `DATABASE_URL=<render-postgres-url>`
  `SECRET_KEY=<secure-random-value>`
  `ENCRYPTION_KEY=<base64-32-byte-key>`
  `ALLOWED_ORIGINS=https://<your-vercel-domain>`
  `AUTO_RUN_MIGRATIONS=true`
  `GEMINI_API_KEY=<optional-but-recommended>`
5. Verify backend health at `/health` and API docs at `/docs`.

### Frontend (Vercel)
1. Import only `frontend` as the Vercel project root.
2. Keep [frontend/vercel.json](frontend/vercel.json) for SPA rewrites.
3. Set env var:
  `VITE_API_BASE_URL=https://<your-render-backend-domain>`
4. Deploy and validate login/profile/schemes flows against Render backend.

---

## 📞 SUPPORT & DEBUGGING

### Backend not starting?
```bash
# Check Python version
python --version  # Should be 3.11+

# Check activevenv
echo $VIRTUAL_ENV  # Should show path

# Check DB file
ls -la backend/yojanamitra.db

# Check logs
# (look in terminal output for errors)
```

### Frontend won't connect to backend?
- Check `VITE_API_BASE_URL` in `.env`
- Check CORS in `backend/app/main.py`
- Check backend is running on port 8000
- Open DevTools → Network tab → see API calls

### OCR not extracting data?
- Ensure `GEMINI_API_KEY` is set correctly
- Test with: `python backend/app/services/gemini_service.py`
- Check document quality (clear, well-lit, readable text)

---

## 📚 REFERENCES

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [Gemini API](https://ai.google.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [spaCy NLP](https://spacy.io/)

---

## 📝 LICENSE

This project is built for educational and demonstration purposes as a college final-year project.

---

## 👥 CONTRIBUTORS

Built with ❤️ for Indian citizens.

**Tagline:** *Apni Yojana, Apna Haq* — Your Scheme, Your Right

---

## NEXT STEPS

1. ✅ Read this README start-to-end
2. ✅ Run backend + frontend locally
3. ✅ Test auth endpoints
4. 📝 Create remaining routers (see Phase 2-10 above)
5. 📝 Create remaining React components
6. 📝 Populate translation files (7 languages)
7. 📝 Create seed schemes JSON files
8. 🚀 Deploy to Render + Vercel

**Estimated completion:** 3-4 weeks for a team of 2-3 developers, or 6-8 weeks solo.

Happy coding! 🚀
