@echo off
echo ==========================================
echo      WR Smile POS - Android Build
echo ==========================================

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

echo [2/4] Building web application...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo [3/4] Syncing Capacitor...
call npx cap sync
if %errorlevel% neq 0 exit /b %errorlevel%

echo [4/4] Building Android APK (Debug)...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 exit /b %errorlevel%
cd ..

echo.
echo ==========================================
echo        Build Successful!
echo ==========================================
echo APK location: android\app\build\outputs\apk\debug\app-debug.apk
pause
