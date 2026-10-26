# -*- coding: utf-8 -*-
"""
أداة بناء وتجميع تطبيق سطح المكتب المدمج
PyInstaller Build Script for Smart Restaurant & Cafe ERP Desktop
يقوم هذا السكريبت بـ:
1. التأكد من بناء الواجهة وتوليد مجلد (restaurant-frontend/out).
2. تجميع خادم Django + خادم Waitress + الواجهة + محرك pywebview داخل مجلد تنفيذي واحد (dist/SmartRestaurantERP).
3. تضمين قاعدة البيانات المحمولة (pgsql) تلقائياً في حال تواجدها.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "restaurant-frontend"
FRONTEND_OUT = FRONTEND_DIR / "out"
BACKEND_DIR = ROOT_DIR / "restaurantsApi"
PGSQL_DIR = ROOT_DIR / "pgsql"

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


def build_desktop_bundle():
    step_banner("2/3 تجميع التطبيق المكتبي باستخدام PyInstaller")

    # تجميع وسائط --add-data
    add_data = [
        f"{BACKEND_DIR}{SEP}restaurantsApi",
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
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconsole",
        "--onedir",
        "--clean",
        "--name=SmartRestaurantERP",
        f"--paths={BACKEND_DIR}",
    ]

    for item in add_data:
        cmd.extend(["--add-data", item])

    for imp in hidden_imports:
        cmd.extend(["--hidden-import", imp])

    # الملف الرئيسي
    cmd.append(str(ROOT_DIR / "desktop_main.pyw"))

    print("جاري تشغيل PyInstaller لبناء حزمة البرنامج...")
    res = subprocess.run(cmd, cwd=str(ROOT_DIR))
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
