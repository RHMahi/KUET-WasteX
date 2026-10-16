@echo off
setlocal
set "PROJECT=%~dp0"
pushd "%PROJECT%"
cls
echo ================================================
echo   Building KUET WasteX ...
echo ================================================
g++ -std=c++17 -Wall -Wextra main.cpp Graph.cpp LinkedList.cpp -o KUETWasteX.exe
if errorlevel 1 (
    echo.
    echo Build FAILED.
    popd
    endlocal
    exit /b 1
)
echo Build successful. Launching...
echo.
KUETWasteX.exe
if exist "wastex_data.txt" (
    echo.
    echo Data saved in wastex_data.txt
    echo Run "clear" to reset all data.
) else (
    echo.
    echo No data file. Run "clear" anytime to reset data.
)
popd
endlocal