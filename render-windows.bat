@echo off
rem TRENDSTUDIO: render a video. Double-click, or run: render-windows.bat star-sizes-long
cd /d "%~dp0"
set VIDEO=%1
if "%VIDEO%"=="" set VIDEO=star-sizes
echo Rendering %VIDEO% (1080x1920, 60 fps). The first run downloads a browser, about 100 MB.
call npm run render -- %VIDEO% vertical
echo.
echo Finished. The video and its check report are in the "out" folder.
pause
