@echo off
cd /d "%~dp0"
TITLE Metapharsic ERP - Shutdown

echo ===================================================
echo   METAPHARSIC ERP - SHUTDOWN SEQUENCE
echo ===================================================

echo [1/2] Stopping processes on ports 3005 and 5005...

:: Kill processes on port 3005 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3005 ^| findstr LISTENING') do (
    echo Killing process %%a on port 3005...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes on port 5005 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5005 ^| findstr LISTENING') do (
    echo Killing process %%a on port 5005...
    taskkill /F /PID %%a >nul 2>&1
)

:: Fallback: Kill all node processes if any remain (Optional - commented out for safety)
:: echo Killing any remaining Node.js processes...
:: taskkill /F /IM node.exe /T >nul 2>&1

echo [2/2] Cleaning up system resources...

echo.
echo ===================================================
echo Application has been stopped successfully.
echo ===================================================
timeout /t 3
