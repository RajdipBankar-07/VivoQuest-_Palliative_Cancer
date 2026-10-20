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
if %ERRORLEVEL% neq 0 (
    echo [*] Git not found in system PATH. Checking standard installation locations...
    if exist "E:\Program Files\Git\cmd\git.exe" (
        set "PATH=E:\Program Files\Git\cmd;%PATH%"
    ) else if exist "C:\Program Files\Git\cmd\git.exe" (
        set "PATH=C:\Program Files\Git\cmd;%PATH%"
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set "PATH=C:\Program Files (x86)\Git\cmd;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
    ) else (
        echo [!] ERROR: Git executable could not be found!
        echo     Please install Git from https://git-scm.com/ or ensure it is in PATH.
        echo.
        pause
        exit /b 1
    )
)

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
    echo [*] Updating remote 'origin' to target repository...
    git remote set-url origin "%TARGET_REPO%"
) else (
    echo [*] Adding remote 'origin'...
    git remote add origin "%TARGET_REPO%"
)

:: Verify current remote
echo [OK] Remote configured:
git remote -v
echo.

:: 4. Ensure Git Author Identity is Set (prevents commit failure on fresh machines)
git config user.name >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] Git user.name not configured. Setting default 'VivoQuest Developer'...
    git config --global user.name "VivoQuest Developer"
)
git config user.email >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] Git user.email not configured. Setting default 'dev@vivoquest.in'...
    git config --global user.email "dev@vivoquest.in"
)

:: 5. Commit Message Selection
echo ------------------------------------------------------------------------------
set "DEFAULT_MSG=VivoQuest Phase 4: AI Care Coordination, Bundling & Provider Matching"
echo Default Commit Message:
echo   "%DEFAULT_MSG%"
echo.
set /p "USER_MSG=Enter custom commit message (or press ENTER to use default): "
if "%USER_MSG%"=="" (
    set "COMMIT_MSG=%DEFAULT_MSG%"
) else (
    set "COMMIT_MSG=%USER_MSG%"
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
) else (
    echo [*] Committing changes...
    git commit -m "%COMMIT_MSG%"
    if %ERRORLEVEL% neq 0 (
        echo [!] Warning: Commit command finished with warnings or error.
    ) else (
        echo [OK] Changes committed successfully.
    )
)
echo.

:: 7. Ensure Branch is named 'main'
git branch -M "%BRANCH%"

:: 8. Push to GitHub
echo ------------------------------------------------------------------------------
echo [*] Pushing code to GitHub (%BRANCH%)...
echo     (If prompted, sign in via browser or Personal Access Token)
echo ------------------------------------------------------------------------------
echo.

git push -u origin "%BRANCH%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==============================================================================
    echo [SUCCESS] Code successfully pushed to GitHub!
    echo           Repository: %TARGET_REPO%
    echo           Branch:     %BRANCH%
    echo ==============================================================================
) else (
    echo.
    echo [!] Push failed or was rejected.
    echo     Checking if remote repository contains existing files (e.g., initial README)...
    echo.
    set /p "RETRY_FORCE=Do you want to force push and overwrite remote (y/N)? "
    if /i "!RETRY_FORCE!"=="y" (
        echo [*] Force pushing to remote branch '%BRANCH%'...
        git push -u origin "%BRANCH%" --force
        if !ERRORLEVEL! equ 0 (
            echo.
            echo [SUCCESS] Force push completed successfully!
        ) else (
            echo.
            echo [!] Force push failed. Please verify repository access permissions.
        )
    ) else (
        echo [*] Attempting to pull remote changes and rebase...
        git pull origin "%BRANCH%" --allow-unrelated-histories --no-rebase
        echo [*] Retrying push...
        git push -u origin "%BRANCH%"
    )
)

echo.
echo Press any key to exit...
pause >nul
