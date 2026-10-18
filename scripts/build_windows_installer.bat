@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   Live AI Translator ^& Dubbing - Windows Installer Builder
echo ========================================================

REM Step 1: Check Flutter SDK
echo [1/3] Checking Flutter SDK...
where flutter >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Flutter CLI not detected on system PATH.
    echo Please make sure Flutter is installed to compile the Release binary.
    echo Target release folder: apps\client_flutter\build\windows\x64\runner\Release
) else (
    echo [INFO] Compiling Flutter Windows Desktop (Release)...
    cd /d "%~dp0..\apps\client_flutter"
    call flutter build windows --release
    cd /d "%~dp0.."
)

REM Step 2: Locate Inno Setup Compiler (ISCC.exe)
echo [2/3] Searching for Inno Setup Compiler (ISCC.exe)...
set ISCC_PATH=""

if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set ISCC_PATH="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    set ISCC_PATH="C:\Program Files\Inno Setup 6\ISCC.exe"
) else (
    where iscc >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set ISCC_PATH=iscc
    )
)

if %ISCC_PATH%=="" (
    echo [WARNING] Inno Setup 6 compiler (ISCC.exe) was not found!
    echo To build the final Setup.exe, install Inno Setup using:
    echo     winget install JRSoftware.InnoSetup
    echo Then run this script again or open 'packaging\windows\installer.iss' with Inno Setup Compiler.
    goto done
)

REM Step 3: Compile Inno Setup Script
echo [3/3] Compiling Inno Setup script with !ISCC_PATH!...
if not exist "%~dp0..\packaging\dist" mkdir "%~dp0..\packaging\dist"
!ISCC_PATH! "%~dp0..\packaging\windows\installer.iss"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   SUCCESS: Windows installer generated at:
    echo   packaging\dist\LiveAI_Translator_v0.1.0_Setup.exe
    echo ========================================================
) else (
    echo [ERROR] Inno Setup compilation failed with exit code %ERRORLEVEL%.
)

:done
echo.
pause
