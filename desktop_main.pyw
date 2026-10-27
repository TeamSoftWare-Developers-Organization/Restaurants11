# -*- coding: utf-8 -*-
"""
مشغل سطح المكتب المدمج لنظام إدارة المطاعم والمقاهي
Embedded Desktop Launcher for Restaurant Management System
يجمع بين:
1. قاعدة بيانات PostgreSQL المحمولة (إدارة صامتة لدورة الحياة)
2. خادم WSGI داخلي مدمج (Waitress)
3. خادم Django والتطبيق الخلفي
4. الواجهة الأمامية المبنية مسبقاً (Next.js Static Export)
5. نافذة سطح المكتب المستقلة (pywebview عبر محرك Edge Chromium)
"""

import os
import sys
import time
import socket
import logging
import threading
import subprocess
from pathlib import Path

# إعداد مسار العمل الأساسي
if getattr(sys, 'frozen', False):
    ROOT_DIR = Path(sys.executable).parent
    BUNDLE_DIR = Path(getattr(sys, '_MEIPASS', ROOT_DIR))
else:
    ROOT_DIR = Path(__file__).resolve().parent
    BUNDLE_DIR = ROOT_DIR

BACKEND_DIR = BUNDLE_DIR / "restaurantsApi"
if not BACKEND_DIR.exists():
    BACKEND_DIR = ROOT_DIR / "restaurantsApi"

# إضافة مسار الباك إند لمسارات بايثون
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# ضبط متغيرات البيئة لـ Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "restaurant_management_system.settings")

def get_writable_app_dir() -> Path:
    """تحديد مجلد آمن ومتاح للكتابة لتخزين السجلات والبيانات الديناميكية"""
    try:
        test_file = ROOT_DIR / ".write_test"
        with open(test_file, "w") as f:
            f.write("ok")
        test_file.unlink()
        return ROOT_DIR
    except Exception:
        app_data = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "SmartRestaurantERP"
        app_data.mkdir(parents=True, exist_ok=True)
        return app_data

APP_DATA_DIR = get_writable_app_dir()
LOG_FILE = APP_DATA_DIR / "desktop_system.log"

try:
    logging.basicConfig(
        filename=str(LOG_FILE),
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        encoding="utf-8"
    )
except Exception:
    try:
        logging.basicConfig(level=logging.INFO)
    except Exception:
        pass

CREATE_NO_WINDOW = 0x08000000 if os.name == 'nt' else 0

# حالة قاعدة البيانات التي قمنا بتشغيلها
PG_STARTED_BY_US = False
PG_CTL_BIN = None
PG_DATA_DIR = None


def find_free_port(start_port: int = 8000, max_attempts: int = 100) -> int:
    """البحث التلقائي عن أول منفذ حر متاح للخدمة"""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.3)
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return start_port


def is_postgres_running(host: str = "127.0.0.1", port: int = 5432) -> bool:
    """التحقق هل توجد خدمة بوستجريس تعمل مسبقاً"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False


def setup_embedded_postgres():
    """فحص وإطلاق قاعدة بيانات PostgreSQL المحمولة إذا كانت مدمجة ولم تكن تعمل"""
    global PG_STARTED_BY_US, PG_CTL_BIN, PG_DATA_DIR

    # فحص مسارات مجلد PostgreSQL المحمول
    possible_pg_dirs = [
        ROOT_DIR / "pgsql",
        BUNDLE_DIR / "pgsql",
        ROOT_DIR / "restaurantsApi" / "pgsql",
        ROOT_DIR.parent / "pgsql",
        ROOT_DIR.parent.parent / "pgsql",
    ]

    pg_dir = None
    for p in possible_pg_dirs:
        if p.exists() and (p / "bin" / "pg_ctl.exe").exists():
            pg_dir = p
            break

    if not pg_dir:
        logging.info("لم يتم العثور على مجلد PostgreSQL المحمول، سيتم الاعتماد على السيرفر الخارجي أو الإعدادات الافتراضية.")
        return

    PG_CTL_BIN = pg_dir / "bin" / "pg_ctl.exe"
    INITDB_BIN = pg_dir / "bin" / "initdb.exe"
    PG_DATA_DIR = pg_dir / "data"

    if is_postgres_running():
        logging.info("تم اكتشاف خادم PostgreSQL يعمل بالفعل محلياً على المنفذ 5432.")
        return

    # إذا كان مجلد البيانات غير موجود، نقوم بتهيئة قاعدة البيانات
    if not PG_DATA_DIR.exists() or not (PG_DATA_DIR / "PG_VERSION").exists():
        logging.info("تهيئة قاعدة بيانات جديدة في مجلد data...")
        PG_DATA_DIR.mkdir(parents=True, exist_ok=True)
        try:
            init_cmd = [
                str(INITDB_BIN),
                "-D", str(PG_DATA_DIR),
                "-U", "postgres",
                "-A", "trust",
                "-E", "UTF8"
            ]
            subprocess.run(init_cmd, creationflags=CREATE_NO_WINDOW, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            logging.info("تمت تهيئة قاعدة البيانات بنجاح.")
        except Exception as e:
            logging.error(f"فشلت تهيئة قاعدة البيانات: {e}")
            return

    # تشغيل الخادم المحمول بصمت
    try:
        start_cmd = [
            str(PG_CTL_BIN),
            "-D", str(PG_DATA_DIR),
            "-l", str(pg_dir / "postgres.log"),
            "-o", "-p 5432",
            "start"
        ]
        subprocess.run(start_cmd, creationflags=CREATE_NO_WINDOW, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        PG_STARTED_BY_US = True
        logging.info("تم تشغيل خادم PostgreSQL المحمول بنجاح.")

        # انتظار ثانيتين للتأكد من جاهزية الخدمة
        for _ in range(20):
            if is_postgres_running():
                break
            time.sleep(0.2)
    except Exception as e:
        logging.error(f"فشل إطلاق خادم PostgreSQL المحمول: {e}")


def stop_embedded_postgres():
    """إيقاف خادم PostgreSQL المحمول عند إغلاق البرنامج"""
    global PG_STARTED_BY_US, PG_CTL_BIN, PG_DATA_DIR
    if PG_STARTED_BY_US and PG_CTL_BIN and PG_DATA_DIR and PG_DATA_DIR.exists():
        try:
            stop_cmd = [
                str(PG_CTL_BIN),
                "-D", str(PG_DATA_DIR),
                "-m", "fast",
                "stop"
            ]
            subprocess.run(stop_cmd, creationflags=CREATE_NO_WINDOW, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            logging.info("تم إيقاف خادم PostgreSQL بنجاح.")
        except Exception as e:
            logging.error(f"خطأ أثناء إيقاف خادم PostgreSQL: {e}")


def run_django_migrations():
    """تنفيذ الهجرات التلقائية لضمان سلامة قاعدة البيانات"""
    try:
        import django
        django.setup()
        from django.core.management import call_command
        logging.info("جاري فحص وتطبيق هجرات قاعدة البيانات...")
        call_command("migrate", interactive=False)
        logging.info("تم التحقق من قاعدة البيانات بنجاح.")
    except Exception as e:
        logging.error(f"حدث خطأ أثناء تطبيق الهجرات: {e}")


def start_waitress_server(port: int):
    """تشغيل خادم Waitress الداخلي لتقديم Django والواجهة المدمجة"""
    try:
        from waitress import create_server
        from restaurant_management_system.wsgi import application

        server = create_server(
            application,
            host="127.0.0.1",
            port=port,
            threads=8,
            channel_timeout=120,
            cleanup_interval=30
        )
        logging.info(f"خادم Waitress يعمل الآن على http://127.0.0.1:{port}")
        server.run()
    except Exception as e:
        logging.critical(f"خطأ غير متوقع في خادم Waitress: {e}", exc_info=True)


def wait_for_server(url: str, timeout: float = 15.0) -> bool:
    """انتظار استجابة الخادم قبل إظهار النافذة"""
    import urllib.request
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(url, timeout=1.0) as res:
                if res.status in (200, 301, 302, 404):
                    return True
        except Exception:
            pass
        time.sleep(0.3)
    return False


def main():
    logging.info("=== بدء تشغيل تطبيق سطح المكتب للنظام ===")

    # 1. إعداد وإطلاق PostgreSQL المحمول إن وجد
    setup_embedded_postgres()

    # 2. تحديد منفذ الخدمة المتاح
    port = find_free_port(8000)
    server_url = f"http://127.0.0.1:{port}"

    # 3. إعداد Django وتطبيق الهجرات
    run_django_migrations()

    # 4. تشغيل خادم Waitress في خيط منفصل بالخلفية
    server_thread = threading.Thread(
        target=start_waitress_server,
        args=(port,),
        daemon=True
    )
    server_thread.start()

    # 5. انتظار جاهزية السيرفر
    wait_for_server(server_url)

    # 6. فتح نافذة سطح المكتب الأصلية عبر pywebview
    try:
        import webview

        def on_closed():
            logging.info("تم إغلاق نافذة التطبيق بواسطة المستخدم.")
            stop_embedded_postgres()

        window = webview.create_window(
            title="نظام إدارة المطاعم والمقاهي المتكامل",
            url=server_url,
            width=1366,
            height=768,
            min_size=(1024, 600),
            background_color="#070b14",
            text_select=True,
            confirm_close=False
        )

        window.events.closed += on_closed

        # تشغيل المحرك
        webview.start(
            gui="edgechromium",
            debug=False
        )

    except Exception as e:
        logging.critical(f"تعذر فتح نافذة pywebview: {e}", exc_info=True)
        # خيار احتياطي في حال عدم دعم pywebview
        import webbrowser
        webbrowser.open(server_url)
        # إبقاء التطبيق قيد العمل حتى يتم إغلاقه يدوياً
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            stop_embedded_postgres()


if __name__ == "__main__":
    main()
