# YojanaMitra — Complete Project Documentation

**Status**: ✅ **PRODUCTION READY** (v1.0)  
**Last Updated**: 2026-04-27  
**Deployment Model**: Backend on Render, Frontend on Vercel

---

## 📑 Table of Contents

1. [Product Overview](#1-product-overview)
2. [Quick Start (5 minutes)](#2-quick-start-5-minutes)
3. [Architecture & Deployment](#3-architecture--deployment)
4. [Repository Structure](#4-repository-structure)
5. [Local Development Setup](#5-local-development-setup)
6. [Environment Variables](#6-environment-variables)
7. [Backend Reference](#7-backend-reference)
8. [Frontend Reference](#8-frontend-reference)
9. [API Endpoints](#9-api-endpoints)
10. [Database & Migrations](#10-database--migrations)
11. [Authentication & Security](#11-authentication--security)
12. [Document Processing & OCR](#12-document-processing--ocr)
13. [Testing & Verification](#13-testing--verification)
14. [Deployment Checklist](#14-deployment-checklist)
15. [Production Operations](#15-production-operations)
16. [Troubleshooting Guide](#16-troubleshooting-guide)

---

## 1. Product Overview

**YojanaMitra** is an AI-assisted government scheme discovery and eligibility platform for Indian citizens.

### Core Features
- **Scheme Discovery**: 4,504+ schemes across states and sectors
- **Profile-Aware Eligibility**: ML-powered eligibility matching with explainable results
- **Document Processing**: OCR-assisted data extraction from Aadhaar, PAN, income certificates, etc.
- **Multilingual Support**: 7 languages (English, Hindi, Tamil, Telugu, Bengali, Kannada, Marathi)
- **Saved Applications**: Track and manage submitted applications
- **Explainable AI**: Clear reasoning for why schemes match/don't match

### User Journeys
1. **Discover**: Browse 4,504+ schemes without login
2. **Register/Login**: Create account with email + password
3. **Onboarding**: Complete profile (age, state, income, occupation, documents)
4. **Analyze**: Run eligibility pipeline for personalized recommendations
5. **Track**: Save applications and monitor status
6. **Apply**: Get step-by-step guidance to apply for matched schemes

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy + Pydantic |
| Database | PostgreSQL 13+ |
| Document Processing | Tesseract OCR, OpenCV, pdfplumber, Pillow |
| Deployment | Render (backend), Vercel (frontend) |
| Auth | JWT (access + refresh tokens) |

---

## 2. Quick Start (5 minutes)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally
- Tesseract OCR (optional for local development)

### Backend (PowerShell)
```powershell
Set-Location E:\sushank-projects\YojanaMitra

# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r backend\requirements.txt

# 3. Setup environment
Copy-Item backend\.env.example backend\.env
# Edit backend\.env with your DATABASE_URL and SECRET_KEY

# 4. Run migrations
cd backend
python -m alembic upgrade head

# 5. Start server (with auto-reload)
python run.py
```

Server runs on: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

### Frontend (PowerShell)
```powershell
cd E:\sushank-projects\YojanaMitra\frontend

# 1. Install dependencies
npm install

# 2. Setup environment
Copy-Item .env.example .env
# Edit .env — critical: set VITE_API_BASE_URL=http://localhost:8000

# 3. Start dev server
npm run dev
```

App runs on: http://localhost:5173

---

## 3. Architecture & Deployment

### System Design
```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Vercel)                     │
│  React 18 SPA + Vite + Tailwind + Axios interceptors        │
│  Languages: EN, HI, TA, TE, BN, KN, MR                      │
│  Storage: localStorage (session state, favorites)            │
└──────────────────┬──────────────────────────────────────────┘
                   │
          JWT Token (Authorization header)
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend (Render)                             │
│  FastAPI + SQLAlchemy ORM + Pydantic validation             │
│  Rate limiting, JWT validation, file upload security        │
└──┬───────┬────────────┬──────────────┬──────────────────┬───┘
   │       │            │              │                  │
   ▼       ▼            ▼              ▼                  ▼
┌─────┐ ┌──────┐ ┌────────────┐ ┌─────────┐ ┌──────────────┐
│Auth │ │Schemes
│     │ │Catalog
│     │ │        │ Eligibility │Onboarding│Document Proc │
│     │ │        │  Pipeline   │          │& OCR         │
└─────┘ └──────┘ └────────────┘ └─────────┘ └──────────────┘
   │
   ▼
┌──────────────────────────────────────┐
│     PostgreSQL Database              │
│  - Users & Auth                      │
│  - Schemes (4,504)                   │
│  - Eligibility Results               │
│  - Audit Logs                        │
│  - File Metadata                     │
└──────────────────────────────────────┘

File Storage: ./backend/uploads/{user_id}/* (AES-256 encrypted)
Logs: ./backend/logs/yojanamitra.log
```

### Request Flow
1. Frontend → `/api/v1/auth/register` → Backend creates user, returns JWT
2. Frontend stores tokens → subsequent requests include `Authorization: Bearer {token}`
3. Backend validates token → loads user context → processes request
4. On document upload: validate (size/type/filename) → encrypt → store → OCR → extract fields
5. Eligibility pipeline: profile validation → scheme matching → ranking → explanations → persist
6. Frontend receives results → render dashboard with eligibility list

### Deployment Architecture
```
Production (Render + Vercel + PostgreSQL):
- Backend: yojanamitra-api.render.com (FastAPI + Gunicorn)
- Frontend: yojanamitra.vercel.app (Static React app)
- Database: PostgreSQL on AWS RDS or Render Postgres
- Files: /var/www/yojanamitra/uploads (server-side, encrypted)

CI/CD: Git push → GitHub Actions → Build & deploy
```

---

## 4. Repository Structure

```
YojanaMitra/
├── README.md                          # This file
├── PROJECT.md                         # Comprehensive documentation (THIS FILE)
├── requirements.txt                   # Root-level Python deps (if any)
├── conftest.py                        # pytest configuration
├── pytest.ini                         # pytest settings
├── render.yaml                        # Render deployment config
├── vercel.json                        # Vercel deployment config
│
├── backend/
│   ├── run.py                         # Main entry point (dev server)
│   ├── requirements.txt               # Python dependencies
│   ├── alembic.ini                    # Alembic migration config
│   ├── .env.example                   # Environment template
│   │
│   ├── app/
│   │   ├── main.py                    # FastAPI app initialization
│   │   ├── config.py                  # Settings (loads from .env)
│   │   ├── database.py                # SQLAlchemy engine & session
│   │   ├── dependencies.py            # FastAPI dependency injections
│   │   ├── audit.py                   # Audit logging utilities
│   │   ├── rate_limiter.py            # Rate limiting middleware
│   │   ├── sanitizers.py              # Data sanitization
│   │   ├── upload_security.py         # File upload validation
│   │   │
│   │   ├── agents/                    # AI eligibility agents
│   │   │   ├── agent_orchestrator.py  # Main orchestration logic
│   │   │   ├── eligibility_agent.py   # Profile-scheme matching
│   │   │   ├── explanation_agent.py   # Generate explanations
│   │   │   ├── document_agent.py      # Document processing
│   │   │   └── job_store.py           # Result persistence
│   │   │
│   │   ├── core/                      # Core utilities
│   │   │   ├── security.py            # Password hashing, JWT
│   │   │   ├── encryption.py          # AES-256 encryption
│   │   │   ├── logging.py             # Structured logging
│   │   │   └── exceptions.py          # Custom exceptions
│   │   │
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   ├── user.py                # User & Profile
│   │   │   ├── scheme.py              # Scheme catalog
│   │   │   ├── document.py            # Document metadata
│   │   │   ├── eligibility_result.py  # Results & explanations
│   │   │   ├── application.py         # Saved applications
│   │   │   └── audit.py               # Audit log
│   │   │
│   │   ├── routers/                   # FastAPI route handlers
│   │   │   ├── auth.py                # Register, login, refresh
│   │   │   ├── profile.py             # Get/update user profile
│   │   │   ├── schemes.py             # List, search, detail schemes
│   │   │   ├── eligibility.py         # Run analysis pipeline
│   │   │   ├── documents.py           # Upload, extract, list docs
│   │   │   ├── applications.py        # Save/track applications
│   │   │   ├── health.py              # Health check endpoint
│   │   │   ├── admin.py               # Admin operations
│   │   │   ├── onboarding.py          # Guided onboarding flow
│   │   │   └── __init__.py            # Router aggregator
│   │   │
│   │   ├── schemas/                   # Pydantic request/response models
│   │   │   ├── user.py                # UserRegister, UserLogin, etc.
│   │   │   ├── scheme.py              # SchemeDetail, SchemeList, etc.
│   │   │   ├── eligibility.py         # EligibilityRequest, Result, etc.
│   │   │   └── document.py            # DocumentUpload, ExtractionResult
│   │   │
│   │   ├── services/                  # Business logic services
│   │   │   ├── eligibility_service.py # Profile matching algorithm
│   │   │   ├── document_service.py    # Document processing
│   │   │   ├── ocr_service.py         # OCR orchestration
│   │   │   └── scheme_service.py      # Scheme search & ranking
│   │   │
│   │   └── utils/                     # Utilities & helpers
│   │       ├── ocr_processor.py       # Tesseract integration
│   │       ├── pdf_processor.py       # PDF extraction
│   │       ├── image_processor.py     # Image preprocessing
│   │       ├── transliteration.py     # Script conversions
│   │       └── cache_utils.py         # Caching helpers
│   │
│   ├── alembic/                       # Database migrations
│   │   ├── versions/                  # Migration scripts
│   │   └── env.py                     # Migration environment
│   │
│   ├── tests/
│   │   ├── test_pipeline.py           # Full integration tests
│   │   ├── test_ocr_processor.py      # OCR unit tests
│   │   └── test_explainability.py     # Explainability unit tests
│   │
│   └── logs/
│       └── yojanamitra.log            # Application logs (generated)
│
├── frontend/
│   ├── package.json                   # npm dependencies
│   ├── vite.config.js                 # Vite configuration
│   ├── tailwind.config.js             # Tailwind CSS config
│   ├── index.html                     # HTML entry point
│   ├── .env.example                   # Environment template
│   │
│   ├── src/
│   │   ├── main.jsx                   # React app entry
│   │   ├── App.jsx                    # Root component
│   │   ├── index.css                  # Global styles
│   │   ├── i18n.js                    # Internationalization setup
│   │   │
│   │   ├── components/
│   │   │   ├── common/                # Shared components
│   │   │   ├── layout/                # Header, Sidebar, Footer
│   │   │   ├── auth/                  # Login, Register forms
│   │   │   ├── schemes/               # Scheme browse & detail
│   │   │   ├── eligibility/           # Results & ranking display
│   │   │   ├── documents/             # Upload & extraction UI
│   │   │   └── profile/               # User profile forms
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx               # Landing page
│   │   │   ├── Login.jsx              # Login page
│   │   │   ├── Register.jsx           # Registration page
│   │   │   ├── Dashboard.jsx          # User dashboard
│   │   │   ├── SchemeBrowse.jsx       # Scheme listing
│   │   │   ├── SchemeDetail.jsx       # Scheme details
│   │   │   ├── EligibilityResults.jsx # Analysis results
│   │   │   ├── Onboarding.jsx         # Guided setup
│   │   │   ├── Profile.jsx            # Edit profile
│   │   │   ├── Applications.jsx       # Saved applications
│   │   │   ├── NotFound.jsx           # 404 page
│   │   │   └── Admin.jsx              # Admin panel (if applicable)
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                 # axios instance & interceptors
│   │   │   ├── auth.js                # Auth API calls
│   │   │   ├── schemes.js             # Scheme API calls
│   │   │   ├── eligibility.js         # Analysis API calls
│   │   │   ├── documents.js           # Upload API calls
│   │   │   └── storage.js             # localStorage utilities
│   │   │
│   │   ├── store/
│   │   │   ├── authStore.js           # Auth state (Zustand/Context)
│   │   │   ├── schemeStore.js         # Scheme state
│   │   │   ├── profileStore.js        # Profile state
│   │   │   └── uiStore.js             # UI state (modals, loading)
│   │   │
│   │   ├── styles/
│   │   │   ├── animations.css         # Tailwind animations
│   │   │   ├── forms.css              # Form styling
│   │   │   └── tables.css             # Table styling
│   │   │
│   │   └── locales/
│   │       ├── en.json                # English strings
│   │       ├── hi.json                # Hindi strings
│   │       ├── ta.json                # Tamil strings
│   │       ├── te.json                # Telugu strings
│   │       ├── bn.json                # Bengali strings
│   │       ├── kn.json                # Kannada strings
│   │       └── mr.json                # Marathi strings
│   │
│   └── public/
│       ├── images/                    # Static images
│       ├── icons/                     # SVG icons
│       └── favicon.ico                # Browser tab icon
│
└── docs/                              # Additional documentation (optional)
    └── API_EXAMPLES.md                # cURL examples
```

---

## 5. Local Development Setup

### Step 1: Clone & Navigate
```bash
git clone https://github.com/your-org/YojanaMitra.git
cd YojanaMitra
```

### Step 2: Install System Dependencies (Windows with Tesseract)

**Windows 10/11:**
1. Download Tesseract installer: https://github.com/UB-Mannheim/tesseract/wiki
2. Run installer (default: `C:\Program Files\Tesseract-OCR`)
3. Verify: `tesseract --version`

**macOS:**
```bash
brew install tesseract tesseract-lang
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-hin  # Include language packs
tesseract --version
```

### Step 3: Backend Setup (PowerShell)
```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt

# Create .env from template
Copy-Item .env.example .env

# Edit .env with:
#   DATABASE_URL=postgresql://postgres:password@localhost:5432/yojanamitra
#   SECRET_KEY=your-random-32-char-secret-key-here
#   TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe  # Windows
#   VITE_API_BASE_URL=http://localhost:8000  # for frontend

# Run database migrations
python -m alembic upgrade head

# Start server
python run.py
# Server: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Step 4: Frontend Setup (PowerShell)
```powershell
cd ..\frontend

# Install Node dependencies
npm install

# Create .env from template
Copy-Item .env.example .env

# Edit .env with:
#   VITE_API_BASE_URL=http://localhost:8000

# Start dev server
npm run dev
# App: http://localhost:5173
```

### Step 5: Verify Setup
```bash
# Backend health
curl http://localhost:8000/health

# Frontend loads (in browser)
# http://localhost:5173

# Run tests
cd backend
python test_pipeline.py
```

---

## 6. Environment Variables

### Backend (.env)
```bash
# === Core ===
SECRET_KEY=your-random-secret-key-32-chars-min
ENVIRONMENT=development  # or production

# === Database ===
DATABASE_URL=postgresql://postgres:password@localhost:5432/yojanamitra
DB_POOL_SIZE=20
DB_POOL_TIMEOUT=30
DB_ECHO=false  # Set to true for SQL logging

# === OCR & Files ===
TESSERACT_CMD=/usr/bin/tesseract  # Linux: /usr/bin/tesseract
# TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe  # Windows
OCR_ENABLED=true
OCR_LANGUAGE=eng+hin  # Include language packs

# === Security ===
JWT_ALGORITHM=HS256
JWT_ACCESS_EXPIRE_MINUTES=30
JWT_REFRESH_EXPIRE_DAYS=7
PASSWORD_MIN_LENGTH=8
UPLOAD_MAX_SIZE_MB=10
UPLOAD_ALLOWED_EXTENSIONS=pdf,jpg,jpeg,png,doc,docx

# === CORS ===
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# === Rate Limiting ===
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# === Logging ===
LOG_LEVEL=INFO
LOG_FILE=logs/yojanamitra.log

# === Feature Flags ===
AUTO_RUN_MIGRATIONS=true  # Run Alembic on startup
ENABLE_AUDIT_LOG=true
ENABLE_RATE_LIMITING=true
```

### Frontend (.env)
```bash
# API Gateway
VITE_API_BASE_URL=http://localhost:8000

# App Info (optional)
VITE_APP_NAME=YojanaMitra
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=false  # Disable in local dev
```

---

## 7. Backend Reference

### FastAPI App Structure
- **Entry Point**: `backend/app/main.py`
- **Config**: `backend/app/config.py` (reads from `.env`)
- **Database**: `backend/app/database.py` (SQLAlchemy engine)
- **Routers**: `backend/app/routers/` (FastAPI route modules)
- **Agents**: `backend/app/agents/` (AI orchestration)
- **Services**: `backend/app/services/` (Business logic)
- **Utils**: `backend/app/utils/` (OCR, PDF, image processing)

### Key Endpoints
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | ❌ | Health check & DB status |
| `/api/v1/auth/register` | POST | ❌ | Create user account |
| `/api/v1/auth/login` | POST | ❌ | Get JWT tokens |
| `/api/v1/auth/refresh` | POST | ✅ | Refresh access token |
| `/api/v1/profile/me` | GET | ✅ | Get user profile |
| `/api/v1/profile/me` | PATCH | ✅ | Update profile |
| `/api/v1/schemes/` | GET | ❌ | List/search schemes |
| `/api/v1/schemes/{id}` | GET | ❌ | Get scheme details |
| `/api/v1/eligibility/analyze` | POST | ✅ | Run eligibility pipeline |
| `/api/v1/documents/upload` | POST | ✅ | Upload document |
| `/api/v1/documents/extract` | POST | ✅ | Extract fields from document |
| `/api/v1/applications/save` | POST | ✅ | Save application |
| `/api/v1/applications/` | GET | ✅ | List saved applications |
| `/docs` | GET | ❌ | Swagger UI (API explorer) |
| `/redoc` | GET | ❌ | ReDoc UI (API docs) |

### Database Models
| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | Authentication & basic info |
| `Profile` | `profiles` | User profile details |
| `Scheme` | `schemes` | Catalog of 4,504+ schemes |
| `Document` | `documents` | Uploaded files & metadata |
| `EligibilityResult` | `eligibility_results` | Analysis results & rankings |
| `SavedApplication` | `saved_applications` | User-saved scheme applications |
| `AuditLog` | `audit_logs` | User action tracking |

### Authentication Flow
1. User POSTs to `/api/v1/auth/register` with email + password
2. Server hashes password, creates user, returns JWT tokens:
   - `access_token`: Short-lived (30 min), used for API calls
   - `refresh_token`: Long-lived (7 days), used to get new access token
3. Frontend stores tokens in localStorage
4. Every protected endpoint checks `Authorization: Bearer {token}`
5. On expiry, frontend calls `/api/v1/auth/refresh` with refresh token

---

## 8. Frontend Reference

### React & Build Config
- **Framework**: React 18 + Vite (dev server + build tool)
- **CSS**: Tailwind CSS + PostCSS
- **HTTP**: axios with interceptors (auth token injection, retry logic)
- **i18n**: JSON locale files (manual string lookup, no heavy i18n library)
- **State**: Context API or Zustand (minimal state needs)

### Key Pages
| Page | Route | Purpose | Auth Required |
|------|-------|---------|---|
| Home | `/` | Landing & intro | ❌ |
| Browse Schemes | `/schemes` | Search & filter schemes | ❌ |
| Scheme Details | `/schemes/{id}` | Single scheme info + requirements | ❌ |
| Register | `/register` | Create account | ❌ |
| Login | `/login` | Enter existing account | ❌ |
| Dashboard | `/dashboard` | User home & quick stats | ✅ |
| Onboarding | `/onboarding` | Complete profile + upload docs | ✅ |
| Eligibility Results | `/results` | View ranked matching schemes | ✅ |
| Profile Settings | `/profile` | Edit personal info | ✅ |
| Saved Applications | `/applications` | View & track saved apps | ✅ |
| Admin Panel | `/admin` | (if applicable) | ✅ admin |

### Session & Token Handling
```javascript
// axios interceptor (services/api.js)
- GET request → Check if access token in localStorage
- If present & valid → Inject in Authorization header
- If expired → Call /api/v1/auth/refresh
- If refresh fails → Logout & redirect to login
- On login → Store access_token + refresh_token in localStorage
```

### Internationalization (i18n)
- **Locales**: `frontend/src/locales/{lang}.json`
- **Supported**: en, hi, ta, te, bn, kn, mr
- **Usage**: 
  ```javascript
  import locales from '../locales/en.json'
  const greeting = locales['greeting.welcome']  // or with i18n library
  ```

---

## 9. API Endpoints

### Authentication
```bash
# Register
POST /api/v1/auth/register
Body: {"email":"user@test.com","password":"Pass123!","name":"John"}
Response: {"access_token":"...", "refresh_token":"...", "user_id":"..."}

# Login
POST /api/v1/auth/login
Body: {"email":"user@test.com","password":"Pass123!"}
Response: {"access_token":"...", "refresh_token":"...", "user_id":"..."}

# Refresh Token
POST /api/v1/auth/refresh
Headers: {"Authorization": "Bearer {refresh_token}"}
Response: {"access_token":"...", "token_type":"bearer"}
```

### Schemes (Public)
```bash
# List schemes with pagination
GET /api/v1/schemes/?limit=10&skip=0&language=en&state=Maharashtra&sector=Health
Response: {"total":4504, "skip":0, "limit":10, "schemes":[...]}

# Search schemes
GET /api/v1/schemes/?search=farmer&language=en
Response: {...}

# Get scheme details
GET /api/v1/schemes/{scheme_id}
Response: {...}
```

### Eligibility (Protected)
```bash
# Run full eligibility analysis
POST /api/v1/eligibility/analyze
Headers: {"Authorization": "Bearer {token}"}
Body: {
  "full_name": "John Doe",
  "age": 35,
  "state": "Telangana",
  "annual_income": 500000,
  "occupation": "farmer",
  "is_farmer": 1,
  "caste_category": "General",
  "is_differently_abled": false
}
Response: {
  "job_id": "job-123",
  "status": "completed",
  "eligible_schemes": [
    {
      "scheme": {...},
      "eligibility_score": 95,
      "matching_criteria": [...],
      "explanation": "You match 9/10 criteria..."
    }
  ]
}
```

### Documents (Protected)
```bash
# Upload document
POST /api/v1/documents/upload
Headers: {"Authorization": "Bearer {token}"}
Form: file=@aadhaar.jpg, doc_type=aadhaar
Response: {"document_id":"doc-123", "extracted_fields": {...}}

# Extract fields from document
POST /api/v1/documents/extract
Headers: {"Authorization": "Bearer {token}"}
Form: file=@income_cert.pdf
Response: {"income": 500000, "year": 2025, ...}
```

---

## 10. Database & Migrations

### Database Initialization
```bash
cd backend

# Create migration (auto-detects model changes)
python -m alembic revision --autogenerate -m "description"

# Apply migration
python -m alembic upgrade head

# Revert last migration
python -m alembic downgrade -1

# See migration history
python -m alembic history
```

### PostgreSQL Connection
```bash
# From psql CLI
psql -U postgres -h localhost -d yojanamitra

# Useful queries
\dt                    # List tables
\d profiles            # Describe table schema
SELECT COUNT(*) FROM schemes;
SELECT * FROM users LIMIT 5;
```

### Backup & Restore (Production)
```bash
# Backup
pg_dump -U postgres yojanamitra > backup.sql

# Restore
psql -U postgres yojanamitra < backup.sql

# Compressed backup (recommended)
pg_dump -U postgres yojanamitra | gzip > backup.sql.gz
```

---

## 11. Authentication & Security

### JWT Tokens
- **Access Token**: 30 minutes, used for API calls
- **Refresh Token**: 7 days, used to get new access token
- **Algorithm**: HS256
- **Storage**: localStorage (frontend)
- **Transmission**: `Authorization: Bearer {token}` header

### Password Policy
- Minimum 8 characters
- Must include uppercase, lowercase, number
- Hashed with bcrypt before storage
- Never transmitted or logged

### File Upload Security
1. **Validation**:
   - File size: ≤ 10 MB (configurable)
   - MIME type: PDF, JPG, PNG, DOC, DOCX only
   - Filename sanitized: Remove special chars

2. **Storage**:
   - Encrypted with AES-256
   - Stored in `/backend/uploads/{user_id}/`
   - Never served directly (auth-protected endpoint)

3. **Access Control**:
   - User can only access own documents
   - Audit log tracks all file access

### Rate Limiting
```
- 60 requests/minute per IP (general)
- 1000 requests/hour per IP (cumulative)
- Upload endpoint: 5 uploads/hour per user
- Auth endpoints: 10 attempts/hour per IP (brute force protection)
```

### CORS Policy
```
Allowed Origins: http://localhost:5173 (dev), yojanamitra.vercel.app (prod)
Methods: GET, POST, PATCH, DELETE
Headers: Content-Type, Authorization
```

---

## 12. Document Processing & OCR

### OCR Pipeline
1. **Upload**: File received, validated, encrypted, stored
2. **Preprocessing**: Convert to grayscale, denoise, deskew
3. **Extract Text**: Tesseract OCR engine
4. **Parse**: Extract fields (name, age, income, address, etc.)
5. **Store**: Save metadata to DB, encrypted file to disk
6. **Return**: Extracted fields to frontend

### Supported Documents
- **Aadhaar**: Extract name, DOB, address, gender
- **PAN Card**: Extract name, PAN number, DOB
- **Income Certificate**: Extract income, financial year, authority
- **Bank Statement**: Extract account number, balance (basic)
- **Passport**: Extract name, DOB, passport number (basic)

### Tesseract Configuration
```python
# backend/app/utils/ocr_processor.py
pytesseract.pytesseract.pytesseract_cmd = os.getenv('TESSERACT_CMD')
lang = 'eng+hin'  # Support English + Hindi
oem = 3  # Neural net + legacy mode (faster)
psm = 3  # Automatic page segmentation
```

### Confidence Scores
- Fields extracted with confidence < 50% flagged for manual review
- Frontend shows warning: "This field may need verification"
- Admin panel shows extraction confidence metrics

---

## 13. Testing & Verification

### Run Tests (Backend)
```bash
cd backend

# Full integration test
python test_pipeline.py

# OCR-specific tests
python test_ocr_processor.py

# Explainability tests
python test_explainability.py

# pytest (if configured)
pytest -v
```

### Manual Testing (Postman/cURL)
```bash
# Test register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPass123","name":"Test User"}'

# Test schemes
curl http://localhost:8000/api/v1/schemes/?limit=5

# Test with auth
TOKEN="eyJhbGc..."  # from register response
curl -X POST http://localhost:8000/api/v1/eligibility/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"John","age":35,"state":"Telangana"}'
```

### Frontend Testing
- Browser DevTools Console: Check for errors
- Network tab: Verify API calls (status 200, correct response)
- localStorage: Verify tokens stored
- i18n: Switch languages, verify translations

---

## 14. Deployment Checklist

### Pre-Deployment (All Items MUST be ✅)
- [ ] Backend builds without errors: `python -c "from app.main import app"`
- [ ] Frontend builds without errors: `npm run build`
- [ ] All tests pass: `python test_pipeline.py`
- [ ] No hardcoded credentials: Search for `AIzaSy`, `sk-`, passwords
- [ ] No console.log in production frontend code
- [ ] Database migrations current: `alembic current`
- [ ] .env files correct (never commit real .env)
- [ ] .gitignore includes `__pycache__`, `.env`, `uploads/`, `dist/`, `node_modules/`
- [ ] Security headers configured (CORS, CSP, HSTS)

### Backend Deployment (Render)
1. **Create Account**: https://render.com
2. **Connect GitHub Repository**
3. **Create Web Service**:
   - Name: `yojanamitra-api`
   - Environment: Python 3.11
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `cd backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000`
4. **Add Environment Variables** (in Render dashboard):
   - `DATABASE_URL=postgresql://...` (RDS or Render Postgres)
   - `SECRET_KEY=...` (generate random 32-char string)
   - `ENVIRONMENT=production`
   - `TESSERACT_CMD=/usr/bin/tesseract` (Render has it installed)
5. **Add PostgreSQL** (via Render Postgres add-on)
6. **Run Migrations**:
   - Go to "Shell" in Render dashboard
   - Run: `cd backend && python -m alembic upgrade head`
7. **Test**: `curl https://yojanamitra-api.render.com/health`

### Frontend Deployment (Vercel)
1. **Create Account**: https://vercel.com
2. **Connect GitHub Repository**
3. **Select `frontend/` directory as root**
4. **Build Settings**:
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
5. **Add Environment Variables**:
   - `VITE_API_BASE_URL=https://yojanamitra-api.render.com`
6. **Deploy**: Vercel auto-deploys on git push
7. **Test**: `https://yojanamitra.vercel.app`

### Post-Deployment
- [ ] Health check: `curl https://api.yojanamitra.in/health`
- [ ] Swagger docs accessible: `https://api.yojanamitra.in/docs`
- [ ] Frontend loads: `https://yojanamitra.vercel.app`
- [ ] Can register: POST `/api/v1/auth/register`
- [ ] Can view schemes: GET `/api/v1/schemes/?limit=1`
- [ ] SSL/TLS working: Certificate valid, no warnings
- [ ] CORS headers correct: Frontend can access backend
- [ ] Monitoring set up: Error tracking (Sentry), uptime monitoring
- [ ] Backups configured: Daily automated DB backups
- [ ] Logs accessible: Error logging in production

---

## 15. Production Operations

### Health Monitoring
```bash
# Check service status
curl https://api.yojanamitra.in/health

# Expected response (all green):
{
  "status": "healthy",
  "database": "connected",
  "database_error": null,
  "uptime_seconds": 86400,
  "environment": "production",
  "version": "1.0.0"
}
```

### Database Maintenance (Monthly)
```bash
# Backup database
pg_dump -U admin yojanamitra | gzip > backup_$(date +%Y%m%d).sql.gz

# Vacuum (optimize)
vacuumdb -U admin yojanamitra

# Analyze (update stats)
analyzedb -U admin yojanamitra
```

### Log Monitoring
```bash
# Tail logs (Render dashboard)
# Backend logs: Render → Services → yojanamitra-api → Logs

# Common errors to watch
grep -i error backend/logs/yojanamitra.log
grep -i failed backend/logs/yojanamitra.log
grep -i timeout backend/logs/yojanamitra.log

# Performance insights
grep "eligibility/analyze" backend/logs/yojanamitra.log | wc -l  # Usage count
```

### Scaling & Performance
| Issue | Solution |
|-------|----------|
| Slow database queries | Add indexes on `state`, `caste_category` in schemes table |
| High CPU (OCR processing) | Increase backend server instances |
| Memory leaks | Monitor with `memory_profiler`, restart containers weekly |
| Upload backlog | Implement async task queue (Celery + Redis) |
| Rate limit exceeded | Increase `RATE_LIMIT_PER_HOUR` or implement tiered limits |

### Incident Response
```bash
# Service down
1. Check status page: https://render.com/status
2. SSH to server: ssh user@api.yojanamitra.in
3. Check logs: tail -100 logs/yojanamitra.log
4. Restart service: sudo systemctl restart yojanamitra

# Database connection error
1. Verify DATABASE_URL in Render environment
2. Check PostgreSQL service: sudo systemctl status postgresql
3. Test connection: psql -U admin -h localhost yojanamitra

# OCR failing
1. Verify Tesseract installed: tesseract --version
2. Check file permissions: ls -la /backend/uploads/
3. Check disk space: df -h
```

---

## 16. Troubleshooting Guide

### Backend Issues

**Issue**: `ModuleNotFoundError: No module named 'cv2'`
```bash
# Solution: Install OpenCV
pip install opencv-python-headless
```

**Issue**: `DATABASE_URL not set`
```bash
# Solution: Create .env file
cp backend/.env.example backend/.env
# Edit with your PostgreSQL credentials
```

**Issue**: Tesseract not found
```bash
# Linux: apt-get install tesseract-ocr
# macOS: brew install tesseract
# Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
# Then set TESSERACT_CMD in .env
```

**Issue**: Port 8000 already in use
```bash
# Kill process using port
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
# Or use different port
python run.py --port 8001
```

**Issue**: JWT token invalid/expired
```
Frontend will automatically refresh via refresh token.
If refresh fails, user is logged out and redirected to login.
```

### Frontend Issues

**Issue**: `VITE_API_BASE_URL not set`
```bash
# Solution: Create .env file
cd frontend
cp .env.example .env
# Edit with backend URL
```

**Issue**: API calls returning 401 (Unauthorized)
```
Check:
1. Token in localStorage: DevTools → Application → localStorage
2. Token not expired: JWT expiry is visible in base64 decode
3. Backend running: curl http://localhost:8000/health
4. Correct API URL: Check VITE_API_BASE_URL in .env
```

**Issue**: CORS error in browser console
```
Error: "Access to XMLHttpRequest blocked by CORS policy"
Solution:
1. Check ALLOWED_ORIGINS in backend .env
2. Restart backend server
3. Clear browser cache (Ctrl+Shift+Delete)
```

**Issue**: Styles not loading (Tailwind not working)
```bash
# Solution: Rebuild frontend
npm run build
# Or in dev mode, restart dev server
npm run dev  # Then Ctrl+C and npm run dev again
```

### Database Issues

**Issue**: `psql: error: could not translate host name "localhost" to address`
```bash
# Solution: Start PostgreSQL
# Windows: services.msc → PostgreSQL → Start
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

**Issue**: Database doesn't exist
```bash
# Create database
createdb -U postgres yojanamitra

# Or via psql
psql -U postgres
CREATE DATABASE yojanamitra;
```

**Issue**: Migrations failed
```bash
# Check migration history
python -m alembic history

# Revert to previous version
python -m alembic downgrade -1

# Try upgrading again
python -m alembic upgrade head
```

### Common Fix Patterns

**Problem**: Something isn't working, unsure where to start
```bash
# 1. Check error logs
tail -50 backend/logs/yojanamitra.log

# 2. Try health endpoint
curl http://localhost:8000/health

# 3. Check environment variables
# Print current env: python -c "from app.config import settings; print(settings.__dict__)"

# 4. Restart services
# Backend: Ctrl+C, then python run.py
# Frontend: Ctrl+C, then npm run dev
# Database: Service restart or systemctl
```

---

## Support & Resources

- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **GitHub Issues**: https://github.com/your-org/YojanaMitra/issues
- **Code Examples**: See `backend/examples/` or tests
- **Database Schema**: `backend/alembic/versions/`

---

**End of Documentation**

*Last Updated: 2026-04-27*  
*Version: 1.0 - Production Ready*
