Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

' فحص مسار pythonw.exe في البيئة الافتراضية venv أولاً أو مسار النظام
pythonwExe = "pythonw"
If fso.FileExists(strPath & "\restaurantsApi\venv\Scripts\pythonw.exe") Then
    pythonwExe = """" & strPath & "\restaurantsApi\venv\Scripts\pythonw.exe"""
End If

WshShell.CurrentDirectory = strPath
' المعامل 0 يمنع فتح أي نافذة CMD أو Terminal نهائياً
WshShell.Run pythonwExe & " """ & strPath & "\run_system.pyw""", 0, False
Set WshShell = Nothing
