@echo off
setlocal enabledelayedexpansion
title VivoQuest Mobile Apps - Fast Launcher

:: Move to script root directory
cd /d "%~dp0"

echo ==============================================================================
echo             VivoQuest Healthcare Platform - Mobile Apps Launcher
echo ==============================================================================
echo.

:: 1. Verify Node.js Installation & Auto-detect Path
where node >nul 2>&1
if %ERRORLEVEL% equ 0 goto :node_ready

echo [*] Node.js not found in system PATH. Checking standard installation locations...
if exist "E:\Program Files\nodejs\node.exe" (
    set "PATH=E:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
    goto :node_ready
)
if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
    goto :node_ready
)
if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "PATH=C:\Program Files (x86)\nodejs;%APPDATA%\npm;%PATH%"
    goto :node_ready
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\npm;%PATH%"
    goto :node_ready
)

echo [!] ERROR: Node.js was not found in your system PATH!
echo     Please install Node.js from https://nodejs.org/
pause
exit /b 1

:node_ready
for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
echo [OK] Node.js is ready: %NODE_VER%

:: 2. Detect LAN IP for mobile device networking
set "LAN_IP="
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notlike '*Loopback*' } | Select-Object -ExpandProperty IPAddress -First 1)" 2^>nul') do (
    set "LAN_IP=%%a"
)
if "%LAN_IP%"=="" set "LAN_IP=127.0.0.1"

echo [OK] Active LAN IP detected: %LAN_IP%
set "EXPO_PUBLIC_API_URL=http://%LAN_IP%:4000/api/v1"
echo [OK] API URL configured for mobile: %EXPO_PUBLIC_API_URL%
echo.

:: 3. Check if Backend API (Port 4000) is running
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Backend API is already running on port 4000.
) else (
    echo [*] Backend API is not running. Starting Express API Server on port 4000...
    start "VivoQuest Backend API [Port 4000]" cmd /k "title VivoQuest Backend API [Port 4000] && cd /d "%~dp0apps\api" && npm run dev"
    ping 127.0.0.1 -n 3 >nul
)

:: 4. Launch Patient Mobile App (Port 8081)
echo [*] Starting VivoQuest Patient Mobile App on Port 8081...
start "VivoQuest Mobile Patient App [Port 8081]" cmd /k "title VivoQuest Mobile Patient App [Port 8081] && cd /d "%~dp0apps\mobile-patient" && set "EXPO_PUBLIC_API_URL=%EXPO_PUBLIC_API_URL%" && npx expo start --port 8081"

:: 5. Launch Caregiver Mobile App (Port 8082)
echo [*] Starting VivoQuest Caregiver Mobile App on Port 8082...
start "VivoQuest Mobile Caregiver App [Port 8082]" cmd /k "title VivoQuest Mobile Caregiver App [Port 8082] && cd /d "%~dp0apps\mobile-caregiver" && set "EXPO_PUBLIC_API_URL=%EXPO_PUBLIC_API_URL%" && npx expo start --port 8082"

echo.
echo ==============================================================================
echo                    VIVOQUEST MOBILE APPS ARE RUNNING!
echo ==============================================================================
echo  1. Patient Mobile App   : Port 8081 (Expo Bundler)
echo     Metro / Web URL      : http://localhost:8081
echo     Expo Go QR Target    : exp://%LAN_IP%:8081
echo.
echo  2. Caregiver Mobile App : Port 8082 (Expo Bundler)
echo     Metro / Web URL      : http://localhost:8082
echo     Expo Go QR Target    : exp://%LAN_IP%:8082
echo.
echo  Backend API Service     : %EXPO_PUBLIC_API_URL%
echo ==============================================================================
echo.
echo  Tips:
echo   - In each mobile terminal window, press:
echo       'a' - Run on Android Device / Emulator
echo       'w' - Open Web preview in browser
echo       'r' - Reload app bundler
echo   - Or scan the QR code shown in the window using Expo Go on your mobile phone
echo   - To cleanly stop all mobile apps and services, run: stop_all.bat
echo ==============================================================================
echo.
pause
