@echo off
g++ -std=c++17 main.cpp Graph.cpp LinkedList.cpp -o KUETWasteX.exe
if %errorlevel%==0 (
    echo Build successful: KUETWasteX.exe
) else (
    echo Build failed.
)