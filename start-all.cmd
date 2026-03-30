@echo off
REM Start YojanaMitra - Frontend and Backend
REM This script starts both the backend API and frontend dev server

echo.
echo ========================================
echo   YojanaMitra Server Launcher
echo ========================================
echo.

REM Get the directory where this script is located
cd /d "%~dp0"

REM Create two new windows for backend and frontend
echo Starting Backend API (Port 8000)...
start "YojanaMitra Backend" cmd /k "cd backend && python run.py"

echo Starting Frontend Dev Server (Port 5173)...
start "YojanaMitra Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Servers starting...
echo - Backend:  http://localhost:8000
echo - Frontend: http://localhost:5173
echo ========================================
echo.
echo Press any key to continue...
pause

REM Keep main window open
cmd /k
