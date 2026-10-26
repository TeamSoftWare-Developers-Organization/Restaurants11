@echo off
chcp 65001 >nul
title فحص وتثبيت نظام المطاعم والمقاهي
color 0F
cls

echo ================================================================
echo        بدء الفحص والتشخيص والتثبيت الذاتي للنظام
echo ================================================================
echo.

:: 1. فحص وجود بايثون
echo [1/6] فحص Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [خطأ] بايثون غير مثبت أو غير مضاف لمتغيرات البيئة PATH!
    echo يرجى تثبيت Python وتفعيل خيار "Add python.exe to PATH".
    goto ERROR_EXIT
)
python --version
echo [✓] تم التحقق من Python بنجاح.
echo.

:: 2. فحص أداة تشغيل الواجهة (Bun أو Node)
echo [2/6] فحص بيئة تشغيل الواجهة (Bun / Node)...
where bun >nul 2>&1
if %errorlevel% equ 0 (
    set RUNNER=bun
    echo [✓] تم العثور على Bun.
) else (
    where npm >nul 2>&1
    if %errorlevel% equ 0 (
        set RUNNER=npm
        echo [✓] تم العثور على Node.js / NPM.
    ) else (
        color 0C
        echo [خطأ] لم يتم العثور على Bun أو Node.js!
        echo يجب توفر أحدهما لتشغيل وبناء الواجهة الأمامية.
        goto ERROR_EXIT
    )
)
echo.

:: 3. تثبيت مكتبات البايثون و pywebview
echo [3/6] تثبيت وتحديث مكتبات البايثون (Backend & Webview)...
pip install --upgrade pip
pip install -r requirements.txt
pip install pywebview psycopg2-binary gunicorn
if %errorlevel% neq 0 (
    color 0C
    echo [خطأ] فشل تثبيت بعض حزم البايثون! راجع رسائل الخطأ أعلاه.
    goto ERROR_EXIT
)
echo [✓] تم تثبيت مكتبات البايثون بنجاح.
echo.

:: 4. فحص وضبط قاعدة بيانات PostgreSQL
echo [4/6] فحص قاعدة بيانات PostgreSQL...
:: التحقق هل هناك سيرفر Postgres يعمل بالفعل على المنفذ 5432
netstat -ano | findstr 127.0.0.1:5432 >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] تم اكتشاف خدمة PostgreSQL تعمل بالفعل محلياً على الجهاز.
) else (
    echo [*] جاري البحث عن ملفات PostgreSQL المحمولة (pgsql)...
    if exist "%~dp0pgsql\bin\pg_ctl.exe" (
        set PG_BIN=%~dp0pgsql\bin
        set PG_DATA=%~dp0pgsql\data
        if not exist "%~dp0pgsql\data" (
            echo [*] تهيئة عنقود البيانات لأول مرة...
            "%PG_BIN%\initdb.exe" -D "%PG_DATA%" -U postgres -A trust -E UTF8
        )
        echo [*] تشغيل خادم PostgreSQL المحمول...
        "%PG_BIN%\pg_ctl.exe" -D "%PG_DATA%" -w start
    ) else (
        echo [تحذير] خادم PostgreSQL لا يعمل ولم يتم العثور على مجلد pgsql المحمول!
        echo سيتم المتابعة بالاعتماد على الترحيل المباشر أو قاعدة البيانات الافتراضية.
    )
)
echo.

:: 5. تطبيق الترحيل وزرع المستخدمين التجريبيين
echo [5/6] تطبيق ترحيلات الجداول والمستخدمين (Django Migrations)...
cd restaurantsApi
python manage.py makemigrations
python manage.py migrate
if %errorlevel% neq 0 (
    color 0C
    echo [خطأ] فشل تطبيق ترحيل قاعدة البيانات (Migrations)!
    echo تأكد من تشغيل خادم PostgreSQL وصحة بيانات الاتصال في .env.
    cd ..
    goto ERROR_EXIT
)
echo [*] زرع الحسابات التجريبية (Demo Accounts)...
python manage.py seed_demo_users
cd ..
echo [✓] تم ترحيل وتجهيز قاعدة البيانات بنجاح.
echo.

:: 6. تجهيز وبناء الواجهة الأمامية (Build)
echo [6/6] تجهيز وبناء الواجهة الأمامية...
cd restaurant-frontend
if "%RUNNER%"=="bun" (
    call bun install
    call bun run build
) else (
    call npm install
    call npm run build
)
if %errorlevel% neq 0 (
    color 0C
    echo [خطأ] فشل بناء الواجهة الأمامية! راجع أخطاء البناء أعلاه.
    cd ..
    goto ERROR_EXIT
)
cd ..
echo [✓] تم بناء الواجهة الأمامية بنجاح.
echo.

:: 7. إنشاء اختصار التشغيل المكتبي على سطح المكتب
echo [*] إنشاء اختصار التشغيل على سطح المكتب...
set SCRIPT="%TEMP%\create_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Smart Restaurant ERP.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "pythonw.exe" >> %SCRIPT%
echo oLink.Arguments = """%~dp0run_app.pyw""" >> %SCRIPT%
echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT%
if exist "%~dp0restaurant-frontend\public\favicon.ico" (
    echo oLink.IconLocation = "%~dp0restaurant-frontend\public\favicon.ico" >> %SCRIPT%
)
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT% >nul 2>&1
del %SCRIPT% >nul 2>&1

color 0A
echo ================================================================
echo   [تم بنجاح!] اكتمل التثبيت والتهيئة بنسبة 100%%
echo   تم إنشاء اختصار باسم "Smart Restaurant ERP" على سطح المكتب.
echo ================================================================
pause
exit /b

:ERROR_EXIT
echo.
echo ================================================================
echo   توقف التثبيت بسبب وجود خطأ في الخطوة الموضحة أعلاه.
echo ================================================================
pause
exit /b
