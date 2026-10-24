Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

' تشغيل سكريبت run_system.pyw بواسطة pythonw دون فتح أي نافذة CMD
pythonwCmd = "pythonw """ & strPath & "\run_system.pyw"""

' فحص بايثون البيئة الافتراضية أولاً لضمان وجود pythonw
venvPyw = strPath & "\restaurantsApi\venv\Scripts\pythonw.exe"
If fso.FileExists(venvPyw) Then
    pythonwCmd = """" & venvPyw & """ """ & strPath & "\run_system.pyw"""
End If

' المعامل 0 يمنع فتح أي نافذة CMD أو Terminal نهائياً
WshShell.Run pythonwCmd, 0, False
Set WshShell = Nothing
