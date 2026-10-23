Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

' تحديد مسار محرك bun المدمج داخل مجلد bin أو النظام
bunExe = "bun"
If fso.FileExists(strPath & "\bin\bun.exe") Then
    bunExe = """" & strPath & "\bin\bun.exe"""
End If

' 1. تشغيل خادم الباك إند Django في الخلفية بدون أي شاشة سوداء
backendCmd = "cmd.exe /c cd /d """ & strPath & "\restaurantsApi"" && call .\venv\Scripts\activate.bat && python manage.py runserver 127.0.0.1:8000"
WshShell.Run backendCmd, 0, False

' 2. تشغيل خادم الواجهة الأمامية Next.js في الخلفية باستخدام محرك bun المدمج
frontendCmd = "cmd.exe /c cd /d """ & strPath & "\restaurant-frontend"" && " & bunExe & " run dev"
WshShell.Run frontendCmd, 0, False
