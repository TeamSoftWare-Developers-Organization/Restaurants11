@echo off
setlocal EnableExtensions EnableDelayedExpansion
title RestoERP - Complete System Installer & Database Provisioner
color 0A

echo ===============================================================================
echo               RestoERP - Smart Restaurant Management & POS Suite
echo            المثبت الذكي الشامل: تهيئة كافة المتطلبات وقواعد البيانات
echo ===============================================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: -----------------------------------------------------------------------------
:: 1. التحقق من وجود بايثون على جهاز العميل
:: -----------------------------------------------------------------------------
echo [*] [1/5] التحقق من بيئة Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] خطأ فادح: لم يتم العثور على Python على هذا الجهاز!
    echo يرجى تثبيت Python 3.12 أو 3.13 وتفعيل خيار (Add python.exe to PATH).
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do echo [V] تم العثور على: %%v
echo.

:: -----------------------------------------------------------------------------
:: 2. تهيئة وتثبيت محرك Bun
:: -----------------------------------------------------------------------------
echo [*] [2/5] التحقق من محرك Bun والبيئة التنفيذية...
if not exist "%SCRIPT_DIR%bin" mkdir "%SCRIPT_DIR%bin"

if not exist "%SCRIPT_DIR%bin\bun.exe" (
    if exist "%USERPROFILE%\.bun\bin\bun.exe" (
        echo [*] جاري استيراد bun.exe من مجلد المستخدم المحلي...
        copy /Y "%USERPROFILE%\.bun\bin\bun.exe" "%SCRIPT_DIR%bin\bun.exe" >nul
    )
)

set "PATH=%SCRIPT_DIR%bin;%USERPROFILE%\.bun\bin;%PATH%"

where bun.exe >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] جاري تنصيب محرك Bun تلقائياً للواجهة السريعة...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
)

where bun.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [V] محرك Bun جاهز بنجاح:
    bun.exe --version
) else (
    echo [!] تعذر تنصيب Bun، سيتم الاعتماد تلقائياً على NPM و Node.js.
)
echo.

:: -----------------------------------------------------------------------------
:: 3. تثبيت حزم الواجهة الأمامية (Frontend)
:: -----------------------------------------------------------------------------
echo [*] [3/5] تثبيت مكتبات الواجهة الأمامية (restaurant-frontend)...
cd /d "%SCRIPT_DIR%restaurant-frontend"

where bun.exe >nul 2>nul
if %errorlevel% equ 0 (
    call bun install
) else (
    call npm install
)
echo [V] تم تجهيز مكتبات الواجهة بنجاح.
echo.

:: -----------------------------------------------------------------------------
:: 4. تجهيز بيئة الباك إند وتثبيت متطلبات بايثون
:: -----------------------------------------------------------------------------
echo [*] [4/5] تثبيت حزم ومكتبات الباك إند (Django REST & Backend)...
cd /d "%SCRIPT_DIR%restaurantsApi"

:: تثبيت الاعتماديات مباشرة لبيئة البايثون النشطة
python -m pip install --upgrade pip --quiet
python -m pip install -r requirements.txt --quiet
echo [V] تم تثبيت كافة مكتبات الباك إند بنجاح.
echo.

:: -----------------------------------------------------------------------------
:: 5. تهيئة وإنشاء قواعد البيانات والجداول وحسابات النظام تلقائياً
:: -----------------------------------------------------------------------------
echo [*] [5/5] تهيئة قاعدة البيانات وإنشاء الجداول وحسابات الإدارة تلقائياً...

:: تنفيذ السكربت البايثون الذكي للتحقق من PostgreSQL وإنشاء قاعدة البيانات والجداول
python -c "
import os
import sys
import socket
from pathlib import Path

# فحص خادم PostgreSQL
host = '127.0.0.1'
port = 5432
db_name = 'restaurant_db'
db_user = 'postgres'
db_pass = '0918147613a'

pg_live = False
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2.0)
    res = sock.connect_ex((host, port))
    sock.close()
    pg_live = (res == 0)
except Exception:
    pg_live = False

if pg_live:
    print(' [*] تم اكتشاف خادم PostgreSQL قيد التشغيل.')
    try:
        import psycopg2
        from psycopg2 import sql
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

        conn = psycopg2.connect(dbname='postgres', user=db_user, password=db_pass, host=host, port=port)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute('SELECT 1 FROM pg_database WHERE datname = %s', (db_name,))
        if not cur.fetchone():
            print(f' [*] جاري إنشاء قاعدة البيانات {db_name} تلقائياً...')
            cur.execute(sql.SQL('CREATE DATABASE {} WITH OWNER {} ENCODING \'UTF8\';').format(
                sql.Identifier(db_name),
                sql.Identifier(db_user)
            ))
            print(f' [V] تم إنشاء قاعدة البيانات {db_name} بنجاح!')
        else:
            print(f' [V] قاعدة البيانات {db_name} موجودة ومتاحة.')
        cur.close()
        conn.close()
    except Exception as e:
        print(f' [!] تنبيه أثناء تهيئة PostgreSQL: {e}')
else:
    print(' [*] خادم PostgreSQL غير متاح حالياً، سيتم استخدام SQLite الآمنة تلقائياً.')
"

echo [*] تطبيق هجرات الجداول في قاعدة البيانات (Migrations)...
python manage.py migrate --noinput

echo [*] تهيئة وضبط الحسابات التشغيلية والمستخدمين الافتراضيين...
python manage.py seed_demo_users
echo.

:: -----------------------------------------------------------------------------
:: اكتمال التثبيت الشامل
:: -----------------------------------------------------------------------------
cd /d "%SCRIPT_DIR%"
echo ===============================================================================
echo            [V] تم تثبيت وتهيئة النظام وكافة قواعد البيانات بنجاح تام!
echo ===============================================================================
echo يمكنك الآن تشغيل النظام فوراً بنقرة واحدة عبر:
echo   - تشغيل الملف: start_system.bat
echo.
pause
