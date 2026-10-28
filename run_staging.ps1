# ==============================================================================
# VivoQuest Healthcare Platform - Staging Environment Launcher
# ==============================================================================
param (
    [string]$CustomLanIp = ""
)

$ErrorActionPreference = "Continue"

Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host "                VivoQuest Healthcare Platform - STAGING LAUNCHER" -ForegroundColor Magenta
Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host ""

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

# 1. Configure PATH for Node.js
$nodePaths = @(
    "E:\Program Files\nodejs",
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:APPDATA\npm"
)
foreach ($p in $nodePaths) {
    if ($p -and $env:PATH -notlike "*$p*") {
        $env:PATH = "$p;$env:PATH"
    }
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[!] ERROR: Node.js was not found in your system PATH!" -ForegroundColor Red
    exit 1
}

# 2. Configure Staging Environment Variables
$env:NODE_ENV = "staging"
$env:PORT = "4001"
$env:API_BASE_URL = "http://localhost:4001"
$env:WEB_APP_URL = "http://localhost:3001"
$env:MONGODB_DB_NAME = "vivoquest_staging_db"
$env:ALLOW_DEV_MOCK_OTP = "false"
$env:JWT_SECRET = "vivoquest_staging_jwt_secret_isolated_sec_key_2026"
$env:CORS_ALLOWED_ORIGINS = "http://localhost:3001,http://127.0.0.1:3001,https://staging.vivoquest.com,https://admin-staging.vivoquest.com"
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:4001"
$env:EXPO_PUBLIC_API_URL = "http://localhost:4001/api/v1"

Write-Host "[OK] Staging environment configured." -ForegroundColor Green
Write-Host "     - API Port: 4001 (Isolated)" -ForegroundColor Gray
Write-Host "     - Web Port: 3001 (Isolated)" -ForegroundColor Gray
Write-Host "     - Database: vivoquest_staging_db (Isolated)" -ForegroundColor Gray
Write-Host "     - Security: ALLOW_DEV_MOCK_OTP=false (Mock OTP Disabled)" -ForegroundColor Gray
Write-Host "     - Payments: Razorpay SANDBOX TEST MODE" -ForegroundColor Gray
Write-Host ""

# 3. Check MongoDB service
$mongoService = Get-Service MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq "Running") {
    Write-Host "[OK] MongoDB service is active and running." -ForegroundColor Green
} else {
    Write-Host "[*] Starting MongoDB service..." -ForegroundColor Yellow
    Start-Service MongoDB -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "[*] Launching VivoQuest Staging Backend API (Port 4001)..." -ForegroundColor Cyan
$apiProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\apps\api'; `$env:PORT=4001; `$env:NODE_ENV='staging'; `$env:MONGODB_DB_NAME='vivoquest_staging_db'; `$env:ALLOW_DEV_MOCK_OTP='false'; npx tsx src/server.ts" -PassThru

Write-Host "[*] Launching VivoQuest Staging Frontend Web & Admin (Port 3001)..." -ForegroundColor Cyan
$webProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; `$env:PORT=3001; `$env:NEXT_PUBLIC_API_BASE_URL='http://localhost:4001'; npm run dev -- -p 3001" -PassThru

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "               VivoQuest Staging Services Running" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "  - Staging Web & Admin:     http://localhost:3001" -ForegroundColor Yellow
Write-Host "  - Staging API Health:      http://localhost:4001/api/v1/health" -ForegroundColor Yellow
Write-Host "  - Staging Database:        mongodb://127.0.0.1:27017/vivoquest_staging_db" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Green
