!include "LogicLib.nsh"

!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "جاري إضافة استثناءات الأمان لتسريع إقلاع الخادم الداخلي..."
  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Add-MpPreference -ExclusionPath \"$INSTDIR\", \"$LOCALAPPDATA\SmartRestaurantERP\" -ErrorAction SilentlyContinue"'

  DetailPrint "جاري التحقق من خدمة قاعدة البيانات PostgreSQL..."
  ; فحص ما إذا كان المنفذ 5432 قيد الاستماع أو وجود خدمة postgresql
  nsExec::ExecToStack 'powershell.exe -NoProfile -Command "if (Get-Service -Name *postgres* -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"'
  Pop $0 ; 0 = مثبتة مسبقاً، 1 = غير مثبتة

  ${If} $0 != 0
    DetailPrint "قاعدة البيانات غير مثبتة. جاري البحث عن حزمة التثبيت الصامتة..."
    ; يفترض وضع مثبت postgresql-16-windows-x64.exe بجانب ملف Setup.exe أو داخل مجلد resources
    IfFileExists "$EXEDIR\postgresql-16-windows-x64.exe" 0 CheckBundledPg
      DetailPrint "تم العثور على مثبت PostgreSQL بجانب الإعداد. جاري التثبيت الصامت..."
      nsExec::ExecToLog '"$EXEDIR\postgresql-16-windows-x64.exe" --mode unattended --unattendedmodeui minimal --superpassword "postgres" --servicename "postgresql-x64-16" --servicepassword "postgres" --serverport 5432'
      Goto CreateDb

    CheckBundledPg:
    IfFileExists "$INSTDIR\resources\postgresql-16-windows-x64.exe" 0 PgMissing
      DetailPrint "تم العثور على مثبت PostgreSQL المرفق. جاري التثبيت الصامت..."
      nsExec::ExecToLog '"$INSTDIR\resources\postgresql-16-windows-x64.exe" --mode unattended --unattendedmodeui minimal --superpassword "postgres" --servicename "postgresql-x64-16" --servicepassword "postgres" --serverport 5432'
      Goto CreateDb

    PgMissing:
      MessageBox MB_ICONEXCLAMATION|MB_OK "تنبيه: لم يتم العثور على حزمة PostgreSQL المرفقة. يرجى التأكد من تشغيل خادم قاعدة البيانات على المنفذ 5432."
      Goto DonePg

    CreateDb:
      DetailPrint "جاري إنشاء قاعدة البيانات restaurants_db وتهيئة الصلاحيات..."
      nsExec::ExecToLog 'cmd.exe /c set PGPASSWORD=postgres&& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -c "CREATE DATABASE restaurants_db;"'
      nsExec::ExecToLog 'powershell.exe -NoProfile -Command "$psql = (Get-ChildItem -Path ''C:\Program Files\PostgreSQL'' -Filter psql.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName); if ($psql) { $env:PGPASSWORD=''postgres''; & $psql -U postgres -h 127.0.0.1 -p 5432 -c ''CREATE DATABASE restaurants_db;'' }"'
  ${Else}
    DetailPrint "خدمة PostgreSQL مثبتة مسبقاً. جاري التأكد من تشغيلها..."
    nsExec::ExecToLog 'powershell.exe -NoProfile -Command "Get-Service -Name *postgres* | Start-Service -ErrorAction SilentlyContinue"'
  ${EndIf}

  DonePg:
!macroend
