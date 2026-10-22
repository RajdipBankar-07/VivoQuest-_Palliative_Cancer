# VivoQuest Healthcare Platform - PowerShell Launcher
param (
    [string]$CustomLanIp = ""
)

$ErrorActionPreference = "Continue"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "                VivoQuest Healthcare Platform - Launcher" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

# -----------------------------------------------------------------------------
# 1. Check Node.js and configure PATH
# -----------------------------------------------------------------------------
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
    Write-Host "    Please ensure Node.js is installed from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    try { Read-Host "Press Enter to exit..." } catch {}
    exit 1
}

$nodeVer = & node -v
Write-Host "[OK] Node.js is ready: $nodeVer" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 2. Check MongoDB Service Status
# -----------------------------------------------------------------------------
$mongoService = Get-Service MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq "Running") {
    Write-Host "[OK] MongoDB local service is active and running." -ForegroundColor Green
} else {
    Write-Host "[*] Checking local MongoDB service..." -ForegroundColor Yellow
    Start-Service MongoDB -ErrorAction SilentlyContinue
    $mongoService = Get-Service MongoDB -ErrorAction SilentlyContinue
    if ($mongoService -and $mongoService.Status -eq "Running") {
        Write-Host "[OK] MongoDB service started successfully." -ForegroundColor Green
    } else {
        Write-Host "[!] Notice: Local MongoDB service is not running. Ensure MongoDB or Atlas MONGODB_URI is available." -ForegroundColor Yellow
    }
}

# -----------------------------------------------------------------------------
# 3. Detect LAN IP Address
# -----------------------------------------------------------------------------
$lanIp = $CustomLanIp
if (-not $lanIp -and $env:DEV_LAN_IP) {
    $lanIp = $env:DEV_LAN_IP
}
if (-not $lanIp) {
    try {
        $lanIp = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | 
            Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -notlike '127.*' -and $_.IPAddressToString -notlike '169.254.*' } | 
            Select-Object -ExpandProperty IPAddressToString -First 1
    } catch {}
}
if (-not $lanIp) { $lanIp = "10.151.164.41" }

$env:DEV_LAN_IP = $lanIp
$env:NEXT_PUBLIC_LAN_IP = $lanIp
Write-Host "[OK] Active LAN IP detected: $lanIp" -ForegroundColor Green
Write-Host ""

# -----------------------------------------------------------------------------
# 4. Check & Launch Backend Express API (Port 4000)
# -----------------------------------------------------------------------------
$backConn = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($backConn) {
    $p = Get-Process -Id $backConn.OwningProcess -ErrorAction SilentlyContinue
    $pName = if ($p) { $p.ProcessName } else { "Unknown" }
    Write-Host "[!] Notice: Port 4000 is ALREADY in use by process '$pName' (PID: $($backConn.OwningProcess))." -ForegroundColor Yellow
    Write-Host "    Reusing running Backend API server. Duplicate process will NOT be launched." -ForegroundColor Gray
} else {
    Write-Host "[*] Starting Express API Server on port 4000..." -ForegroundColor Cyan
    Start-Process cmd.exe -ArgumentList "/k title VivoQuest Backend API [Port 4000] && cd /d `"$root\apps\api`" && npm run dev"
}

# -----------------------------------------------------------------------------
# 5. Check & Launch Python AI Microservice (Port 8000)
# -----------------------------------------------------------------------------
if (Get-Command python -ErrorAction SilentlyContinue) {
    if (Test-Path "$root\apps\ai-services\app\main.py") {
        $aiConn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $aiConn) {
            Write-Host "[*] Starting Python AI FastAPI Microservice on port 8000..." -ForegroundColor Cyan
            Start-Process cmd.exe -ArgumentList "/k title VivoQuest AI Microservice [Port 8000] && cd /d `"$root\apps\ai-services`" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
        } else {
            Write-Host "[*] AI FastAPI Microservice already active on port 8000." -ForegroundColor Yellow
        }
    }
}

# -----------------------------------------------------------------------------
# 6. Check & Launch Next.js Frontend Web App (Port 3000, bound to 0.0.0.0)
# -----------------------------------------------------------------------------
$frontConn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($frontConn) {
    $p = Get-Process -Id $frontConn.OwningProcess -ErrorAction SilentlyContinue
    $pName = if ($p) { $p.ProcessName } else { "Unknown" }
    Write-Host "[!] Notice: Port 3000 is ALREADY in use by process '$pName' (PID: $($frontConn.OwningProcess))." -ForegroundColor Yellow
    Write-Host "    Reusing running Frontend server. Duplicate process will NOT be launched." -ForegroundColor Gray
} else {
    Write-Host "[*] Starting Next.js Frontend Web App bound to 0.0.0.0 on port 3000..." -ForegroundColor Cyan
    Start-Process cmd.exe -ArgumentList "/k title VivoQuest Frontend Web App [Port 3000] && cd /d `"$root\frontend`" && npm run dev"
}

# -----------------------------------------------------------------------------
# 7. Wait for Frontend Availability on Port 3000
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[*] Probing frontend availability on port 3000..." -ForegroundColor Cyan
$maxWait = 35; $waited = 0; $ready = $false
while ($waited -lt $maxWait) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", 3000)
        $tcp.Close()
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
        $waited++
    }
}

if ($ready) {
    Write-Host "[OK] Frontend server is responsive on port 3000!" -ForegroundColor Green
} else {
    Write-Host "[!] Notice: Port 3000 compilation is in progress. The browser will connect once ready." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "                     VIVOQUEST SERVICES ACTIVE" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host " Preferred LAN Frontend URL : http://${lanIp}:3000" -ForegroundColor Cyan
Write-Host " Localhost Frontend URL     : http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host " Backend Express API Base   : http://localhost:4000" -ForegroundColor White
Write-Host " Backend Health Check URL   : http://localhost:4000/api/v1/health" -ForegroundColor White
Write-Host " Backend Services API       : http://localhost:4000/api/v1/services" -ForegroundColor White
Write-Host " Medical Products Catalog   : http://localhost:4000/api/v1/products" -ForegroundColor White
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host " AI FastAPI Microservice    : http://localhost:8000" -ForegroundColor White
    Write-Host " AI Swagger Docs            : http://localhost:8000/docs" -ForegroundColor White
}
Write-Host ""
Write-Host " Primary Application Pages:" -ForegroundColor White
Write-Host "  - Medical Equipment / DME : http://${lanIp}:3000/products" -ForegroundColor White
Write-Host "  - Caregiver Plans & Sub   : http://${lanIp}:3000/caregiver-plans" -ForegroundColor White
Write-Host "  - Patient Sign-In         : http://${lanIp}:3000/sign-in" -ForegroundColor White
Write-Host "  - Appointments            : http://${lanIp}:3000/appointments" -ForegroundColor White
Write-Host "  - Doctor Specialist Portal: http://${lanIp}:3000/doctor/dashboard" -ForegroundColor White
Write-Host "  - Hospital Partner Portal : http://${lanIp}:3000/hospital/dashboard" -ForegroundColor White
Write-Host "  - Operations Admin Portal : http://${lanIp}:3000/admin/dashboard" -ForegroundColor White
Write-Host "  - Super Admin Governance  : http://${lanIp}:3000/super-admin/dashboard" -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""

# -----------------------------------------------------------------------------
# 8. Launch Preferred LAN URL in Default Browser
# -----------------------------------------------------------------------------
Write-Host "[*] Automatically launching http://${lanIp}:3000 in your default browser..." -ForegroundColor Cyan
try {
    Start-Process "http://${lanIp}:3000"
} catch {
    Write-Host "[!] Notice: Could not launch browser automatically. Please open http://${lanIp}:3000 manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[OK] All VivoQuest services are running in separate terminal windows." -ForegroundColor Green
Write-Host "     To safely stop all VivoQuest services, run stop_all.bat." -ForegroundColor Gray
Write-Host ""
try {
    Write-Host "Press Enter to close this launcher window (services will stay running)..." -ForegroundColor Yellow
    Read-Host
} catch {}
