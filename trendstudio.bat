@echo off
rem ============================================================
rem  TRENDSTUDIO - one file that does everything on Windows.
rem  Double-click it. It will:
rem    1. install Node.js and FFmpeg if they are missing
rem    2. download the latest TRENDSTUDIO from GitHub
rem    3. install the project's packages
rem    4. render a video (1080x1920, 60 fps)
rem    5. open the folder with the finished video
rem  Run it again any time to update and render again.
rem  To render a different video:  trendstudio.bat star-sizes-long
rem ============================================================
setlocal
title TRENDSTUDIO
set "TARGET=%USERPROFILE%\Documents\trendstudio"
set "ZIP=%TEMP%\trendstudio-main.zip"
set "TMPX=%TEMP%\trendstudio-extract"
set "VIDEO=%~1"
if "%VIDEO%"=="" set "VIDEO=star-sizes"
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%ProgramFiles%\nodejs;%PATH%"

echo.
echo [1/5] Checking Node.js and FFmpeg...
where node >nul 2>nul
if not errorlevel 1 goto have_node
where winget >nul 2>nul
if errorlevel 1 goto no_winget
echo       Installing Node.js (Windows may ask for permission)...
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
where node >nul 2>nul
if errorlevel 1 goto node_failed
:have_node
where ffmpeg >nul 2>nul
if not errorlevel 1 goto have_ffmpeg
where winget >nul 2>nul
if errorlevel 1 goto have_ffmpeg
echo       Installing FFmpeg...
winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements
:have_ffmpeg

echo.
echo [2/5] Downloading the latest TRENDSTUDIO...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/simonps1/trendstudio/archive/refs/heads/main.zip' -OutFile $env:ZIP; if (Test-Path $env:TMPX) { Remove-Item -Recurse -Force $env:TMPX }; Expand-Archive -Path $env:ZIP -DestinationPath $env:TMPX -Force"
if errorlevel 1 goto download_failed
robocopy "%TMPX%\trendstudio-main" "%TARGET%" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto copy_failed

echo.
echo [3/5] Installing packages (first time: about 1.3 GB, a few minutes)...
cd /d "%TARGET%"
call npm install
if errorlevel 1 goto npm_failed

echo.
echo [4/5] Rendering "%VIDEO%" (the first run also downloads a browser, about 100 MB)...
call npm run render -- %VIDEO% vertical
if errorlevel 1 goto render_failed

echo.
echo [5/5] Done. Opening the folder with your video...
start "" explorer "%TARGET%\out"
pause
exit /b 0

:no_winget
echo Node.js is not installed and this PC has no "winget" to install it automatically.
echo Install the LTS version from https://nodejs.org and run this file again.
pause
exit /b 1
:node_failed
echo Node.js was installed but is not visible yet. Close this window and run the file again.
pause
exit /b 1
:download_failed
echo Could not download TRENDSTUDIO from GitHub. Check the internet connection and try again.
pause
exit /b 1
:copy_failed
echo Could not copy the files into "%TARGET%".
pause
exit /b 1
:npm_failed
echo Installing packages failed. Copy the messages above and send them to Claude.
pause
exit /b 1
:render_failed
echo The render or its checks reported a problem. Copy the messages above and send them to Claude.
echo Any finished files are in "%TARGET%\out".
pause
exit /b 1
