# Go to project root
Set-Location E:\sushank-projects\YojanaMitra

Write-Host "FIRST TIME SETUP STARTED..." -ForegroundColor Yellow

# ---------------- BACKEND ----------------
Write-Host "Setting up Backend..." -ForegroundColor Green

Set-Location backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Setup environment file
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
}

# Run migrations
python -m alembic upgrade head

# Go back to root
Set-Location ..

# ---------------- FRONTEND ----------------
Write-Host "Setting up Frontend..." -ForegroundColor Cyan

Set-Location frontend

# Install dependencies
npm install

# Setup environment file
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
}

# Go back to root
Set-Location ..

Write-Host "SETUP COMPLETE. Use start.ps1 to run the project." -ForegroundColor Green