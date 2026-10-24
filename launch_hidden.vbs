Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

' 1. تحديد مسار محرك bun المدمج داخل مجلد bin أو مسار النظام
bunExe = "bun"
If fso.FileExists(strPath & "\bin\bun.exe") Then
    bunExe = strPath & "\bin\bun.exe"
End If

' 2. تحديد مسار pythonw.exe المخصص لتشغيل بايثون بدون أي نافذة أو شاشة سوداء
pythonwExe = strPath & "\restaurantsApi\venv\Scripts\pythonw.exe"
If Not fso.FileExists(pythonwExe) Then
    pythonwExe = "python"
End If

' 3. تشغيل خادم Django الخلفي داخلياً وبشكل صامت تماماً (WindowStyle = 0)
WshShell.CurrentDirectory = strPath & "\restaurantsApi"
backendCmd = """" & pythonwExe & """ manage.py runserver 127.0.0.1:8000"
WshShell.Run backendCmd, 0, False

' 4. تشغيل خادم Next.js الأمامي داخلياً وبشكل صامت تماماً (WindowStyle = 0)
WshShell.CurrentDirectory = strPath & "\restaurant-frontend"
frontendCmd = """" & bunExe & """ run dev"
WshShell.Run frontendCmd, 0, False
