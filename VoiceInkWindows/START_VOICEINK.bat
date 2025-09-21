@echo off
echo ===============================================
echo         Starting VoiceInk Windows
echo ===============================================
echo.

:: Check if built
if not exist "out\main\index.js" (
    echo [!] Application not built yet. Running build...
    call npm run build
    if %errorLevel% neq 0 (
        echo [!] Build failed. Running setup...
        call SETUP.bat
        exit /b 1
    )
)

:: Start the application
echo [✓] Launching VoiceInk...
call npm start

:: If start fails, try preview
if %errorLevel% neq 0 (
    echo [!] 'npm start' failed, trying preview mode...
    call npm run preview
)

pause