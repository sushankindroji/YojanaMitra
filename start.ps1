# Go to project root
Set-Location E:\sushank-projects\YojanaMitra

Write-Host "Starting Backend and Frontend..." -ForegroundColor Green

# ---------------- BACKEND ----------------
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\.venv\Scripts\Activate.ps1; python run.py"

Start-Sleep -Seconds 3

# ---------------- FRONTEND ----------------
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Both servers started." -ForegroundColor Cyan