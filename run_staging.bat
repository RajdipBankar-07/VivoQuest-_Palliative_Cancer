@echo off
setlocal
title VivoQuest Healthcare Platform - Staging Launcher
cd /d "%~dp0"

set "PS_EXE=powershell.exe"
where powershell >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
        set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
    )
)

"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_staging.ps1" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo ==============================================================================
    echo [!] VivoQuest Staging Launcher encountered an issue (Exit Code: %ERRORLEVEL%).
    echo ==============================================================================
    echo.
    pause
)
