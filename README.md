# YojanaMitra

Comprehensive project reference for developers, testers, and deployers.


<h2>🎥 Demo Video</h2>

https://github.com/user-attachments/assets/2f187931-889a-4ef3-9090-f215cc893152




## Table of Contents

1. Product Overview
2. Quick Snapshot
3. Architecture and Flow
4. Repository Structure
5. Local Setup
6. Environment Variables Reference
7. Backend Runtime Reference
8. Frontend Runtime Reference
9. API Surface Reference
10. Security and Privacy Controls
11. Testing and Verification
12. Deployment Reference
13. Troubleshooting Guide
14. Operations Runbook
15. Progress and Roadmap

## 1. Product Overview

YojanaMitra is an AI-assisted government scheme discovery and eligibility platform for Indian citizens.

Primary goals:
- Centralized scheme discovery across states and sectors.
- Profile-aware and document-aware eligibility matching.
- Guided onboarding with OCR-assisted data extraction.
- Explainable recommendations with actionable next steps.

Primary user journeys:
- Discover schemes publicly.
- Register/login and complete onboarding.
- Upload identity/income/supporting documents.
- Run eligibility pipeline and view ranked recommendations.
- Track and manage saved/submitted applications.

Deployment model:
- Backend hosted on Render.
- Frontend hosted on Vercel.
- No Docker required in default workflow.

## 2. Quick Snapshot

Current maturity highlights:
- 4,504+ schemes available in PostgreSQL-backed catalog.
- Multi-agent eligibility pipeline active with persisted results.
- OCR + document processing integrated in onboarding and documents flows.
- Security hardening completed for startup config validation and uploads.
- Frontend session handling and API resilience improved with retries and refresh queueing.

Recent runtime hardening (April 2026):
- Startup fails fast for invalid/missing `DATABASE_URL` and weak/default `SECRET_KEY`.
- Upload validation now checks size, MIME type, and sanitizes filenames.
- Dedicated `/health` router returns DB and uptime diagnostics.
- Global API exception handling standardized for 422, 429, DB, and unexpected errors.
- Frontend now requires explicit `VITE_API_BASE_URL` and shows configuration error screen if missing.

## 3. Architecture and Flow

High-level architecture:
- Frontend: React 18 + Vite SPA.
- Backend: FastAPI app with routers, services, and orchestrated agents.
- Database: PostgreSQL via SQLAlchemy ORM.
- Migrations: Alembic.
- Document storage: local filesystem with AES-256 encryption.
- OCR and parsing: pytesseract, pdfplumber, OpenCV, Pillow.

Request/data flow overview:
1. User authenticates via JWT (`access_token`, `refresh_token`).
2. Protected frontend routes call API client (`axios`) with token interceptors.
3. Backend validates token and loads/repairs profile state when needed.
4. On document upload, backend validates upload (type/size/name), encrypts, stores, and OCRs.
5. Eligibility pipeline runs multi-stage matching and ranking.
6. Results persist to `eligibility_results` and dashboard payload is returned/cached.

Eligibility pipeline stages (with progress checkpoints):
- 10%: `profile_validation`
- 20%: `eligibility_matching`
- 58%: `ranking`
- 72%: `explanations`
- 84%: `persistence`
- 92%: `personalization`
- 100%: `complete`

## 4. Repository Structure

```text
backend/
	app/
		agents/         # eligibility and recommendation orchestration
		core/           # security, rate limiting, encryption, logging, sanitizers
		data/           # seed/scrape helpers and scheme portal data
		models/         # SQLAlchemy models
		routers/        # FastAPI route modules
		schemas/        # Pydantic request/response contracts
		services/       # auth, OCR, storage, cache, profile completeness, etc.
	alembic/          # migration env and revision history
	requirements.txt
	run.py            # backend startup wrapper

frontend/
	src/
		components/     # reusable UI and guard/layout components
		pages/          # route-level views
		services/       # API client and constants
		store/          # Zustand stores
		locales/        # i18n translation JSONs
	package.json
	vite.config.js
	vercel.json

render.yaml         # Render service definition
pytest.ini
conftest.py
```

## 5. Local Setup

### 5.1 Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL
- Tesseract OCR installed (recommended for local OCR reliability)

### 5.2 Backend Setup (PowerShell)

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

Backend URLs:
- API root: http://127.0.0.1:8000/
- OpenAPI docs: http://127.0.0.1:8000/docs
- Health endpoint: http://127.0.0.1:8000/health

### 5.3 Frontend Setup (PowerShell)

```powershell
Set-Location E:\sushank-projects\YojanaMitra\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Frontend URL:
- App: http://localhost:5173

Critical note:
- `VITE_API_BASE_URL` must be set in `frontend/.env`.

### 5.4 Local Startup Checklist

Before starting:
- Ensure PostgreSQL database exists and matches `DATABASE_URL`.
- Ensure backend `.env` has valid `SECRET_KEY` and `DATABASE_URL`.
- Ensure frontend `.env` has `VITE_API_BASE_URL`.

On startup:
- Backend performs DB connectivity test and exits on failure.
- Backend optionally runs Alembic migrations if `AUTO_RUN_MIGRATIONS=true`.
- Backend verifies upload directory and attempts Tesseract availability check.

## 6. Environment Variables Reference

### 6.1 Backend Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | none | Full SQLAlchemy/PostgreSQL connection string. |
| `DATABASE_TYPE` | No | `postgresql` | Logical DB type label used in logs/config. |
| `SECRET_KEY` | Yes | none | JWT signing key, minimum 32 chars, must not be insecure default. |
| `ALGORITHM` | No | `HS256` | JWT algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | Access token validity window. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | Refresh token validity window. |
| `ENVIRONMENT` | No | `development` | Runtime environment (`development` or `production`). |
| `DEBUG` | No | `false` | FastAPI debug mode. Must be `false` in production. |
| `HOST` | No | `0.0.0.0` | Uvicorn bind host. |
| `PORT` | No | `8000` | Uvicorn bind port. |
| `AUTO_RUN_MIGRATIONS` | No | `true` | Whether to apply Alembic migrations at startup. |
| `ALLOWED_ORIGINS` | No | `http://127.0.0.1:5173` | CORS origins, comma-separated or JSON list. |
| `UPLOAD_DIR` | No | `uploads` | Root folder for encrypted uploaded files. |
| `MAX_UPLOAD_SIZE_MB` | No | `10` | Maximum upload size in MB. |
| `TESSERACT_PATH` | No | OS-specific default | Path to `tesseract` executable. |
| `TESSERACT_LANGS` | No | `eng+hin` | OCR language pack combination. |
| `OCR_CONFIDENCE_THRESHOLD` | No | `0.6` | OCR quality threshold for confidence workflows. |
| `GEMINI_API_KEY` | Optional | empty | Enables Gemini-based capability in OCR/AI flows. |
| `BHASHINI_USER_ID` | Optional | empty | Runtime translation integration value (if enabled). |
| `BHASHINI_API_KEY` | Optional | empty | Runtime translation integration value (if enabled). |
| `ENCRYPTION_KEY` | Recommended | empty | Base64-encoded 32-byte key for AES-256 document encryption. |
| `SMTP_HOST` | No | `smtp.gmail.com` | Outbound SMTP host. |
| `SMTP_PORT` | No | `587` | Outbound SMTP port. |
| `SMTP_USER` | Optional | empty | SMTP username/email. |
| `SMTP_PASSWORD` | Optional | empty | SMTP password/app password. |
| `FROM_EMAIL` | No | `noreply@yojanamitra.in` | Sender address. |
| `DB_POOL_SIZE` | No | `10` | SQLAlchemy pool size. |
| `DB_MAX_OVERFLOW` | No | `20` | Additional temporary DB connections. |
| `DB_POOL_TIMEOUT` | No | `30` | Pool checkout timeout (seconds). |
| `DB_POOL_RECYCLE` | No | `3600` | Connection recycle interval (seconds). |
| `DB_ECHO` | No | `false` | SQLAlchemy SQL logging. |
| `REDIS_URL` | Optional | empty | Redis connection URL if cache path is enabled. |

Key behavioral notes:
- `DATABASE_URL` and `SECRET_KEY` are validated on startup and process exits on failure.
- In production, `DEBUG=true` triggers configuration error.
- If `ENCRYPTION_KEY` is empty in development, key is derived from `SECRET_KEY` (warning logged).
- If `ENCRYPTION_KEY` is provided, it must decode to exactly 32 bytes.

Secret generation examples:

```powershell
# SECRET_KEY (64 hex chars)
openssl rand -hex 32

# ENCRYPTION_KEY (base64, 32 raw bytes)
python -c "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"
```

### 6.2 Frontend Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | none | Backend base URL before `/api/v1` normalization. |
| `VITE_APP_NAME` | No | `YojanaMitra` | Branding metadata. |
| `VITE_APP_VERSION` | No | `1.0.0` | App version display/metadata. |

Frontend API base behavior:
- If value ends with `/api/v1`, it is used as-is.
- Otherwise `/api/v1` is appended.
- If empty, UI renders configuration error screen and logs console error.

## 7. Backend Runtime Reference

### 7.1 Startup Sequence

Backend startup performs:
1. Configuration load and validation.
2. Database connectivity test (`SELECT 1`) at import time.
3. Optional migrations (`AUTO_RUN_MIGRATIONS=true`).
4. Startup checks:
- DB connectivity confirmation.
- Upload directory creation.
- Tesseract availability check.
- Required table verification.
5. Cache status log (`ENABLED` or `DISABLED`).

### 7.2 Error Handling Strategy

Registered exception handlers:
- `RateLimitExceeded` -> `429` with user-friendly throttling message.
- `RequestValidationError` -> `422` with flattened field-level detail.
- `SQLAlchemyError` -> `500` database error response.
- Generic `Exception` -> `500` safe fallback response and server-side traceback logging.

### 7.3 Request Observability

- Each request gets an `X-Request-ID` value (incoming header reused or generated UUID).
- Request timing and status are logged in API logs.
- `X-Request-ID` is echoed in response headers.

### 7.4 Rate Limit Policies

Current configured buckets:
- `register`: `5/minute`
- `login`: `10/minute`
- `auth`: `10/minute`
- `upload`: `20/minute`
- `eligibility_run`: `5/minute`
- `search`: `30/minute`
- `default`: `100/hour`

Applied route examples:
- Register: `POST /api/v1/auth/register`
- Login: `POST /api/v1/auth/login`
- Document upload endpoints and onboarding upload endpoints
- Eligibility async run endpoint

### 7.5 Upload Security Rules

Upload validation enforces:
- Allowed MIME types: JPEG, PNG, WEBP, PDF.
- Minimum file size: 5 KB.
- Maximum file size: `MAX_UPLOAD_SIZE_MB` (default 10 MB).
- Filename sanitization: only alphanumeric, dot, underscore, hyphen.
- MIME detection uses `python-magic` when available, with content-type fallback.

Storage behavior:
- Files encrypted with AES-256-CBC.
- Stored under `UPLOAD_DIR/<user_id>/`.
- Stored file name format: `<uuid>_<safe_filename>.enc`.

### 7.6 Profile Response Sanitization

Sensitive data is masked before profile API responses:
- Aadhaar: full value removed, `aadhaar_last4` exposed.
- PAN: middle characters masked.
- Ration card: masked prefix.
- Bank account mask normalized to `XXXXXX####` style.

### 7.7 Eligibility Orchestrator

Pipeline components:
- `ProfileValidationAgent`
- `EligibilityMatchingAgent`
- `RankingAgent`
- `ExplanationAgent`
- `PersonalizationAgent`

Result persistence:
- Previous user eligibility results are replaced on each run.
- Condition-level details and explanation snippets are saved in `eligibility_results`.
- In-memory cache exists for current process lifecycle.

Async job model:
- In-memory job store tracks `job_id`, status, progress, stage, timestamps.
- `create_job`, `update_job`, and status polling endpoints power async progress UX.

## 8. Frontend Runtime Reference

### 8.1 Core Runtime Stack

- React 18
- React Router v6
- Zustand (persisted auth store)
- i18next + browser language detector
- Axios + axios-retry
- Tailwind CSS

### 8.2 Route Map

Public routes:
- `/`
- `/login`
- `/register`
- `/schemes`
- `/schemes/:schemeId`

Protected routes:
- `/onboarding`
- `/apply/:schemeId`
- `/dashboard`
- `/profile`
- `/eligibility`
- `/applications`
- `/documents`
- `/upload`

Admin routes:
- `/admin/dashboard`
- `/admin/users`
- `/admin/schemes`
- `/admin/applications`

Guard behavior:
- `ProtectedRoute` requires valid access and refresh tokens.
- `ProtectedAdminRoute` resolves role from store/localStorage and fallback `/auth/me`.
- `OnboardingRouteGuard` protects routes requiring completed onboarding.

### 8.3 Auth Store Behavior

Persisted auth state includes:
- `accessToken`
- `refreshToken`
- `userRole`
- `userId`
- `isAuthenticated`

Token validation:
- Empty strings, `undefined`, and `null` string values are treated as invalid.
- Invalid tokens clear auth storage and reset auth state.

### 8.4 API Client Behavior

API clients:
- `api` for authenticated requests.
- `publicApi` for unauthenticated browsing.

Resilience features:
- Automatic token refresh on 401 (except auth endpoints).
- Refresh queue to prevent parallel refresh races.
- Grace period after login to avoid premature forced logout.
- Automatic retries (`axios-retry`) for network errors and 5xx responses.
- User-facing toast notifications for 403, 422, 429, 5xx, and network failures.

### 8.5 Localization

Supported languages:
- English (`en`)
- Hindi (`hi`)
- Telugu (`te`)
- Tamil (`ta`)
- Marathi (`mr`)
- Bengali (`bn`)
- Kannada (`kn`)
- Spanish (`es`)

Language persistence:
- Primary local storage key: `yojanamitra_language`.
- Legacy keys are auto-migrated when present.

## 9. API Surface Reference

Base path conventions:
- Root health/status: `/`, `/health`
- Versioned APIs: `/api/v1/...`

### 9.1 Health and Root

- `GET /` -> service metadata and cache status.
- `GET /health` -> health status, DB connectivity, uptime, environment, version.

### 9.2 Authentication (`/api/v1/auth`)

- `POST /register`
- `POST /login`
- `POST /refresh`
- `GET /me`
- `POST /logout`
- `POST /send-otp`
- `POST /verify-otp`

### 9.3 Onboarding (`/api/v1/onboarding`)

- `GET /status`
- `POST /upload-aadhaar`
- `POST /confirm-aadhaar`
- `POST /upload-document`
- `POST /confirm-document`
- `POST /complete`

### 9.4 Profile (`/api/v1/profile`)

- `GET /`
- `PUT /`
- `GET /completeness`
- `POST /optional-questions`

### 9.5 Documents (`/api/v1/documents`)

- `POST /upload`
- `GET /`
- `GET /{doc_id}`
- `PATCH /{doc_id}/extraction`
- `DELETE /{doc_id}`
- `GET /{doc_id}/download`
- `POST /{doc_id}/reprocess`

### 9.6 Schemes (`/api/v1/schemes`)

- `GET /`
- `GET /public/list`
- `GET /public/{scheme_id}`
- `GET /public/{scheme_id}/apply-info`
- `GET /search`
- `GET /sectors`
- `GET /states`
- `POST /check-eligibility`
- `POST /check-all`
- `GET /eligible`
- `GET /partially-eligible`
- `GET /{scheme_id}`
- `GET /{scheme_id}/apply-info`
- `GET /{scheme_id}/eligibility`
- `GET /{scheme_id}/apply-guide`

### 9.7 Eligibility (`/api/v1/eligibility`)

- `POST /run`
- `GET /status/{job_id}`
- `GET /results`
- `GET /dashboard`
- `GET /top/{n}`
- `GET /scheme/{scheme_code}`
- `POST /check`
- `GET /schemes`
- `GET /top`
- `GET /summary`
- `POST /recalculate`

### 9.8 Applications (`/api/v1/applications`)

- `POST /save-scheme`
- `GET /`
- `GET /stats/summary`
- `GET /{application_id}`
- `PATCH /{application_id}`
- `DELETE /{application_id}`

### 9.9 Admin (`/api/v1/admin`)

- `GET /dashboard/stats`
- `GET /users`
- `GET /schemes`
- `GET /applications`
- `PATCH /users/{user_id}/deactivate`
- `PATCH /users/{user_id}/ban`
- `PATCH /users/{user_id}/role`
- `POST /users/{user_id}/reset-password`
- `PATCH /schemes/{scheme_id}`
- `DELETE /schemes/{scheme_id}`
- `PATCH /applications/{application_id}`
- `GET /audit-logs`

## 10. Security and Privacy Controls

Implemented controls:
- JWT-based authentication.
- Config validation for secrets and DB URL on startup.
- Sensitive profile field masking in API responses.
- Upload MIME/type/size checks with sanitized file names.
- Encrypted document storage (AES-256-CBC).
- Rate limiting on sensitive and expensive endpoints.
- Request ID propagation and structured request logging.

Important operational notes:
- Keep `SECRET_KEY` and `ENCRYPTION_KEY` out of source control.
- Use distinct secrets per environment.
- In production, set `ENVIRONMENT=production` and `DEBUG=false`.
- Restrict `ALLOWED_ORIGINS` to known frontend domains.

## 11. Testing and Verification

Current project-level pytest config:
- `pytest.ini`: `-p no:doctest`

### 11.1 Backend Smoke Checks

```powershell
Set-Location E:\sushank-projects\YojanaMitra\backend
..\.venv\Scripts\python.exe -c "from app.main import app; print('OK')"
```

```powershell
..\.venv\Scripts\python.exe -m py_compile app\routers\profile.py app\routers\onboarding.py app\routers\documents.py app\agents\agent_orchestrator.py
```

### 11.2 Frontend Build and Lint

```powershell
Set-Location E:\sushank-projects\YojanaMitra\frontend
npm run lint
npm run build
```

### 11.3 Runtime Health Check

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health | Select-Object -ExpandProperty Content
```

## 12. Deployment Reference

### 12.1 Backend on Render

Source of truth: `render.yaml`

Configured values:
- Type: `web`
- Runtime: `python`
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

Render environment variables configured in template:
- `ENVIRONMENT=production`
- `DEBUG=false`
- `AUTO_RUN_MIGRATIONS=true`
- `DATABASE_TYPE=postgresql`
- `SECRET_KEY` generated on provision
- `ALLOWED_ORIGINS`, `ENCRYPTION_KEY`, `GEMINI_API_KEY` marked for manual sync

### 12.2 Frontend on Vercel

Source of truth: `vercel.json` at the repo root for monorepo deployments. The nested `frontend/vercel.json` remains compatible if you deploy only the frontend folder.

Configured behavior:
- SPA rewrite routes all requests to `index.html`.
- Asset cache headers set for `/assets/*`.
- Build command installs frontend dependencies from `frontend/` and builds the Vite app there.

Critical deployment requirement:
- Set `VITE_API_BASE_URL` in Vercel project environment settings.

### 12.3 Production Readiness Checklist

- Set production `DATABASE_URL`.
- Set strong `SECRET_KEY`.
- Set valid base64 `ENCRYPTION_KEY` (32 raw bytes).
- Set strict `ALLOWED_ORIGINS`.
- Set `VITE_API_BASE_URL` for frontend.
- Verify `/health` after deployment.
- Validate login, onboarding, upload, eligibility, and admin flows.

## 13. Troubleshooting Guide

### 13.1 Backend exits on startup with config error

Symptoms:
- Process exits immediately.

Likely causes:
- Missing/empty `DATABASE_URL`.
- `SECRET_KEY` too short (<32) or insecure placeholder.

Fix:
- Update `backend/.env` with valid values and restart.

### 13.2 Frontend shows "Missing frontend API configuration"

Cause:
- `VITE_API_BASE_URL` is missing/empty.

Fix:
- Set `VITE_API_BASE_URL` in `frontend/.env` and restart dev server.

### 13.3 Upload rejected with file-type or size errors

Checks:
- Confirm file type is JPG/PNG/WEBP/PDF.
- Confirm size within `MAX_UPLOAD_SIZE_MB`.
- Confirm file is not too small (minimum 5 KB).

### 13.4 Encryption key format errors

Cause:
- `ENCRYPTION_KEY` provided but not base64 or not 32-byte decoded length.

Fix:
- Generate with provided base64 command and update env.

### 13.5 CORS errors in browser

Cause:
- Frontend origin not included in `ALLOWED_ORIGINS`.

Fix:
- Add origin to `ALLOWED_ORIGINS` (comma-separated or JSON array).

### 13.6 Frequent 401 redirects after login

Checks:
- Ensure refresh endpoint is reachable.
- Confirm both access and refresh tokens are being stored.
- Verify system clock skew and token expiry configuration.

## 14. Operations Runbook

Daily checks:
- Verify `/health` status and DB connectivity.
- Spot-check login and eligibility run.
- Monitor logs for repeated 429/500 patterns.

Incident triage quick steps:
1. Confirm backend process and DB are reachable.
2. Check `/health` output.
3. Verify environment variables did not regress.
4. Verify migrations are at head.
5. Check API logs for request IDs and failing paths.

Database migration operations:

```powershell
Set-Location E:\sushank-projects\YojanaMitra\backend
python -m alembic current
python -m alembic heads
python -m alembic upgrade head
```

## 15. Progress and Roadmap

Status date: 2026-04-14

Completed milestones:
1. Platform baseline complete.
- FastAPI backend and React frontend integrated.
- Auth, profile, onboarding, documents, eligibility, applications, and admin routes active.

2. Phase 10 complete: scheme scale.
- 4,504 schemes loaded in PostgreSQL.
- Coverage across 30+ states/UTs and 169+ sectors.

3. Phase 11 complete: eligibility engine.
- Rule-based matching over profile and scheme criteria.
- Ranked and persisted results for user-specific recommendations.

4. Document extraction and onboarding hardening.
- OCR extraction and review/correction flow integrated.
- Onboarding and document upload paths now use centralized secure upload validation.

5. Runtime hardening completed.
- Fail-fast startup checks for secrets/DB.
- Health routing and improved exception handling.
- Rate-limit policy tightening for sensitive endpoints.
- Frontend API configuration strictness and retry improvements.

Current focus:
- Stabilize remaining scheme discovery edge cases.
- Continue low-quality OCR resilience improvements.
- Improve operational observability across multi-step eligibility runs.

Known watchlist:
- Route compatibility/order in complex scheme paths should continue regression checks.
- Sparse local datasets can reduce confidence of large-scale behavior validation.
- Stale local backend instances can mask active code changes during testing.
