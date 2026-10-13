@echo off
setlocal EnableExtensions
title RestoERP Stopper

echo =====================================================================
echo    RestoERP - Stopping System Servers...
echo =====================================================================
echo.

echo Stopping Django/Python servers...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*manage.py runserver*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq RestoERP*" 2>nul

echo Stopping Bun and Node frontend processes...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*restaurant-frontend*' -or $_.Name -match 'bun|node' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" 2>nul
taskkill /F /IM bun.exe 2>nul
taskkill /F /IM node.exe 2>nul

echo.
echo All system background servers have been stopped successfully.
timeout /t 3 /nobreak >nul
