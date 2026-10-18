@echo off
echo ========================================================
echo   Live AI Translator ^& Dubbing - Pipeline Demo
echo ========================================================
cd /d "%~dp0..\services\orchestrator"
if not exist node_modules (
    echo [INFO] Installing Node.js dependencies...
    call npm install
)
echo [INFO] Compiling TypeScript source files...
call npm run build
echo [INFO] Running End-to-End Simulation Demo...
call npm run demo
pause
