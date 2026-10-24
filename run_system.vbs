Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

' تشغيل سكريبت التشغيل الصامت الداخلي بدون فتح أي نافذة cmd
wscriptPath = WshShell.ExpandEnvironmentStrings("%SystemRoot%\System32\wscript.exe")
WshShell.Run """" & wscriptPath & """ """ & strPath & "\launch_hidden.vbs""", 0, False
