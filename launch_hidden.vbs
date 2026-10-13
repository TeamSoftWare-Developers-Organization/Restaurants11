Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

' 1. تشغيل خادم الباك إند Django في الخلفية بدون أي شاشة سوداء
backendCmd = "cmd.exe /c cd /d """ & strPath & "\restaurantsApi"" && call .\venv\Scripts\activate.bat && python manage.py runserver 127.0.0.1:8000"
WshShell.Run backendCmd, 0, False

' 2. تشغيل خادم الواجهة الأمامية Next.js في الخلفية بدون أي شاشة سوداء
frontendCmd = "cmd.exe /c cd /d """ & strPath & "\restaurant-frontend"" && bun run dev"
WshShell.Run frontendCmd, 0, False

' 3. الانتظار 4 ثوانٍ ثم فتح واجهة النظام في المتصفح تلقائياً
WScript.Sleep 4000
WshShell.Run "http://localhost:3005"
