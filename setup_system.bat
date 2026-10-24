@echo off
setlocal enabledelayedexpansion
title Restaurant ERP - First Time Installation & Setup
color 0B
cls

echo ===============================================================================
echo        Restaurant ERP & POS - One-Click Auto Installer & Environment Setup
echo                      تثبيت وتهيئة النظام الشامل بنقرة واحدة
echo ===============================================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: 1. التحقق من مسار بايثون
echo [*] فحص توفر بايثون في النظام...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo [خطأ] بايثون غير مثبت أو غير مضاف لمتغيرات النظام PATH. يرجى تثبيته أولاً.
    pause
    exit /b 1
)
python --version
echo.

:: 2. إعداد وتكوين قاعدة بيانات PostgreSQL المدمجة (Embedded / Portable) إن وجدت
echo [1/5] Configuring Embedded PostgreSQL Database...
set "PG_BIN=%SCRIPT_DIR%pgsql\bin"
set "PG_DATA=%SCRIPT_DIR%pgsql\data"

if exist "%PG_BIN%\initdb.exe" (
    if not exist "%PG_DATA%" (
        echo [*] Initializing embedded database cluster...
        "%PG_BIN%\initdb.exe" -D "%PG_DATA%" -U postgres -A trust -E UTF8 >nul 2>&1
    )
    echo [*] Starting local PostgreSQL server...
    "%PG_BIN%\pg_ctl.exe" -D "%PG_DATA%" -w start >nul 2>&1
    echo [*] Creating 'restaurants_db' database if not exists...
    "%PG_BIN%\createdb.exe" -U postgres -h 127.0.0.1 restaurants_db >nul 2>&1
    echo [V] PostgreSQL cluster is ready.
) else (
    echo [*] PostgreSQL portable binary folder not present, checking local database connection...
)

:: 3. تثبيت المتطلبات البرمجية ومكتبة pywebview
echo.
echo [2/5] Installing Python Dependencies and Native Desktop Viewer (pywebview)...
pip install -r requirements.txt --quiet
pip install pywebview psycopg2-binary gunicorn pyzk --quiet
echo [V] Python dependencies installed successfully.

:: 4. تطبيق ترحيلات الجداول والمستخدمين التجريبيين
echo.
echo [3/5] Applying Database Migrations & Seeding Accounts...
cd /d "%SCRIPT_DIR%restaurantsApi"
python manage.py makemigrations --noinput
python manage.py migrate --noinput

echo [*] Seeding Demo Roles & Accounts...
python manage.py seed_demo_users
cd /d "%SCRIPT_DIR%"

:: 5. تجهيز وبناء الواجهة الأمامية للتشغيل السريع
echo.
echo [4/5] Building Frontend Production Bundle for Fast Launch...
cd /d "%SCRIPT_DIR%restaurant-frontend"

:: فحص أداة البناء المتوفرة (Bun أولاً ثم NPM)
where bun.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] Building via Bun engine...
    call bun run build
) else (
    echo [*] Building via NPM engine...
    call npm run build
)
cd /d "%SCRIPT_DIR%"

:: 6. إنشاء اختصار مباشر على سطح المكتب للعميل
echo.
echo [5/5] Creating Desktop Application Shortcut on User Desktop...
set "VBS_SCRIPT=%TEMP%\create_restoerp_shortcut.vbs"

:: تحديد مسار الأيقونة المفضلة
set "ICON_PATH=%SCRIPT_DIR%electron\icon.ico"
if not exist "%ICON_PATH%" (
    set "ICON_PATH=%SCRIPT_DIR%restaurant-frontend\public\favicon.ico"
)

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Smart Restaurant ERP.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "pythonw.exe" >> "%VBS_SCRIPT%"
echo oLink.Arguments = """%SCRIPT_DIR%run_app.pyw""" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> "%VBS_SCRIPT%"
if exist "%ICON_PATH%" (
    echo oLink.IconLocation = "%ICON_PATH%" >> "%VBS_SCRIPT%"
)
echo oLink.Description = "نظام إدارة المطاعم والمقاهي الذكي - RestoERP" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%" >nul 2>&1
if exist "%VBS_SCRIPT%" del "%VBS_SCRIPT%"

echo.
echo ===============================================================================
echo   SUCCESS! Installation Complete.
echo   تم اكتمال التثبيت والتهيئة بنجاح تام!
echo   تم إنشاء اختصار البرنامج على سطح المكتب: 'Smart Restaurant ERP'
echo ===============================================================================
echo يمكنك الآن فتح البرنامج مباشرة من سطح المكتب كنافذة مكتبية أصلية بدون متصفح.
echo.
pause
