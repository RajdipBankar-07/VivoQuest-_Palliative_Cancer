@echo off
setlocal enabledelayedexpansion
title VivoQuest - One Click GitHub Push

:: Move to script directory
cd /d "%~dp0"

echo ==============================================================================
echo                 VivoQuest Healthcare Platform - One Click GitHub Push
echo ==============================================================================
echo.

:: 1. Verify Git Installation & Auto-detect Path
where git >nul 2>&1
if %ERRORLEVEL% equ 0 goto :git_ready

echo [*] Git not found in system PATH. Checking standard installation locations...
if exist "E:\Program Files\Git\cmd\git.exe" (
    set "PATH=E:\Program Files\Git\cmd;%PATH%"
    goto :git_ready
)
if exist "C:\Program Files\Git\cmd\git.exe" (
    set "PATH=C:\Program Files\Git\cmd;%PATH%"
    goto :git_ready
)
if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
    set "PATH=C:\Program Files (x86)\Git\cmd;%PATH%"
    goto :git_ready
)
if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
    goto :git_ready
)

echo [!] ERROR: Git executable could not be found!
echo     Please install Git from https://git-scm.com/ or ensure it is in PATH.
echo.
pause
exit /b 1

:git_ready
echo [OK] Git is available:
git --version
echo.

:: 2. Target GitHub Repository
set "TARGET_REPO=https://github.com/RajdipBankar-07/VivoQuest-_Palliative_Cancer.git"
set "BRANCH=main"

echo [*] Target Repository : %TARGET_REPO%
echo [*] Target Branch     : %BRANCH%
echo.

:: 3. Configure Git Remote
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% equ 0 (
    git remote set-url origin "%TARGET_REPO%"
) else (
    git remote add origin "%TARGET_REPO%"
)

echo [OK] Remote configured:
git remote -v
echo.

:: 4. Ensure Git Author Identity is Set
git config user.name >nul 2>&1
if %ERRORLEVEL% neq 0 (
    git config --global user.name "VivoQuest Developer"
)
git config user.email >nul 2>&1
if %ERRORLEVEL% neq 0 (
    git config --global user.email "dev@vivoquest.in"
)

:: 5. Commit Message Selection
echo ------------------------------------------------------------------------------
set "DEFAULT_MSG=VivoQuest Phase 4: AI Care Coordination, Bundling and Provider Matching"
echo Default Commit Message:
echo   "%DEFAULT_MSG%"
echo.
set "COMMIT_MSG=%DEFAULT_MSG%"
set "USER_MSG="
set /p "USER_MSG=Enter custom commit message or press ENTER to use default: "
if defined USER_MSG (
    set "USER_MSG=!USER_MSG:"=!"
    if not "!USER_MSG!"=="" if not "!USER_MSG!"==" " set "COMMIT_MSG=!USER_MSG!"
)
echo.
echo [*] Using commit message: "%COMMIT_MSG%"
echo.

:: 6. Stage Changes
echo [*] Staging all files into Git...
git add -A

:: Check if there are changes to commit
git diff --cached --quiet
if %ERRORLEVEL% equ 0 (
    echo [*] No newly staged changes to commit. Proceeding to push existing commits...
    goto :do_push
)

echo [*] Committing changes...
git commit -m "%COMMIT_MSG%"
echo [OK] Changes committed.
echo.

:do_push
:: 7. Ensure Branch is named 'main'
git branch -M "%BRANCH%"

:: 8. Push to GitHub
echo ------------------------------------------------------------------------------
echo [*] Pushing code to GitHub [%BRANCH%]...
echo     Please sign in via browser or Personal Access Token if prompted.
echo ------------------------------------------------------------------------------
echo.

git push -u origin "%BRANCH%"
if %ERRORLEVEL% equ 0 goto :push_success

echo.
echo [!] Regular push did not succeed.
echo     Attempting force push to ensure clean remote synchronization...
echo.
git push -u origin "%BRANCH%" --force
if %ERRORLEVEL% equ 0 goto :push_success

echo.
echo ==============================================================================
echo [!] Push failed. Please check your internet connection or GitHub permissions.
echo ==============================================================================
goto :end

:push_success
echo.
echo ==============================================================================
echo [SUCCESS] Code successfully pushed to GitHub!
echo           Repository: %TARGET_REPO%
echo           Branch:     %BRANCH%
echo ==============================================================================

:end
echo.
echo Press any key to exit...
pause >nul
