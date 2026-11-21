; Script generated for Inno Setup Compiler
; Smart Restaurant & Cafe ERP - Commercial Closed Source Installer

[Setup]
AppName=RestoSystem - نظام رستو تك لإدارة المطاعم
AppVersion=2.0.0
AppPublisher=TechTwo
DefaultDirName={autopf}\RestoSystem
DefaultGroupName=RestoSystem
OutputDir=OutputSetup
OutputBaseFilename=RestoSystem_Setup
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
SetupIconFile=restaurant-frontend\public\favicon.ico
UninstallDisplayIcon={app}\frontend\favicon.ico

[Dirs]
; منح صلاحيات الكتابة الكاملة لكافة المستخدمين لتفادي خطأ Permission Denied في Program Files
Name: "{app}"; Permissions: users-full

[Files]
; نسخ كافة ملفات النسخة المغلقة (بدون أي كود مصدري مفتوح)
Source: "ClosedSource_Release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; إنشاء اختصار على سطح المكتب وقائمة ابدأ
Name: "{autodesktop}\RestoSystem POS"; Filename: "{app}\core\RestoCore\RestoCore.exe"; IconFilename: "{app}\frontend\favicon.ico"
Name: "{group}\RestoSystem POS"; Filename: "{app}\core\RestoCore\RestoCore.exe"; IconFilename: "{app}\frontend\favicon.ico"
Name: "{group}\إلغاء التثبيت"; Filename: "{uninstallexe}"

[Run]
; تشغيل البرنامج تلقائياً بعد اكتمال التثبيت
Filename: "{app}\core\RestoCore\RestoCore.exe"; Description: "تشغيل النظام الآن"; Flags: nowait postinstall skipifsilent
