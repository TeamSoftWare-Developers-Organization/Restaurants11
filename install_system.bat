@echo off
setlocal EnableExtensions
title RestoERP - Installation & Environment Setup
color 0A

echo ===============================================================================
echo               RestoERP - Smart Restaurant Management & POS Suite
echo                    تثبيت وتهيئة النظام وحزم التشغيل
echo ===============================================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: 1. تهيئة وتثبيت محرك Bun في مسار النظام المحلي
echo [*] فحص وتهيئة محرك Bun...
if not exist "%SCRIPT_DIR%bin" mkdir "%SCRIPT_DIR%bin"

:: إذا كان bun.exe متوفراً في مجلد المستخدم ولم يُنسخ بعد
if not exist "%SCRIPT_DIR%bin\bun.exe" (
    if exist "%USERPROFILE%\.bun\bin\bun.exe" (
        echo [*] جاري دمج bun.exe من مجلد المستخدم المحلي...
        copy /Y "%USERPROFILE%\.bun\bin\bun.exe" "%SCRIPT_DIR%bin\bun.exe" >nul
    )
)

:: إضافة bin إلى PATH الحالي
set "PATH=%SCRIPT_DIR%bin;%USERPROFILE%\.bun\bin;%PATH%"

:: التحقق من جاهزية Bun
where bun.exe >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] تحذير: تعذر العثور على bun.exe، جاري محاولة تنصيبه عبر PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
)

echo [V] محرك Bun جاهز بنجاح:
bun.exe --version
echo.

:: 2. تثبيت اعتماديات الواجهة الأمامية (Frontend)
echo [*] تثبيت اعتماديات الواجهة الأمامية (restaurant-frontend)...
cd /d "%SCRIPT_DIR%restaurant-frontend"
call bun install
echo [V] تم تثبيت مكتبات الواجهة بنجاح.
echo.

:: 3. تثبيت بيئة الباك إند Django
echo [*] فحص بيئة عمل الخادم (Backend - Django)...
cd /d "%SCRIPT_DIR%restaurantsApi"
if not exist "venv\Scripts\python.exe" (
    echo [*] جاري إنشاء البيئة الافتراضية venv...
    python -m venv venv
)
echo [*] تحديث وتثبيت مكتبات البايثون...
call .\venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
python manage.py migrate --noinput
echo [V] تم إعداد وتحديث قاعدة البيانات بنجاح.
echo.

cd /d "%SCRIPT_DIR%"
echo ===============================================================================
echo                    [V] اكتمل التثبيت والتهيئة بنجاح!
echo ===============================================================================
echo يمكنك الآن تشغيل النظام مباشرة عبر run_system.bat
echo.
pause
