@echo off
setlocal
title VivoQuest Healthcare Platform - Launcher

:: Ensure running from script directory
cd /d "%~dp0"

echo ==============================================================================
echo                 VivoQuest Healthcare Platform - Launcher
echo ==============================================================================
echo.

:: 1. Verify Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 goto :no_node
echo [OK] Node.js is installed.

:: 2. Verify npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 goto :no_npm
echo [OK] npm is installed.

:: 3. Verify Python (optional for AI engine)
set "HAS_PYTHON=1"
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] Python is not in PATH. AI services will be skipped.
    set "HAS_PYTHON=0"
) else (
    echo [OK] Python is installed.
)

:: 4. Verify MongoDB
echo [*] Checking local MongoDB service...
sc query MongoDB | findstr /i "RUNNING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] MongoDB service is active.
    goto :start_servers
)

echo [*] Attempting to start MongoDB service...
net start MongoDB >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] MongoDB service started.
) else (
    echo [!] Notice: Local MongoDB service is not started. Please ensure MongoDB is running.
)

:start_servers
echo.
echo ==============================================================================
echo                 Launching VivoQuest Services in New Windows...
echo ==============================================================================
echo.

:: 1. Launch Backend API (Port 4000)
echo [*] Starting Backend Express API on port 4000...
start "VivoQuest Backend API [Port 4000]" cmd /k "cd /d "%~dp0apps\api" && npm run dev"

:: 2. Launch AI Microservice (Port 8000) if Python is available
if "%HAS_PYTHON%"=="1" (
    echo [*] Starting Python AI FastAPI Microservice on port 8000...
    start "VivoQuest AI Services [Port 8000]" cmd /k "cd /d "%~dp0apps\ai-services" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
)

:: 3. Launch Frontend Web App (Port 3000)
echo [*] Starting Next.js Frontend Web App on port 3000...
start "VivoQuest Frontend App [Port 3000]" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ==============================================================================
echo                     ALL SERVICES LAUNCHED SUCCESSFULLY!
echo ==============================================================================
echo.
echo  Web Application       : http://localhost:3000
echo  Backend Express API   : http://localhost:4000
if "%HAS_PYTHON%"=="1" (
echo  AI FastAPI Microservice: http://localhost:8000
echo  AI Swagger Docs       : http://localhost:8000/docs
)
echo.
echo  Quick Access Links:
echo   - Patient Portal      : http://localhost:3000/appointments
echo   - Doctor Portal       : http://localhost:3000/doctor/dashboard
echo   - Hospital Portal     : http://localhost:3000/hospital/dashboard
echo   - Operations Admin    : http://localhost:3000/admin/dashboard
echo   - Super Admin         : http://localhost:3000/super-admin/dashboard
echo.
echo  Demo Accounts (OTP: 123456):
echo   - Super Admin         : Phone 9899000001
echo   - Operations Lead     : Phone 9899009900
echo   - Hospital Staff      : Phone 9822011111
echo   - Doctor Specialist   : Phone 9811011111
echo   - Patient             : Phone 9810011111
echo.
echo ==============================================================================
echo [*] Opening http://localhost:3000 in your default browser...
ping -n 4 127.0.0.1 >nul
start http://localhost:3000

echo.
echo [OK] Services are running in separate windows.
echo      To terminate all services at once, double-click 'stop_all.bat'.
echo.
pause
exit /b 0

:no_node
echo.
echo [!] ERROR: Node.js was not found in your system PATH!
echo     Please install Node.js from https://nodejs.org/
echo.
pause
exit /b 1

:no_npm
echo.
echo [!] ERROR: npm was not found in your system PATH!
echo.
pause
exit /b 1
