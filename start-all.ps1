# PowerShell script to start both backend and frontend servers
# Run: powershell -ExecutionPolicy Bypass -File start-all.ps1

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootDir

Write-Host ""
Write-Host "========================================"
Write-Host "   YojanaMitra Server Launcher"
Write-Host "========================================"
Write-Host ""

# Start Backend in a new PowerShell window
Write-Host "Starting Backend API (Port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; python run.py"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend in a new PowerShell window
Write-Host "Starting Frontend Dev Server (Port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; npm run dev"

Write-Host ""
Write-Host "========================================"
Write-Host "Servers starting..."
Write-Host "- Backend:  http://localhost:8000"
Write-Host "- Frontend: http://localhost:5173"
Write-Host "========================================"
Write-Host ""
Write-Host "Opening frontend in browser..." -ForegroundColor Green
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"
