# YojanaMitra

YojanaMitra is a government scheme discovery and eligibility platform built with FastAPI (backend) and React + Vite (frontend).

This repository is maintained for a no-Docker deployment path:
- Backend: Render
- Frontend: Vercel

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL
- Frontend: React, Vite, Tailwind CSS
- Auth: JWT access/refresh tokens
- OCR path: local OCR extraction pipeline integrated with onboarding

## Repository Layout

- backend/: FastAPI application
- frontend/: React application
- backend/app/routers/: API route modules
- backend/app/services/: backend service layer
- backend/app/agents/: eligibility orchestration agents

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL

## Backend Setup

1. Create and activate virtual environment.
2. Install dependencies.
3. Configure backend environment variables.
4. Run migrations.
5. Start server.

Example commands (Windows PowerShell):

```powershell
Set-Location backend
python -m venv venv
.\\venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -m alembic upgrade head
python run.py
```

Backend URLs:
- API base: http://127.0.0.1:8000/api/v1
- OpenAPI docs: http://127.0.0.1:8000/docs

## Frontend Setup

```powershell
Set-Location frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL:
- App: http://127.0.0.1:5173

## Key API Areas

- Authentication: /api/v1/auth/*
- Onboarding: /api/v1/onboarding/*
- Profile: /api/v1/profile/*
- Documents: /api/v1/documents/*
- Eligibility: /api/v1/eligibility/*
- Schemes: /api/v1/schemes/*
- Applications: /api/v1/applications/*
- Admin: /api/v1/admin/*

## Verification

Backend import sanity check:

```powershell
Set-Location backend
python -c "from app.main import app; print('OK')"
```

Frontend production build:

```powershell
Set-Location frontend
npm run build
```

## Deployment

- Backend deployment config: backend/render.yaml
- Frontend deployment config: frontend/vercel.json

Configure production env vars on the hosting platforms and run Alembic migrations during backend deploy.
