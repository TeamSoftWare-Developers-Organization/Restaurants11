@echo off
chcp 65001 >nul
title إيقاف خوادم نظام إدارة المطاعم
echo =====================================================================
echo    🛑 جاري إيقاف خوادم نظام إدارة المطاعم (Restaurants AI ERP & POS)
echo =====================================================================
echo.

echo إيقاف عمليات Python الخادمة...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq RestoERP*" 2>nul
taskkill /F /IM python.exe /FI "MEMUSAGE gt 10000" 2>nul

echo إيقاف عمليات Bun / Node الخادمة...
taskkill /F /IM bun.exe 2>nul
taskkill /F /IM node.exe 2>nul

echo.
echo ✔ تم إيقاف جميع خوادم النظام بنجاح.
timeout /t 2 /nobreak >nul
