@echo off
setlocal EnableExtensions
title RestoERP Stopper

echo =====================================================================
echo    RestoERP - Stopping System Servers...
echo =====================================================================
echo.

echo Stopping Python servers...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq RestoERP*" 2>nul

echo Stopping Bun and Node processes...
taskkill /F /IM bun.exe 2>nul
taskkill /F /IM node.exe 2>nul

echo.
echo All system servers have been stopped.
timeout /t 3 /nobreak >nul
