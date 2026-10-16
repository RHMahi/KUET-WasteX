@echo off
setlocal EnableDelayedExpansion
set "PROJECT=%~dp0"
if "%PROJECT:~-1%"=="\" set "PROJECT=%PROJECT:~0,-1%"

echo ================================================
echo   KUET WasteX - One-time PATH setup
echo ================================================
echo Project folder: %PROJECT%
echo.

set "USERPATH="
for /f "tokens=2,*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USERPATH=%%b"

echo %USERPATH% | find /I "%PROJECT%" >nul
if not errorlevel 1 (
    echo This folder is already in your PATH.
    echo You can already type: WasteX
    echo.
    goto done
)

if defined USERPATH (
    setx PATH "!USERPATH!;%PROJECT%" >nul
) else (
    setx PATH "%PROJECT%" >nul
)

echo Added this project folder to your user PATH.
echo.
echo Close this window and open a NEW Command Prompt.
echo Then from ANY folder just type:  WasteX

:done
echo.
endlocal