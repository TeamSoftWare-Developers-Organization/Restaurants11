# -*- coding: utf-8 -*-
"""
أداة بناء سيرفر دجانغو المستقل كملف تنفيذي عبر PyInstaller
RestoERP Backend Executable Builder
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# ضبط ترميز الطرفية في ويندوز لدعم اللغة العربية دون أخطاء cp1252
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# إعداد المسارات
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "restaurantsApi"
DIST_DIR = ROOT_DIR / "backend_dist"
ENTRY_FILE = BACKEND_DIR / "server.py"

VENV_PYTHON = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
PYTHON_EXE = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable

SEP = ";" if os.name == "nt" else ":"


def prepare_staging_backend():
    """تجهيز نسخة نظيفة من كود Django بدون venv والملفات المؤقتة لتفادي طول المسار في ويندوز"""
    staging_dir = ROOT_DIR / "build_staging_backend" / "restaurantsApi"
    if staging_dir.parent.exists():
        shutil.rmtree(staging_dir.parent, ignore_errors=True)
    staging_dir.mkdir(parents=True, exist_ok=True)

    apps = [
        "auth", "core", "employees", "inventory", "media", "menu",
        "ml_services", "models", "orders", "payments", "reservations",
        "restaurant_management_system"
    ]

    for app_name in apps:
        src = BACKEND_DIR / app_name
        if src.exists():
            shutil.copytree(
                src,
                staging_dir / app_name,
                ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo", ".git*", "venv*")
            )

    for fname in ["manage.py", ".env", "server.py"]:
        src_file = BACKEND_DIR / fname
        if src_file.exists():
            shutil.copy2(src_file, staging_dir / fname)

    # إذا وجد مجلد PostgreSQL المحمول نقوم بتضمينه
    for pg_name in ["pgsql", "postgres"]:
        pg_src = BACKEND_DIR / pg_name
        if not pg_src.exists():
            pg_src = ROOT_DIR / pg_name
        if pg_src.exists():
            print(f"تضمين حزمة PostgreSQL المحمولة من {pg_src}...")
            shutil.copytree(pg_src, staging_dir / pg_name, ignore=shutil.ignore_patterns("data*", "pgdata*"))

    return staging_dir


def build():
    print("=== [1/2] تجهيز ملفات الباك إند النظيفة ===")
    staging_dir = prepare_staging_backend()

    target_entry = staging_dir / "server.py"

    print("=== [2/2] بناء الملف التنفيذي django_server.exe بواسطة PyInstaller ===")
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR, ignore_errors=True)
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    import django
    django_locale_dir = Path(django.__file__).resolve().parent / "conf" / "locale"

    cmd = [
        PYTHON_EXE,
        "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--windowed", # إخفاء نافذة CMD
        "--clean",
        "--name=django_server",
        f"--distpath={DIST_DIR}",
        f"--add-data={staging_dir}{SEP}restaurantsApi",
        f"--add-data={django_locale_dir}{SEP}django/conf/locale",
        "--collect-data=django",
        f"--paths={BACKEND_DIR}",
        f"--paths={staging_dir}",
        "--hidden-import=waitress",
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
        str(target_entry)
    ]

    subprocess.run(cmd, cwd=str(ROOT_DIR), check=True)

    # تنظيف مجلد الـ staging
    shutil.rmtree(staging_dir.parent, ignore_errors=True)

    exe_file = DIST_DIR / "django_server" / "django_server.exe"
    if exe_file.exists():
        print(f"\n✓ تم بنجاح بناء الملف التنفيذي: {exe_file}")
    else:
        print("\n❌ لم يتم العثور على الملف التنفيذي الناتج!")


if __name__ == "__main__":
    build()
