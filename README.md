# YojanaMitra

Single consolidated project documentation for development, delivery, and status tracking.

This file combines:
1. README
2. PROGRESS
3. PROJECT SUMMARY

---

## README

### 1. Overview

YojanaMitra is an AI-assisted government scheme discovery and eligibility platform for Indian citizens.

Core goals:
- Centralize scheme discovery across states and categories
- Match users to relevant schemes based on profile and eligibility signals
- Support guided onboarding with document extraction
- Provide explainable recommendation and eligibility outputs

Deployment approach (no Docker path):
- Backend: Render
- Frontend: Vercel

### 2. Technology Stack

Backend:
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- JWT-based auth
- OCR processing and extraction pipeline

Frontend:
- React 18 + Vite
- Tailwind CSS
- Zustand state management
- i18next localization

### 3. Repository Layout

```text
backend/
	app/
		agents/        # orchestration and personalization agents
		routers/       # API routes
		services/      # business services (eligibility, OCR, storage, cache)
		models/        # SQLAlchemy models
		schemas/       # request/response schemas
	run.py           # backend startup script

frontend/
	src/
		pages/         # route-level pages
		components/    # reusable UI components
		services/      # API service clients
		store/         # state store modules
	vite.config.js

render.yaml        # Render backend deployment config
```

### 4. Local Development Setup

Prerequisites:
- Python 3.11+
- Node.js 18+
- PostgreSQL

#### Backend setup (PowerShell)

```powershell
Set-Location E:\sushank-projects\YojanaMitra
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
Set-Location backend
python -m alembic upgrade head
python run.py
```

Backend endpoints:
- API root: http://127.0.0.1:8000
- OpenAPI docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

#### Frontend setup (PowerShell)

```powershell
Set-Location E:\sushank-projects\YojanaMitra\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Frontend URL:
- App: http://localhost:5173

### 5. Key API Areas

- Authentication: /api/v1/auth/*
- Onboarding: /api/v1/onboarding/* and /api/v1/onboarding/status
- Profile: /api/v1/profile/*
- Documents: /api/v1/documents/*
- Eligibility: /api/v1/eligibility/* and related orchestrator routes
- Schemes: /api/v1/schemes/*
- Applications: /api/v1/applications/*
- Admin: /api/v1/admin/*

### 6. Essential Environment Variables

Backend essentials:
- ENVIRONMENT (development or production)
- DEBUG (true/false)
- DATABASE_URL (or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME)
- SECRET_KEY
- ENCRYPTION_KEY
- ALLOWED_ORIGINS
- GEMINI_API_KEY (if AI extraction/reasoning enabled)
- TESSERACT_PATH (for local OCR fallback)

Notes:
- In production, SECRET_KEY and ENCRYPTION_KEY are mandatory.
- CORS includes localhost and 127.0.0.1 development origins.

### 7. Validation Commands

Backend import check:

```powershell
Set-Location E:\sushank-projects\YojanaMitra\backend
..\.venv\Scripts\python.exe -c "from app.main import app; print('OK')"
```

Backend syntax check for key routers/services:

```powershell
..\.venv\Scripts\python.exe -m py_compile app\routers\profile.py app\routers\onboarding.py app\routers\documents.py app\agents\agent_orchestrator.py
```

Frontend build check:

```powershell
Set-Location E:\sushank-projects\YojanaMitra\frontend
npm run build
```

### 8. Deployment

Backend (Render):
- Config source: render.yaml
- Build command: pip install -r requirements.txt
- Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
- Health path: /health

Frontend (Vercel):
- Config source: frontend/vercel.json
- SPA rewrite to index.html enabled

---

## PROGRESS

Status date: 2026-04-07

### Completed Milestones

1. Platform baseline complete
- FastAPI backend and React frontend integrated
- Auth, profile, onboarding, documents, eligibility, admin routes active

2. Phase 10 complete: 4,500+ scheme scale
- 4,504 schemes loaded into PostgreSQL
- Coverage across 30+ states/UTs and 169+ sectors

3. Phase 11 complete: eligibility engine
- Rule-based matching implemented across major profile signals
- Fast matching against large scheme set with persisted results

4. Document extraction and onboarding hardening
- OCR extraction + normalization flow integrated
- Review/update extraction endpoint available for correction workflows

5. Typography consistency rollout (frontend)
- Canonical text scale established and applied across UI surfaces
- Tailwind semantic text utilities aligned with shared design tokens

6. Profile and dashboard completeness sync fix
- Added cache invalidation after profile-affecting writes
- Profile completeness now computed live on profile read
- Added missing education_level field to profile UI
- Removed delayed redirect after profile save for faster UX feedback

### Current Focus

- Stabilize remaining scheme discovery edge cases
- Continue onboarding and document quality improvements for low-quality OCR inputs
- Improve observability for multi-step eligibility orchestration

### Known Risks / Watchlist

- Route ordering and compatibility paths in schemes APIs require periodic regression checks.
- Sparse/local datasets can limit full-scale validation expectations in non-production environments.
- Stale local backend processes can mask code changes; verify active process on port 8000 during testing.

---

## PROJECT SUMMARY

### What YojanaMitra Solves

Many citizens struggle to find and apply for the schemes they are eligible for. Information is fragmented by state, category, and department.

YojanaMitra provides:
- A unified scheme discovery surface
- Eligibility-aware recommendations from profile + document signals
- Guided onboarding with extraction-assisted profile completion
- Explainable outputs and actionable next steps

### Product Capability Snapshot

- User registration/login with JWT access control
- Profile lifecycle and completeness scoring
- Multi-step onboarding with document upload and extraction review
- Eligibility matching pipeline over large scheme catalog
- Dashboard insights and recommendation flow
- Admin routes for management and operations

### Architecture Snapshot

- Frontend: React SPA served by Vite
- Backend: FastAPI with modular routers/services/agents
- Persistence: PostgreSQL via SQLAlchemy models and Alembic migrations
- Caching: optional Redis path plus in-process orchestration cache
- OCR/AI: Gemini-backed and local OCR fallback path

### Delivery Model

- Frontend deployed on Vercel
- Backend deployed on Render
- No Docker required in the default workflow

### Readiness Snapshot

- Core user flows are implemented and running locally.
- Major scale and eligibility milestones are complete.
- Current work is focused on reliability hardening, edge-case handling, and UX consistency improvements.
