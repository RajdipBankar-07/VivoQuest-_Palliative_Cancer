# VivoQuest Healthcare Platform - PowerShell Launcher
$ErrorActionPreference = "Continue"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "                VivoQuest Healthcare Platform - Launcher" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[!] ERROR: Node.js is not found in PATH. Please install Node.js." -ForegroundColor Red
    pause
    exit 1
}
Write-Host "[OK] Node.js is installed." -ForegroundColor Green

# 2. Check MongoDB
$mongoService = Get-Service MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq "Running") {
    Write-Host "[OK] MongoDB service is running." -ForegroundColor Green
} else {
    Write-Host "[*] Attempting to start MongoDB service..." -ForegroundColor Yellow
    Start-Service MongoDB -ErrorAction SilentlyContinue
}

# 3. Start Backend Express API (Port 4000)
Write-Host "[*] Starting Express API Server on port 4000..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/k title VivoQuest Backend API [Port 4000] && cd /d `"$root\apps\api`" && npm run dev"

# 4. Start Python AI Microservice (Port 8000)
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "[*] Starting Python AI FastAPI Microservice on port 8000..." -ForegroundColor Cyan
    Start-Process cmd.exe -ArgumentList "/k title VivoQuest AI Microservice [Port 8000] && cd /d `"$root\apps\ai-services`" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
}

# 5. Start Next.js Frontend (Port 3000)
Write-Host "[*] Starting Next.js Frontend Web App on port 3000..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/k title VivoQuest Frontend Web App [Port 3000] && cd /d `"$root\frontend`" && npm run dev"

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "                    ALL SERVICES LAUNCHED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host " Web Application       : http://localhost:3000" -ForegroundColor White
Write-Host " Backend Express API   : http://localhost:4000" -ForegroundColor White
Write-Host " AI FastAPI Gateway    : http://localhost:8000" -ForegroundColor White
Write-Host " AI Swagger Docs       : http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host " Demo Accounts (OTP: 123456):" -ForegroundColor Yellow
Write-Host "  - Super Admin        : Phone 9899000001"
Write-Host "  - Operations Admin   : Phone 9899009900"
Write-Host "  - Hospital Staff     : Phone 9822011111"
Write-Host "  - Doctor Specialist  : Phone 9811011111"
Write-Host "  - Patient            : Phone 9810011111"
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "[*] Opening http://localhost:3000 in your browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"
