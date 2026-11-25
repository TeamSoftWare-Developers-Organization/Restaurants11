# -*- coding: utf-8 -*-
"""
أداة بناء سيرفر دجانغو المستقل كملف تنفيذي عبر PyInstaller
RestoSystem Backend Executable Builder (TechTwo) (Supports Electron --onedir & Tauri --onefile Sidecar)
"""

import argparse
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
TAURI_BINARIES_DIR = ROOT_DIR / "restaurant-frontend" / "src-tauri" / "binaries"
TAURI_RESOURCES_DIR = ROOT_DIR / "restaurant-frontend" / "src-tauri" / "resources" / "django_server"
ENTRY_FILE = BACKEND_DIR / "server.py"

VENV_PYTHON = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
PYTHON_EXE = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable

SEP = ";" if os.name == "nt" else ":"

EXCLUDED_HEAVY_MODULES = [
    "tensorflow",
    "keras",
    "tensorboard",
    "h5py",
    "grpc",
    "webview",
    "matplotlib",
    "scipy",
    "tkinter",
    "PyQt5",
    "PyQt6",
    "PySide2",
    "PySide6",
    "django.contrib.gis",
]


def detect_target_triple() -> str:
    """استخراج المعمارية المستهدفة من rustc مع بديل قياسي لـ Windows x64."""
    try:
        out = subprocess.check_output(["rustc", "-vV"], text=True, stderr=subprocess.DEVNULL)
        for line in out.splitlines():
            if line.startswith("host:"):
                return line.split(":", 1)[1].strip()
    except Exception:
        pass
    return "x86_64-pc-windows-msvc" if os.name == "nt" else "x86_64-unknown-linux-gnu"


def prepare_staging_backend():
    """تجهيز نسخة نظيفة من كود Django بدون venv والملفات المؤقتة ونماذج Keras الضخمة."""
    staging_dir = ROOT_DIR / "build_staging_backend" / "restaurantsApi"
    if staging_dir.parent.exists():
        shutil.rmtree(staging_dir.parent, ignore_errors=True)
    staging_dir.mkdir(parents=True, exist_ok=True)

    apps = [
        "auth", "core", "employees", "inventory", "media", "menu",
        "ml_services", "models", "orders", "payments", "pos", "reservations",
        "restaurant_management_system"
    ]

    for app_name in apps:
        src = BACKEND_DIR / app_name
        if src.exists():
            shutil.copytree(
                src,
                staging_dir / app_name,
                ignore=shutil.ignore_patterns(
                    "__pycache__", "*.pyc", "*.pyo", ".git*", "venv*", "*.keras", "*.tflite"
                )
            )

    for fname in ["manage.py", ".env", "server.py", "init_db.py"]:
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


def build(for_tauri: bool = False):
    print("=== [1/2] تجهيز ملفات الباك إند النظيفة ===")
    staging_dir = prepare_staging_backend()
    target_entry = staging_dir / "server.py"

    import django
    ninja_pkg_dir = VENV_PYTHON.parent.parent / "Lib" / "site-packages" / "ninja"

    if for_tauri:
        binary_name = "django_server"
        target_server_dir = ROOT_DIR / "restaurant-frontend" / "src-tauri" / "resources" / "django_server"
        if target_server_dir.exists():
            shutil.rmtree(target_server_dir, ignore_errors=True)
        target_server_dir.parent.mkdir(parents=True, exist_ok=True)
        dist_path = target_server_dir.parent
        bundle_mode_flag = "--onedir"
        print(f"=== [2/2] بناء Micro-Backend سريع لـ Tauri بوضع --onedir ({target_server_dir / 'django_server.exe'}) ===")
    else:
        binary_name = "django_server"
        dist_path = DIST_DIR
        bundle_mode_flag = "--onedir"
        if DIST_DIR.exists():
            shutil.rmtree(DIST_DIR, ignore_errors=True)
        DIST_DIR.mkdir(parents=True, exist_ok=True)
        print("=== [2/2] بناء الملف التنفيذي django_server.exe بواسطة PyInstaller ===")

    cmd = [
        PYTHON_EXE,
        "-m", "PyInstaller",
        "--noconfirm",
        bundle_mode_flag,
        "--windowed",  # إخفاء نافذة CMD
        "--clean",
        f"--name={binary_name}",
        f"--distpath={dist_path}",
        f"--add-data={staging_dir}{SEP}restaurantsApi",
        f"--add-data={ninja_pkg_dir}{SEP}ninja",
        "--collect-data=django",
        f"--paths={BACKEND_DIR}",
        f"--paths={staging_dir}",
        "--hidden-import=waitress",
        "--hidden-import=psycopg2",
        "--hidden-import=numpy",
        "--hidden-import=PIL",
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
        "--hidden-import=core.license_service",
        "--hidden-import=ml_services.api",
        "--hidden-import=pos.printer_service",
        "--hidden-import=win32print",
    ]

    weights_file = staging_dir / "models" / "fingerprint_weights.npz"
    if weights_file.exists():
        cmd.append(f"--add-data={weights_file}{SEP}models")

    for mod in EXCLUDED_HEAVY_MODULES:
        cmd.append(f"--exclude-module={mod}")

    cmd.append(str(target_entry))

    subprocess.run(cmd, cwd=str(ROOT_DIR), check=True)

    # تنظيف مجلد الـ staging
    shutil.rmtree(staging_dir.parent, ignore_errors=True)

    # نسخ ملفات الوسائط والصور الافتراضية إلى المجلد الهدف
    media_src = BACKEND_DIR / "media"
    if media_src.exists():
        dest_media = (target_server_dir if for_tauri else DIST_DIR / "django_server") / "media"
        if dest_media.exists():
            shutil.rmtree(dest_media, ignore_errors=True)
        print(f"نسخ ملفات الوسائط والصور من {media_src} إلى {dest_media}...")
        shutil.copytree(media_src, dest_media)

    if for_tauri:
        frontend_out = ROOT_DIR / "restaurant-frontend" / "out"
        if frontend_out.exists():
            dest_frontend = target_server_dir / "frontend"
            if dest_frontend.exists():
                shutil.rmtree(dest_frontend, ignore_errors=True)
            print(f"نسخ ملفات الواجهة من {frontend_out} إلى {dest_frontend}...")
            shutil.copytree(frontend_out, dest_frontend)
        exe_file = target_server_dir / "django_server.exe"
    else:
        frontend_out = ROOT_DIR / "restaurant-frontend" / "out"
        if frontend_out.exists():
            dest_frontend = DIST_DIR / "django_server" / "frontend"
            if dest_frontend.exists():
                shutil.rmtree(dest_frontend, ignore_errors=True)
            print(f"نسخ ملفات الواجهة من {frontend_out} إلى {dest_frontend}...")
            shutil.copytree(frontend_out, dest_frontend)

        # مزامنة الخادم المحدث تلقائياً مع مجلد موارد Tauri لضمان تطابق النسختين
        try:
            tauri_target = ROOT_DIR / "restaurant-frontend" / "src-tauri" / "resources" / "django_server"
            if tauri_target.exists():
                shutil.rmtree(tauri_target, ignore_errors=True)
            tauri_target.parent.mkdir(parents=True, exist_ok=True)
            print(f"مزامنة حزمة الخادم مع مجلد موارد Tauri: {tauri_target}...")
            shutil.copytree(DIST_DIR / "django_server", tauri_target)
        except Exception as sync_err:
            print(f"تنبيه مزامنة Tauri: {sync_err}")

        exe_file = DIST_DIR / "django_server" / "django_server.exe"

    if exe_file.exists():
        size_mb = exe_file.stat().st_size / (1024 * 1024)
        print(f"\n✓ تم بنجاح بناء الملف التنفيذي: {exe_file} ({size_mb:.2f} MB)")
    else:
        print("\n❌ لم يتم العثور على الملف التنفيذي الناتج!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build RestoSystem Django backend executable (TechTwo)")
    parser.add_argument(
        "--tauri",
        action="store_true",
        help="Build single-file sidecar executable into restaurant-frontend/src-tauri/binaries/",
    )
    args = parser.parse_args()
    build(for_tauri=args.tauri)
