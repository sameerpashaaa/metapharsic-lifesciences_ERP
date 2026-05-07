@echo off
cd /d "%~dp0"
TITLE Metapharsic ERP - Startup

echo ===================================================
echo   METAPHARSIC ERP - STARTUP SEQUENCE
echo ===================================================

:: Kill existing processes on ports 3005 and 5005 to avoid EADDRINUSE
echo [1/3] Checking for existing processes on ports 3005 and 5005...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3005 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5005 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

:: Attempt to start PostgreSQL if not running
echo [2/3] Verifying Database service...
net start postgresql-x64-18 >nul 2>&1

:: Start everything
echo [3/3] Launching Backend and Frontend...
echo.
echo ---------------------------------------------------
echo Backend API:      http://localhost:5005
echo API Health:       http://localhost:5005/api/health
echo API Docs:         http://localhost:5005/api-docs
echo Frontend App:     http://localhost:3005
echo ---------------------------------------------------
echo.

npm run start-all
