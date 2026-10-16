@echo off
title KUET WasteX - Web Dashboard
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js was not found on this system.
  echo   Install it from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo   Starting KUET WasteX Web Dashboard...
echo   A browser window will open at http://localhost:3000
echo   Keep this window open while using the app. Press Ctrl+C to stop.
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul & explorer http://localhost:3000"

node "webui\server.js"

echo.
echo   Server stopped.
pause