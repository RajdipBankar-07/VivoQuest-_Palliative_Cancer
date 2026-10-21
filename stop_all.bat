@echo off
setlocal enabledelayedexpansion
title VivoQuest Healthcare Platform - Stop All Services

cd /d "%~dp0"

echo ==============================================================================
echo                 VivoQuest Healthcare Platform - Stop All Services
echo ==============================================================================
echo.
echo [*] Terminating background processes on ports 3000, 4000, and 8000...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ports = @(3000, 4000, 8000);" ^
    "foreach ($p in $ports) {" ^
    "    $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue;" ^
    "    if ($conns) {" ^
    "        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique;" ^
    "        foreach ($procId in $pids) {" ^
    "            if ($procId -gt 4) {" ^
    "                Write-Host \"[+] Terminating process $procId on port $p...\";" ^
    "                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue;" ^
    "            }" ^
    "        }" ^
    "    }" ^
    "};"

echo.
echo [OK] All VivoQuest services stopped successfully.
echo.
pause
