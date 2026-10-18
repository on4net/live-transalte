@echo off
echo ========================================================
echo   Live AI Translator ^& Dubbing - Test Runner
echo ========================================================
cd /d "%~dp0..\services\orchestrator"
if not exist node_modules (
    echo [INFO] Installing Node.js dependencies...
    call npm install
)
echo [INFO] Compiling and Running Automated Tests...
call npm test
pause
