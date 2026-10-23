@echo off
setlocal EnableExtensions

:: التحقق من توفر محرك bun المدمج وإضافته لمسار PATH مؤقتاً للجلسة
if exist "%~dp0bin\bun.exe" (
    set "PATH=%~dp0bin;%PATH%"
)

:: تشغيل المحرك في الخلفية وإخفاء جميع نوافذ الـ Shell (Command Prompt) فوراً دون فتح المتصفح
wscript.exe "%~dp0launch_hidden.vbs"
exit
