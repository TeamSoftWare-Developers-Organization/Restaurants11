@echo off
title Stopping Restaurant System
taskkill /F /IM pythonw.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM bun.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
exit
