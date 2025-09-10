@echo off
echo Starting Next.js development server...

REM Create a dummy npm command that does nothing
echo @echo off > temp_npm.bat
echo exit /b 0 >> temp_npm.bat

REM Temporarily add current directory to PATH so our dummy npm is found first
set PATH=%CD%;%PATH%
set npm=temp_npm.bat

REM Start Next.js
node .\node_modules\next\dist\bin\next dev --port 3003

REM Cleanup
del temp_npm.bat
