# 🚀 QUICK START - Getting Login Working

## Problem: "Can't login with admin/admin"

The issue is likely one of these (in order of probability):

1. ❌ Backend not running / API not accessible
2. ❌ Admin user doesn't exist in database
3. ❌ `.env.local` not configured / API URL wrong
4. ❌ Database not initialized / migrations not run
5. ❌ Network connectivity issue

---

## ✅ Quick Fix (5 Steps)

### Step 1: Verify Backend is Running
```bash
# Check if backend is listening on port 5000
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","timestamp":"..."}

# If not running, start it:
cd server
npm install
npm start
```

**Expected output in terminal:**
```
🚀 Server running on port 5000
Security middleware initialized
CORS enabled: http://localhost:5173
Database connected
```

### Step 2: Create Admin User
```bash
# From server directory
node setup-admin.js

# This will:
# ✅ Connect to database
# ✅ Create admin user (password: admin)
# ✅ Create test users (pharmacist, cashier, manager)
```

**Expected output:**
```
✅ Admin user created successfully!
  ID:       1
  Username: admin
  Email:    admin@metapharsic.local
  Role:     ADMIN

🚀 Now you can login at http://localhost:5173/login
   Username: admin
   Password: admin
```

### Step 3: Configure Frontend
```bash
# Create .env.local from template
cp .env.frontend.example .env.local

# IMPORTANT: Edit .env.local and verify:
cat .env.local | grep VITE_API_URL

# Should show:
# VITE_API_URL=http://localhost:5000/api
```

### Step 4: Start Frontend
```bash
npm install
npm run dev

# Should show:
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

### Step 5: Test Login
1. Open **http://localhost:5173** in browser
2. Enter credentials:
   - **Username:** admin
   - **Password:** admin
3. Click **Sign In**
4. Should redirect to dashboard ✅

---

## ❌ If Login Still Fails

### Check Backend Health

**Terminal 1 - Backend Check:**
```bash
# Test API endpoint
curl -i http://localhost:5000/api/health

# Should return 200 OK
# {"status":"ok"}
```

**Terminal 2 - Test Login Endpoint:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Should return 200 OK with tokens
# {"message":"Login successful","accessToken":"...","refreshToken":"..."}

# If returns 401: Admin user doesn't exist - run: node server/setup-admin.js
# If returns 404: Route not found - check backend is running
# If no response: Backend not running on port 5000
```

### Check Frontend Connection

**DevTools (F12) → Console:**
```javascript
// Check API URL
console.log(import.meta.env.VITE_API_URL)
// Should output: "http://localhost:5000/api"

// Test direct API call
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(console.log)
// Should print: {status: "ok"}
```

**DevTools → Network Tab:**
1. Open Login page: http://localhost:5173/
2. Enter admin/admin
3. Click Login
4. Look for **POST /api/auth/login**
   - **Status:** Should be 200 ✅
   - **Duration:** ~100ms ✅
   - **Response:** Has accessToken ✅

---

## 🔍 Detailed Troubleshooting

### Issue 1: "Network Error" or "API not responding"

**Cause:** Backend not running or API URL wrong

**Solution:**
```bash
# Check backend is running
ps aux | grep "node" | grep -v grep
# Should show: node server/index.js or npm start

# If not running:
cd server
npm start

# Check API URL in frontend .env
cat .env.local | grep VITE_API_URL
# If not http://localhost:5000/api - update it

# Restart frontend
npm run dev
```

### Issue 2: "Invalid credentials" error

**Cause:** Admin user doesn't exist in database

**Solution:**
```bash
# Create admin user
cd server
node setup-admin.js

# If error about users table not existing:
# Run database migrations first:
psql -U postgres -d metapharsic_erp < migrations/001-initial-schema.sql
psql -U postgres -d metapharsic_erp < migrations/002-add-security-columns.sql

# Then create admin:
node setup-admin.js
```

### Issue 3: "Cannot find module" or dependency errors

**Cause:** Dependencies not installed

**Solution:**
```bash
# Backend
cd server
npm install
npm start

# Frontend (in separate terminal)
npm install
npm run dev
```

### Issue 4: "Connection refused" or "ECONNREFUSED"

**Cause:** Backend server crashed or not started

**Solution:**
```bash
# Check server logs
cd server
npm start 2>&1 | tee server.log

# Common errors:
# - "EADDRINUSE" = Port 5000 already in use
#   Kill: fuser -k 5000/tcp (Linux/Mac)
#   Or: netstat -ano | findstr :5000 (Windows)

# - "Error: connect ECONNREFUSED" = DB not accessible
#   Check: PostgreSQL running, credentials correct

# - "SyntaxError" = Code error
#   Check: Recent changes to server files
```

### Issue 5: CORS Error ("No 'Access-Control-Allow-Origin'")

**Cause:** Frontend URL not in CORS whitelist

**Solution:**
```bash
# Check server/.env has correct CORS origins
cat server/.env | grep CORS_ORIGINS
# Should include: http://localhost:5173

# If missing, add to server/.env:
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Restart backend
npm start
```

---

## 📋 Complete Setup Checklist

### Backend Setup
- [ ] PostgreSQL installed and running
- [ ] `server/.env` file exists with database credentials
- [ ] Migrations run: `001-initial-schema.sql`, `002-add-security-columns.sql`
- [ ] Admin user created: `node setup-admin.js`
- [ ] Backend started: `npm start` (on port 5000)
- [ ] Health check works: `curl http://localhost:5000/api/health`

### Frontend Setup
- [ ] `.env.local` created from `.env.frontend.example`
- [ ] `VITE_API_URL=http://localhost:5000/api` (correct URL)
- [ ] Dependencies installed: `npm install`
- [ ] Frontend started: `npm run dev` (on port 5173)
- [ ] Can access page: `http://localhost:5173`

### Test Login
- [ ] Can see login form
- [ ] Backend running (check with curl)
- [ ] Admin user exists (check in DB: `psql -U postgres -d metapharsic_erp`)
- [ ] Enter admin/admin
- [ ] Redirects to dashboard (if successful)
- [ ] Check browser DevTools → Application → Storage → localStorage (should have tokens)

---

## 💡 Pro Tips

### Enable Debug Logging
```bash
# Backend - see all requests
DEBUG=* npm start

# Frontend - see API calls
# DevTools → Console → Type: localStorage.setItem('DEBUG', '*')
```

### Check Database Directly
```bash
# Connect to database
psql -U postgres -d metapharsic_erp

# Check if users table exists
\dt users

# Check admin user
SELECT id, username, role FROM users WHERE username = 'admin';

# Exit psql
\q
```

### Monitor in Real-time
```bash
# Terminal 1: Backend logs
cd server && npm start

# Terminal 2: Frontend logs  
npm run dev

# Terminal 3: Monitor network
curl -v http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

---

## ✨ Success Indicators

✅ **Backend Running:**
```
$ curl http://localhost:5000/api/health
{"status":"ok","timestamp":"2026-03-18T..."}
```

✅ **Admin User Created:**
```
$ psql -U postgres -d metapharsic_erp -c "SELECT COUNT(*) FROM users WHERE username='admin';"
 count 
───────
     1
```

✅ **Frontend Connected:**
```
DevTools → Console:
[INFO] API Client: Token stored in localStorage
[INFO] Auth Context: User authenticated as admin
```

✅ **Login Succeeds:**
```
DevTools → Network → POST /api/auth/login:
Status: 200 OK
Response: {"message":"Login successful","accessToken":"...","user":{...}}
```

✅ **Redirects to Dashboard:**
```
URL changes to: http://localhost:5173/dashboard
LocalStorage has: accessToken, refreshToken, tokenExpiry
```

---

## 🚨 Emergency Recovery

If everything is broken:

```bash
# 1. Stop everything
Ctrl+C (in all terminals)

# 2. Clean slate
rm -rf node_modules
rm .env.local
rm -rf ~/.psql_history

# 3. Reinstall
npm install
cd server && npm install && cd ..

# 4. Reconfigure
cp .env.frontend.example .env.local
cp server/.env.example server/.env

# Edit .env files with correct credentials

# 5. Reset database (if needed)
dropdb metapharsic_erp
createdb metapharsic_erp
psql -U postgres -d metapharsic_erp < server/migrations/001-initial-schema.sql
psql -U postgres -d metapharsic_erp < server/migrations/002-add-security-columns.sql

# 6. Setup admin
cd server && node setup-admin.js && cd ..

# 7. Start fresh
cd server && npm start
# (in another terminal)
npm run dev
```

---

## 📞 Still Need Help?

Check these files for more info:
- `PHASE_1.5_IMPLEMENTATION_GUIDE.md` - Complete integration guide
- `SECURITY_IMPLEMENTATION.md` - Backend auth details
- `server/controllers/authController.js` - Login endpoint
- `context/AuthContext.tsx` - Frontend auth logic

---

**Summary:**
1. ✅ Start backend: `cd server && npm start`
2. ✅ Create admin: `node setup-admin.js`
3. ✅ Configure frontend: Create `.env.local`
4. ✅ Start frontend: `npm run dev`
5. ✅ Login at: `http://localhost:5173` with `admin/admin`

**Expected time:** 2-3 minutes ⏱️
