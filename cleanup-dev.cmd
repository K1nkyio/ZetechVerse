@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Run this from Command Prompt (cmd.exe), not PowerShell.
cd /d "%~dp0"

echo.
echo ============================================
echo   ZetechVerse Dev Cleanup
echo ============================================
echo.

call :remove_dir "user-dashboard\node_modules\.vite"
call :remove_dir "user-dashboard\dist"
call :remove_dir "admin-dashboard\node_modules\.vite"
call :remove_dir "admin-dashboard\dist"
call :remove_dir "backend\dist"

echo.
echo Checking backend OAuth env keys in backend\.env ...
call :check_env "backend\.env" "FRONTEND_URL"
call :check_env "backend\.env" "GOOGLE_CLIENT_ID"
call :check_env "backend\.env" "GOOGLE_CLIENT_SECRET"
call :check_env "backend\.env" "GITHUB_CLIENT_ID"
call :check_env "backend\.env" "GITHUB_CLIENT_SECRET"

echo.
set /p START_SERVERS=Start backend and user-dashboard dev servers now? (y/N): 
if /I "%START_SERVERS%"=="Y" (
  start "zetechverse-backend" cmd /k "cd /d %~dp0backend && npm run dev"
  start "zetechverse-user-dashboard" cmd /k "cd /d %~dp0user-dashboard && npm run dev"
  echo.
  echo Dev servers started in new Command Prompt windows.
) else (
  echo.
  echo Cleanup completed.
  echo Start manually with:
  echo   cd /d "%~dp0backend" ^&^& npm run dev
  echo   cd /d "%~dp0user-dashboard" ^&^& npm run dev
)

echo.
echo Quick OAuth endpoint checks (after backend is running):
echo   curl.exe -s -o NUL -w "%%{http_code}" http://localhost:3000/api/auth/oauth/google
echo   curl.exe -s -o NUL -w "%%{http_code}" http://localhost:3000/api/auth/oauth/github
echo.
exit /b 0

:remove_dir
if exist "%~1" (
  echo Removing "%~1"
  rmdir /s /q "%~1"
) else (
  echo Skipping "%~1" (not found)
)
exit /b 0

:check_env
set "FOUND="
for /f "usebackq delims=" %%L in (`findstr /B /C:"%~2=" "%~1" 2^>nul`) do set "FOUND=%%L"
if not defined FOUND (
  echo [MISSING] %~2
  exit /b 0
)

set "VALUE=!FOUND:%~2=!"
if "!VALUE!"=="" (
  echo [EMPTY]   %~2
) else (
  echo [SET]     %~2
)
exit /b 0
