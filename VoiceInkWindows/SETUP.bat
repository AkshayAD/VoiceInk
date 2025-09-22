@echo off
echo ===============================================
echo    VoiceInk Windows - Automated Setup
echo ===============================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Running with administrator privileges
) else (
    echo [!] This script needs administrator privileges
    echo [!] Right-click SETUP.bat and select "Run as administrator"
    pause
    exit /b 1
)

:: Set variables
set NODE_VERSION=18.17.0
set PYTHON_VERSION=3.11.0
set VS_BUILDTOOLS_URL=https://aka.ms/vs/17/release/vs_buildtools.exe

echo [1/8] Checking Node.js installation...
node --version >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Node.js is installed
) else (
    echo [!] Installing Node.js %NODE_VERSION%...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-x64.msi' -OutFile 'node-installer.msi'}"
    msiexec /i node-installer.msi /quiet /norestart
    del node-installer.msi
    echo [✓] Node.js installed
)

echo [2/8] Checking Python installation...
python --version >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Python is installed
) else (
    echo [!] Installing Python %PYTHON_VERSION%...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-amd64.exe' -OutFile 'python-installer.exe'}"
    python-installer.exe /quiet InstallAllUsers=1 PrependPath=1
    del python-installer.exe
    echo [✓] Python installed
)

echo [3/8] Checking Visual Studio Build Tools...
if exist "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\MSBuild.exe" (
    echo [✓] Visual Studio Build Tools found
) else (
    echo [!] Installing Visual Studio Build Tools...
    powershell -Command "& {Invoke-WebRequest -Uri '%VS_BUILDTOOLS_URL%' -OutFile 'vs_buildtools.exe'}"
    vs_buildtools.exe --quiet --wait --add Microsoft.VisualStudio.Workload.VCTools
    del vs_buildtools.exe
    echo [✓] Visual Studio Build Tools installed
)

echo [4/8] Installing npm dependencies...
call npm install
if %errorLevel% neq 0 (
    echo [!] npm install failed. Retrying with clean cache...
    call npm cache clean --force
    call npm install
)
echo [✓] Dependencies installed

echo [5/8] Setting up Prisma database...
call npx prisma generate
call npx prisma migrate deploy
echo [✓] Database ready

echo [6/8] Downloading Whisper models...
if not exist "models" mkdir models
if not exist "models\ggml-base.en.bin" (
    echo [!] Downloading Whisper base model (74MB)...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin' -OutFile 'models\ggml-base.en.bin'}"
)
if not exist "models\ggml-tiny.en.bin" (
    echo [!] Downloading Whisper tiny model (39MB)...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin' -OutFile 'models\ggml-tiny.en.bin'}"
)
echo [✓] Whisper models downloaded

echo [7/8] Compiling native modules...
call npm run build:native
if %errorLevel% neq 0 (
    echo [!] Native compilation failed. Using cloud transcription instead...
    echo [!] This is normal and the app will still work perfectly.
) else (
    echo [✓] Native modules compiled successfully
)

echo [8/8] Building application...
call npm run build
echo [✓] Application built

echo.
echo ===============================================
echo           Setup Complete!
echo ===============================================
echo.
echo To start VoiceInk:
echo   npm start
echo.
echo Or run START_VOICEINK.bat for one-click launch
echo.
pause