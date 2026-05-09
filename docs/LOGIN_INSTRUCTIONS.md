# ERP Login Instructions

**Date:** March 30, 2026  
**Status:** ✅ SERVERS STARTED

---

## Access the ERP

### Frontend Application
**URL:** http://localhost:5173

### Backend API
**URL:** http://localhost:5000/api

---

## Login Credentials

### Admin User
- **Username:** admin
- **Password:** admin
- **Role:** ADMIN (Full Access)

### Demo Users
You can also use:
- **Pharmacist:** pharmacist / password
- **Cashier:** cashier / password
- **Manager:** manager / password

---

## What Was Fixed

### ✅ Issue: "Too Many Requests" Error
**Root Cause:** Rate limiter was triggered (5 login attempts per 15 minutes limit)

**Solution Applied:**
1. Stopped all Node.js processes
2. Cleared rate limit state (in-memory)
3. Restarted backend server
4. Started frontend development server

---

## Current Server Status

### ✅ Backend Server (Port 5000)
- Status: Running
- Framework: Express.js
- Database: PostgreSQL
- API Base: http://localhost:5000/api
- Auth Limiter: Reset ✅

### ✅ Frontend Server (Port 5173)
- Status: Running
- Framework: Vite + React
- Build Tool: Vite v6.4.1
- Ready for development

---

## How to Login

1. **Open Browser:**
   ```
   http://localhost:5173
   ```

2. **On Login Page:**
   - **Username:** admin
   - **Password:** admin

3. **Click Login Button**

4. **You'll see:**
   - Dashboard with 21 ERP modules
   - Full access to all features
   - Option to explore demo modules

---

## If You Still Can't Login

Try these steps:

### Option 1: Wait 2-3 Minutes
The rate limiter resets in 15 minutes. You have 5 fresh attempts now.

### Option 2: Check Services
Verify services are running:
```powershell
# Check Node.js
Get-Process node

# Check PostgreSQL
Get-Service postgresql-x64-18

# Check API
Invoke-WebRequest http://localhost:5000/api/auth/health
```

### Option 3: Clear Browser Cache
```
Ctrl + Shift + Delete  (or Cmd + Shift + Delete on Mac)
```

### Option 4: Restart Services
Run the startup script:
```powershell
./start_app.bat
```

---

## Available Modules After Login

### Core Operations
- Dashboard
- POS / Billing
- Inventory
- Purchase
- Accounts / Finance

### Sales & Marketing
- PCD Management
- CRM
- Order Management

### Manufacturing
- Manufacturing
- Quality Control
- R&D

### Admin & Support
- Human Resources
- Compliance
- Audit Log
- Settings
- Multi-Branch
- And more...

---

## Test Login Now

**Quick Test:**
1. Go to: http://localhost:5173
2. Username: **admin**
3. Password: **admin**
4. Click **Login**

---

**If you get another rate limit error, wait 15 minutes and try again.**

**Report any other errors and I'll fix them immediately!**
