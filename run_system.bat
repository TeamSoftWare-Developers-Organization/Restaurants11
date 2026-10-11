@echo off
chcp 65001 >nul
title تشغيل نظام إدارة المطاعم الذكي (Restaurants AI ERP & POS)
echo =====================================================================
echo    🚀 جاري تشغيل خوادم نظام إدارة المطاعم المتكامل (RestoERP)
echo =====================================================================
echo.

set ROOT_DIR=%~dp0

:: 1. تشغيل الواجهة الخلفية (Django Backend)
echo [1/3] بدء تشغيل الخادم الخلفي (Django Ninja API) على المنفذ 8000...
start "RestoERP - Backend API Server" cmd /k "cd /d %ROOT_DIR%restaurantsApi && .\venv\Scripts\activate && python manage.py runserver 127.0.0.1:8000"

:: 2. تشغيل الواجهة الأمامية (Next.js Frontend)
echo [2/3] بدء تشغيل الواجهة الأمامية وتطبيق سطح المكتب (Next.js & Bun) على المنفذ 3005...
start "RestoERP - Frontend Server" cmd /k "cd /d %ROOT_DIR%restaurant-frontend && bun run dev"

:: 3. الانتظار قليلاً ثم فتح النظام في المتصفح
echo [3/3] جاري فتح واجهة النظام في المتصفح...
timeout /t 4 /nobreak >nul
start http://localhost:3005

echo.
echo =====================================================================
echo  ✔ تم تشغيل النظام بنجاح!
echo  - الواجهة الأمامية: http://localhost:3005
echo  - توثيق API و Swagger: http://127.0.0.1:8000/api/docs
echo  - لإيقاف الخوادم، شغّل ملف stop_system.bat أو أغلق النوافذ المفتوحة.
echo =====================================================================
pause
