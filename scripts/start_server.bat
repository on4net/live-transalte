@echo off
echo ========================================================
echo   Live AI Translator ^& Dubbing - Orchestrator Server
echo ========================================================
cd /d "%~dp0..\services\orchestrator"
if not exist node_modules (
    echo [INFO] Installing Node.js dependencies...
    call npm install
)
echo [INFO] Building TypeScript source files...
call npm run build
echo [INFO] Launching Orchestrator Server on port 8080...
call npm start
pause
