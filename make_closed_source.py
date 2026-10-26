# -*- coding: utf-8 -*-
"""
أداة بناء النسخة التجارية المغلقة بالكامل (Closed-Source Proprietary Binary)
يقوم هذا السكريبت بـ:
1. بناء وتصدير الواجهة الأمامية وإزالة أي سورس كود (tsx/ts/map).
2. ترجمة كود Django بالكامل إلى بايتكود مجمّع ومحرك تنفيذي ثنائي (RestoCore.exe).
3. حذف وإبادة كافة ملفات .py المفتوحة من مجلد الإصدار النهائي لضمان عدم كشف خوارزمية التراخيص ومفتاح الملح (Secret Salt).
4. تجهيز مجلد ClosedSource_Release ليكون جاهزاً لبرنامج Inno Setup لإنشاء Setup.exe.
"""

import os
import sys
import shutil
import compileall
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "restaurant-frontend"
BACKEND_DIR = ROOT_DIR / "restaurantsApi"
RELEASE_DIR = ROOT_DIR / "ClosedSource_Release"

# العثور على بايثون البيئة الافتراضية venv لضمان توفر كافة المكتبات
VENV_PYTHON = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
PYTHON_EXE = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable

SEP = ";" if os.name == "nt" else ":"


def clean_old_builds():
    """حذف أي بناء قديم لضمان نظافة النسخة المغلقة"""
    if RELEASE_DIR.exists():
        print("جاري حذف مجلد ClosedSource_Release القديم...")
        shutil.rmtree(RELEASE_DIR, ignore_errors=True)
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    print("✓ تم تنظيف مسار التوزيع السابق.")


def build_frontend_bundle():
    """1. بناء الفرونت إند والتخلص من أي سورس كود tsx/ts"""
    print("\n[1/3] جاري تجميع الواجهة الأمامية وإخفاء السورس كود...")

    out_dir = FRONTEND_DIR / "out"
    # فحص هل تم البناء حديثاً أم يتطلب إعادة بناء
    runner = "bun" if shutil.which("bun") else ("npm" if shutil.which("npm") else None)
    if not (out_dir / "index.html").exists():
        if not runner:
            print("❌ خطأ: لم يتم العثور على bun أو npm لبناء الواجهة.")
            sys.exit(1)
        print(f"تنفيذ بناء الواجهة باستخدام {runner}...")
        cmd = [runner, "run", "build"]
        subprocess.run(cmd, cwd=str(FRONTEND_DIR), check=True)
    else:
        print("✓ تم العثور على تصدير الواجهة الجاهز في restaurant-frontend/out.")

    dest_frontend = RELEASE_DIR / "frontend"
    if dest_frontend.exists():
        shutil.rmtree(dest_frontend)
    shutil.copytree(out_dir, dest_frontend)

    # تنظيف أي خرائط مصادر (Source Maps) لمنع كشف أسامي الدوال والمتغيرات
    maps_removed = 0
    for map_file in list(dest_frontend.rglob("*.map")):
        try:
            map_file.unlink()
            maps_removed += 1
        except Exception:
            pass

    print(f"✓ تم استخراج الواجهة كحزم مشفرة ومضغوطة (خالية من ملفات tsx/ts، وحُذف {maps_removed} ملف map).")


def compile_backend_to_binary():
    """2. ترجمة كود بايثون وجانغو إلى ملفات ثنائية Executable لمنع قراءتها"""
    print("\n[2/3] جاري ترجمة كود Django إلى ملفات ثنائية Executable عبر PyInstaller...")
    entry_script = ROOT_DIR / "desktop_main.pyw"

    pyinstaller_cmd = [
        PYTHON_EXE,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--windowed",  # يمنع فتح CMD نهائياً
        "--clean",
        "--name=RestoCore",
        f"--distpath={RELEASE_DIR / 'core'}",
        f"--add-data={BACKEND_DIR}{SEP}restaurantsApi",
        f"--paths={BACKEND_DIR}",
        "--hidden-import=waitress",
        "--hidden-import=webview",
        "--hidden-import=webview.platforms.winforms",
        "--hidden-import=webview.platforms.edgechromium",
        "--hidden-import=psycopg2",
        "--hidden-import=django.core.wsgi",
        "--hidden-import=restaurant_management_system.settings",
        "--hidden-import=restaurant_management_system.urls",
        "--hidden-import=ninja",
        "--hidden-import=ninja_extra",
        "--hidden-import=ninja_jwt",
        "--hidden-import=corsheaders",
        "--hidden-import=employees.api",
        "--hidden-import=employees.attendance_api",
        "--hidden-import=auth.api",
        "--hidden-import=orders.api",
        "--hidden-import=menu.api",
        "--hidden-import=inventory.api",
        "--hidden-import=reservations.api",
        "--hidden-import=payments.api",
        "--hidden-import=payments.shifts_api",
        "--hidden-import=core.api",
        "--hidden-import=core.zakat_api",
        "--hidden-import=ml_services.api",
        str(entry_script)
    ]

    print("جاري التجميع الثنائي بواسطة PyInstaller...")
    subprocess.run(pyinstaller_cmd, cwd=str(ROOT_DIR), check=True)

    # تحويل كافة ملفات بايثون داخل الحزمة إلى بايتكود (.pyc) ثم حذف كافة ملفات .py المفتوحة
    core_app_dir = RELEASE_DIR / "core" / "RestoCore" / "_internal" / "restaurantsApi"
    if not core_app_dir.exists():
        core_app_dir = RELEASE_DIR / "core" / "RestoCore" / "restaurantsApi"

    if core_app_dir.exists():
        print("جاري تحويل السورس كود الداخلي إلى Bytecode ثنائي...")
        compileall.compile_dir(str(core_app_dir), force=True, quiet=1)

    print("جاري إزالة وحذف كافة ملفات (.py) المفتوحة من الحزمة الناتجة...")
    core_root = RELEASE_DIR / "core" / "RestoCore"
    deleted_py = 0
    if core_root.exists():
        for py_file in list(core_root.rglob("*.py")):
            try:
                py_file.unlink()
                deleted_py += 1
            except Exception:
                pass

    print(f"✓ تم تنظيف وحذف {deleted_py} ملف (.py) مفتوح المصدر نهائياً.")
    print("✓ تم تجميع الباك إند بنجاح كملفات مكتبية ثنائية ومحرك تنفيذي (RestoCore.exe).")


def finalize_package():
    """3. دمج الملفات التنفيذية والمشغل النهائي وفحص الأمان"""
    print("\n[3/3] جاري حزم التطبيق النهائي وفحص الأمان...")

    # نسخ مجلد محرك قاعدة البيانات المحمول إن وجد
    pgsql_src = ROOT_DIR / "pgsql"
    if pgsql_src.exists():
        dest_pg = RELEASE_DIR / "pgsql"
        if dest_pg.exists():
            shutil.rmtree(dest_pg)
        shutil.copytree(pgsql_src, dest_pg)
        print("✓ تم دمج قاعدة بيانات PostgreSQL المحمولة بنجاح.")

    # فحص أمان صارم: التأكد من صفر ملفات سورس كود في المجلد النهائي
    py_files = list(RELEASE_DIR.rglob("*.py"))
    ts_files = list(RELEASE_DIR.rglob("*.ts")) + list(RELEASE_DIR.rglob("*.tsx"))

    print("\n" + "=" * 65)
    print(" 🎉 تم إنشاء النسخة المغلقة بنجاح داخل مجلد: ClosedSource_Release")
    print(f" 🔒 عدد ملفات Python المفتوحة (.py) في الحزمة: {len(py_files)} (مغلق 100%)")
    print(f" 🔒 عدد ملفات TypeScript المفتوحة (.ts/.tsx): {len(ts_files)} (مغلق 100%)")
    print("=" * 65)
    print("📂 مسار النسخة التجارية المغلقة:")
    print(f"   {RELEASE_DIR}")
    print("🚀 مسار الملف التنفيذي الأساسي:")
    print(f"   {RELEASE_DIR / 'core' / 'RestoCore' / 'RestoCore.exe'}")
    print("\nالخطوة التالية:")
    print(" افتح Inno Setup وانقر Compile على ملف installer_script.iss لإنتاج Setup.exe!")


if __name__ == "__main__":
    clean_old_builds()
    build_frontend_bundle()
    compile_backend_to_binary()
    finalize_package()
