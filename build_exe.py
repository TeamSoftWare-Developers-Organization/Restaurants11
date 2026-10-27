# -*- coding: utf-8 -*-
"""
أداة بناء وتجميع تطبيق سطح المكتب المدمج
PyInstaller Build Script for Smart Restaurant & Cafe ERP Desktop
يقوم هذا السكريبت بـ:
1. التأكد من بناء الواجهة وتوليد مجلد (restaurant-frontend/out).
2. استبعاد مجلد venv لتفادي خطأ Windows MAX_PATH وتصغير حجم الحزمة.
3. تجميع خادم Django + خادم Waitress + الواجهة + محرك pywebview داخل مجلد تنفيذي واحد (dist/SmartRestaurantERP).
4. تضمين قاعدة البيانات المحمولة (pgsql) تلقائياً في حال تواجدها.
"""

import os
import sys
import io
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

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "restaurant-frontend"
FRONTEND_OUT = FRONTEND_DIR / "out"
BACKEND_DIR = ROOT_DIR / "restaurantsApi"
PGSQL_DIR = ROOT_DIR / "pgsql"

VENV_PYTHON = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
PYTHON_EXE = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable

SEP = ";" if os.name == "nt" else ":"


def step_banner(title: str):
    print("\n" + "=" * 65)
    print(f"   {title}")
    print("=" * 65)


def check_and_build_frontend():
    step_banner("1/3 فحص وبناء الواجهة الأمامية (Static Export)")
    if not (FRONTEND_OUT / "index.html").exists():
        print("مجلد out غير موجود، جاري بناء الواجهة الآن...")
        runner = "bun" if shutil.which("bun") else ("npm" if shutil.which("npm") else None)
        if not runner:
            print("❌ خطأ: لم يتم العثور على bun أو npm لبناء الواجهة.")
            sys.exit(1)
        cmd = [runner, "run", "build"]
        print(f"تنفيذ: {' '.join(cmd)} داخل {FRONTEND_DIR}")
        res = subprocess.run(cmd, cwd=str(FRONTEND_DIR))
        if res.returncode != 0:
            print("❌ فشل بناء الواجهة الأمامية!")
            sys.exit(1)
    else:
        print("✓ تم العثور على مجلد التصدير الجاهز (restaurant-frontend/out).")


def prepare_backend_staging() -> Path:
    """تجهيز نسخة نظيفة من الباك إند لاستبعاد venv وتفادي أخطاء طول المسار"""
    staging_dir = ROOT_DIR / "build_staging" / "restaurantsApi"
    if staging_dir.parent.exists():
        shutil.rmtree(staging_dir.parent, ignore_errors=True)
    staging_dir.mkdir(parents=True, exist_ok=True)

    include_apps = [
        "auth",
        "core",
        "employees",
        "inventory",
        "media",
        "menu",
        "ml_services",
        "models",
        "orders",
        "payments",
        "reservations",
        "restaurant_management_system",
    ]

    for item in include_apps:
        src = BACKEND_DIR / item
        if src.exists():
            shutil.copytree(
                src,
                staging_dir / item,
                ignore=shutil.ignore_patterns(
                    "__pycache__", "*.pyc", "*.pyo", ".git*", ".vscode", "venv*"
                )
            )

    for filename in ["manage.py", ".env"]:
        src_file = BACKEND_DIR / filename
        if src_file.exists():
            shutil.copy2(src_file, staging_dir / filename)

    return staging_dir


def build_desktop_bundle():
    step_banner("2/3 تجميع التطبيق المكتبي باستخدام PyInstaller")
    staging_backend = prepare_backend_staging()

    # تجميع وسائط --add-data
    add_data = [
        f"{staging_backend}{SEP}restaurantsApi",
        f"{FRONTEND_OUT}{SEP}restaurant-frontend/out",
    ]

    if PGSQL_DIR.exists():
        add_data.append(f"{PGSQL_DIR}{SEP}pgsql")
        print("✓ تم العثور على مجلد PostgreSQL المحمول (pgsql) وسيتم دمجه بالحزمة.")

    # الوحدات المخفية الضرورية لـ Django و Ninja و Waitress
    hidden_imports = [
        "waitress",
        "webview",
        "webview.platforms.winforms",
        "webview.platforms.edgechromium",
        "psycopg2",
        "django",
        "django.core.management",
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
        "corsheaders",
        "ninja",
        "ninja_extra",
        "ninja_jwt",
        "ninja_jwt.controller",
        "ninja_jwt.tokens",
        "employees",
        "employees.api",
        "employees.attendance_api",
        "auth",
        "auth.api",
        "orders",
        "orders.api",
        "menu",
        "menu.api",
        "inventory",
        "inventory.api",
        "reservations",
        "reservations.api",
        "payments",
        "payments.api",
        "payments.shifts_api",
        "core",
        "core.api",
        "core.zakat_api",
        "ml_services",
        "ml_services.api",
    ]

    cmd = [
        PYTHON_EXE,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--clean",
        "--name=SmartRestaurantERP",
        f"--paths={BACKEND_DIR}",
        f"--paths={staging_backend}",
    ]

    for item in add_data:
        cmd.extend(["--add-data", item])

    for imp in hidden_imports:
        cmd.extend(["--hidden-import", imp])

    # الملف الرئيسي
    cmd.append(str(ROOT_DIR / "desktop_main.pyw"))

    print("جاري تشغيل PyInstaller لبناء حزمة البرنامج...")
    res = subprocess.run(cmd, cwd=str(ROOT_DIR))

    if staging_backend.parent.exists():
        shutil.rmtree(staging_backend.parent, ignore_errors=True)

    if res.returncode != 0:
        print("❌ فشل تجميع الحزمة عبر PyInstaller!")
        sys.exit(res.returncode)

    step_banner("3/3 اكتمال التجميع بنجاح!")
    dist_path = ROOT_DIR / "dist" / "SmartRestaurantERP"
    print(f"🎉 تم تجميع التطبيق بنجاح داخل المجلد:")
    print(f"   📂 {dist_path}")
    print(f"   🚀 الملف التنفيذي: {dist_path / 'SmartRestaurantERP.exe'}")
    print("\nيمكنك الآن نقل مجلد SmartRestaurantERP كاملاً إلى أي حاسوب ليعمل فوراً دون أي متطلبات!")


if __name__ == "__main__":
    check_and_build_frontend()
    build_desktop_bundle()
