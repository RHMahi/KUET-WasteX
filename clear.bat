@echo off
setlocal
set "PROJECT=%~dp0"
pushd "%PROJECT%"
cls
echo ================================================
echo   Resetting KUET WasteX data ...
echo ================================================
if exist "wastex_data.txt" (
    del /q "wastex_data.txt"
    echo Saved data deleted. Next launch starts fresh.
) else (
    echo No saved data file found. Nothing to delete.
)
echo.
popd
endlocal
pause