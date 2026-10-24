@echo off
setlocal EnableExtensions

:: التحقق من توفر محرك bun المدمج وإضافته لمسار PATH مؤقتاً للجلسة
if exist "%~dp0bin\bun.exe" (
    set "PATH=%~dp0bin;%PATH%"
)

:: تشغيل السيرفرات بالكامل داخلياً في الخلفية بدون نوافذ cmd
start "" "%SystemRoot%\System32\wscript.exe" "%~dp0launch_hidden.vbs"
exit
