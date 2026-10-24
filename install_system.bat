@echo off
setlocal EnableExtensions EnableDelayedExpansion
title RestoERP - Installation \u0026 Setup Wizard
color 0A

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: التحقق من وجود Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ===============================================================================
    echo [X] خطأ: لم يتم العثور على Python على هذا الحاسوب!
    echo يرجى تثبيت Python 3.12 أو 3.13 وتفعيل خيار (Add python.exe to PATH).
    echo ===============================================================================
    pause
    exit /b 1
)

:: تشغيل معالج التثبيت التفاعلي الرسومي لاختيار المكونات
python setup_wizard.py

if %errorlevel% equ 0 (
    exit /b 0
)

:: في حال تشغيل بيئة طرفية خالية من الواجهات الرسومية، يتم التثبيت التلقائي كبديل
echo.
echo [*] جاري تشغيل وضع التثبيت السريع التلقائي...
echo.

:: 1. Bun
if not exist "%SCRIPT_DIR%bin" mkdir "%SCRIPT_DIR%bin"
if not exist "%SCRIPT_DIR%bin\bun.exe" (
    if exist "%USERPROFILE%\.bun\bin\bun.exe" (
        copy /Y "%USERPROFILE%\.bun\bin\bun.exe" "%SCRIPT_DIR%bin\bun.exe" >nul
    )
)
set "PATH=%SCRIPT_DIR%bin;%USERPROFILE%\.bun\bin;%PATH%"

:: 2. Frontend
cd /d "%SCRIPT_DIR%restaurant-frontend"
where bun.exe >nul 2>nul
if %errorlevel% equ 0 (
    call bun install
) else (
    call npm install
)

:: 3. Backend
cd /d "%SCRIPT_DIR%restaurantsApi"
python -m pip install -r requirements.txt --quiet
python manage.py migrate --noinput
python manage.py seed_demo_users

cd /d "%SCRIPT_DIR%"
echo ===============================================================================
echo            [V] تم تثبيت وتهيئة النظام وكافة قواعد البيانات بنجاح تام!
echo ===============================================================================
pause
