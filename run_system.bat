@echo off
setlocal EnableExtensions

:: تشغيل المحرك في الخلفية وإخفاء جميع نوافذ الـ Shell (Command Prompt) فوراً
wscript.exe "%~dp0launch_hidden.vbs"
exit
