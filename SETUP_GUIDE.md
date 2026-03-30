# YojanaMitra - Complete Setup & Troubleshooting Guide

## ✅ Quick Start (Permanent Solution)

### Test Credentials (Pre-configured)
```
Email: test@example.com
Password: password123
```

### Option 1: One-Click Start (Windows CMD)
```bash
start-all.cmd
```
This will:
- Open backend server in one window (Port 8000)
- Open frontend in another window (Port 5173)
- Automatically open the site in your browser

### Option 2: PowerShell (Recommended)
```powershell
powershell -ExecutionPolicy Bypass -File start-all.ps1
```

### Option 3: Manual (If scripts don't work)

#### Terminal 1 - Backend:
```bash
cd backend
python run.py
```
**Expected output:** Should see "Uvicorn running on http://0.0.0.0:8000"

#### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```
**Expected output:** Should see "Local: http://localhost:5173/"

---

## 🔍 Common Errors & Fixes

### ❌ Error: "Failed to load resource: net::ERR_CONNECTION_REFUSED"
**Problem:** Backend is not running
**Solution:** 
```bash
cd backend && python run.py
```
Port 8000 must be listening before frontend can connect.

### ❌ Error: "POST http://localhost:8000/api/v1/auth/login net::ERR_FAILED 500"
**Problem:** bcrypt library incompatibility or missing test user
**Solution:**
```bash
# 1. Fix bcrypt version
pip install 'bcrypt>=4.0,<5' passlib==1.7.4

# 2. Restart backend - kill old process and run fresh
python backend/run.py

# 3. Test with default credentials:
# Email: test@example.com
# Password: password123
```

### ❌ Error: "Module not found" or "No module named..."
**Problem:** Dependencies not installed
**Solution:**
```bash
cd backend
pip install -r requirements.txt
```

### ❌ Error: "Port 8000 already in use"
**Problem:** Another process is using that port
**Solutions:**
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Or use different port - edit backend/run.py and change port=8000 to port=8001
```

### ❌ Error: "Cannot find module react-i18next" in frontend
**Problem:** Node dependencies not installed
**Solution:**
```bash
cd frontend
npm install
npm run dev
```

### ❌ Blank page or language issues
**Problem:** Browser cache or old files
**Solution:**
1. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Close all terminal windows
4. Restart servers with `start-all.cmd` or `start-all.ps1`

---

## ✔️ Verification Checklist

Before reporting a bug, verify:

- [ ] Backend is running: `netstat -ano | findstr :8000` shows TCP LISTENING on 8000
- [ ] Frontend is running: You can see Vite output in terminal (http://localhost:5173/)
- [ ] Browser shows http://localhost:5173/login (not an error page)
- [ ] Browser DevTools Console (F12) shows no red error messages
- [ ] Network tab (F12) shows API calls to http://localhost:8000/api/v1/*

---

## 📋 Server Ports Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (FastAPI) | 8000 | http://localhost:8000 |
| API Endpoint | 8000 | http://localhost:8000/api/v1 |

---

## 🚀 Full Development Workflow

### First Time Setup:
```bash
# 1. Install backend dependencies
cd backend
pip install -r requirements.txt

# 2. Install frontend dependencies
cd ../frontend
npm install

# 3. Go back to root
cd ..

# 4. Start everything
start-all.cmd  (or start-all.ps1 on PowerShell)
```

### Regular Development:
```bash
# Just run once per day:
start-all.cmd
# Then access http://localhost:5173
```

---

## 🛠️ Database & Migrations

If you get database errors:

```bash
cd backend
alembic upgrade head
python quick_seed.py
```

---

## 📍 Important File Locations

- **Frontend Source:** `frontend/src/`
- **Backend Source:** `backend/app/`
- **API Config:** `frontend/src/services/constants.js` (should be `http://localhost:8000/api/v1`)
- **Backend Config:** `backend/app/config.py`

---

## 💡 Pro Tips

1. **Keep both terminal windows open** - Minimize them, don't close
2. **Check browser console (F12)** - Most errors are logged there
3. **Check backend terminal** - API errors are printed there
4. **Hard refresh browser** - `Ctrl+Shift+R` when stuck
5. **Restart from scratch** - Close all terminals and run `start-all.cmd` again

---

## 📞 Still Having Issues?

1. Kill all processes: Close all terminal windows
2. Clear browser cache: `Ctrl+Shift+Delete`
3. Check ports: `netstat -ano | findstr :5173` and `netstat -ano | findstr :8000`
4. Start fresh: `start-all.cmd`
5. Check DevTools Console: `F12` → Console tab

---

**Last Updated:** March 29, 2026
**Status:** ✅ Both servers working, site reachable at http://localhost:5173
