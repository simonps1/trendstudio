@echo off
rem TRENDSTUDIO: first-time setup on Windows. Double-click this file.
rem Needs Node.js installed first: https://nodejs.org (LTS version).
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
echo Installing packages (about 1.3 GB, takes a few minutes)...
call npm install
if errorlevel 1 ( echo npm install failed. & pause & exit /b 1 )
echo.
echo Setup finished. To render a video, double-click render-windows.bat
pause
