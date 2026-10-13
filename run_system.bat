@echo off
setlocal EnableExtensions
title RestoERP Launcher

echo =====================================================================
echo    RestoERP - Starting System Servers...
echo =====================================================================
echo.

set "ROOT_DIR=%~dp0"

echo [1/3] Starting Backend API Server (Django on port 8000)...
start "RestoERP - Backend API" cmd /k "cd /d ""%ROOT_DIR%restaurantsApi"" && call .\venv\Scripts\activate.bat && python manage.py runserver 127.0.0.1:8000"

echo [2/3] Starting Frontend Server (Next.js on port 3005)...
start "RestoERP - Frontend Web" cmd /k "cd /d ""%ROOT_DIR%restaurant-frontend"" && bun run dev"

echo [3/3] Opening RestoERP in browser...
powershell -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:3005'"

echo.
echo =====================================================================
echo  System is running:
echo  - Frontend: http://localhost:3005
echo  - Backend API: http://127.0.0.1:8000/api/docs
echo  - To stop servers, run stop_system.bat
echo =====================================================================
pause
