# -*- coding: utf-8 -*-
"""
خادم الإنتاج المستقل لنظام إدارة المطاعم (Django + Waitress + Embedded Postgres/SQLite)
RestoERP Standalone Production Backend Runner
"""

import os
import sys
import io

# ضمان وجود stdout و stderr في وضع GUI بدون نافذة CMD لمنع أي خطأ 'NoneType' object has no attribute 'write'
class SafeOutputWriter:
    def write(self, s):
        pass
    def flush(self):
        pass
    def isatty(self):
        return False

if sys.stdout is None:
    sys.stdout = SafeOutputWriter()
if sys.stderr is None:
    sys.stderr = SafeOutputWriter()

# ضبط ترميز المخرجات لدعم العربية في ويندوز
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import time
import socket
import logging
import atexit
import signal
import subprocess
from pathlib import Path

# تحديد المسارات الأساسية
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.executable).parent
    BUNDLE_DIR = Path(getattr(sys, '_MEIPASS', BASE_DIR))
else:
    BASE_DIR = Path(__file__).resolve().parent
    BUNDLE_DIR = BASE_DIR

# إضافة المسار الحالي إلى sys.path
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(BUNDLE_DIR) not in sys.path:
    sys.path.insert(0, str(BUNDLE_DIR))

# إعداد السجلات
LOG_DIR = BASE_DIR / "logs"
try:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    LOG_FILE = LOG_DIR / "backend_server.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(str(LOG_FILE), encoding="utf-8"),
            logging.StreamHandler(sys.stdout)
        ]
    )
except Exception:
    logging.basicConfig(level=logging.INFO)

CREATE_NO_WINDOW = 0x08000000 if os.name == 'nt' else 0

# متغيرات إدارة PostgreSQL المحمول
PG_STARTED_BY_US = False
PG_CTL_BIN = None
PG_DATA_DIR = None
PG_PORT = 5433  # منفذ مخصص لتجنب التعارض مع أي خادم postgres خارجي


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """التحقق مما إذا كان المنفذ قيد الاستخدام بالفعل"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False


def setup_embedded_postgres():
    """تهيئة وتشغيل PostgreSQL المحمول إذا وجد في مجلد البرنامج"""
    global PG_STARTED_BY_US, PG_CTL_BIN, PG_DATA_DIR

    possible_pg_dirs = [
        BASE_DIR / "pgsql",
        BASE_DIR / "postgres",
        BUNDLE_DIR / "pgsql",
        BUNDLE_DIR / "postgres",
        BASE_DIR.parent / "pgsql",
        BASE_DIR.parent / "bin" / "pgsql",
    ]

    pg_dir = None
    for p in possible_pg_dirs:
        if p.exists() and (p / "bin" / "pg_ctl.exe").exists():
            pg_dir = p
            break

    if not pg_dir:
        logging.info("[PostgreSQL] لم يتم العثور على حزمة PostgreSQL محمولة. سيتم الاعتماد على PostgreSQL المثبت أو SQLite تلقائياً.")
        return

    PG_CTL_BIN = pg_dir / "bin" / "pg_ctl.exe"
    INITDB_BIN = pg_dir / "bin" / "initdb.exe"
    PG_DATA_DIR = BASE_DIR / "pgdata"

    if is_port_in_use(PG_PORT):
        logging.info(f"[PostgreSQL] خدمة قاعدة البيانات تعمل بالفعل على المنفذ {PG_PORT}.")
        os.environ["DB_PORT"] = str(PG_PORT)
        return

    # 1. تهيئة مجلد البيانات إذا لم يكن مهيئاً
    if not PG_DATA_DIR.exists() or not (PG_DATA_DIR / "PG_VERSION").exists():
        logging.info("[PostgreSQL] جاري تهيئة قاعدة بيانات محلية جديدة في pgdata...")
        PG_DATA_DIR.mkdir(parents=True, exist_ok=True)
        try:
            init_cmd = [
                str(INITDB_BIN),
                "-D", str(PG_DATA_DIR),
                "-U", "postgres",
                "-A", "trust",
                "-E", "UTF8",
                "--no-locale"
            ]
            subprocess.run(init_cmd, creationflags=CREATE_NO_WINDOW, check=True)
            logging.info("[PostgreSQL] تمت تهيئة قاعدة البيانات بنجاح.")
        except Exception as e:
            logging.error(f"[PostgreSQL] فشلت تهيئة قاعدة البيانات: {e}")
            return

    # 2. تشغيل خدمة PostgreSQL
    try:
        logging.info(f"[PostgreSQL] جاري تشغيل PostgreSQL المحمول على المنفذ {PG_PORT}...")
        start_cmd = [
            str(PG_CTL_BIN),
            "-D", str(PG_DATA_DIR),
            "-l", str(BASE_DIR / "logs" / "postgres.log"),
            "-o", f"-p {PG_PORT}",
            "start"
        ]
        subprocess.run(start_cmd, creationflags=CREATE_NO_WINDOW, check=True)
        PG_STARTED_BY_US = True

        # انتظار جاهزية المنفذ
        for _ in range(25):
            if is_port_in_use(PG_PORT):
                logging.info("[PostgreSQL] خادم PostgreSQL جاهز ومستقر.")
                os.environ["DB_PORT"] = str(PG_PORT)
                break
            time.sleep(0.2)
    except Exception as e:
        logging.error(f"[PostgreSQL] فشل تشغيل PostgreSQL المحمول: {e}")


def stop_embedded_postgres():
    """إيقاف PostgreSQL المحمول عند الخروج"""
    global PG_STARTED_BY_US, PG_CTL_BIN, PG_DATA_DIR
    if PG_STARTED_BY_US and PG_CTL_BIN and PG_DATA_DIR and PG_DATA_DIR.exists():
        try:
            logging.info("[PostgreSQL] جاري إيقاف خدمة PostgreSQL المحمولة...")
            stop_cmd = [
                str(PG_CTL_BIN),
                "-D", str(PG_DATA_DIR),
                "-m", "fast",
                "stop"
            ]
            subprocess.run(stop_cmd, creationflags=CREATE_NO_WINDOW, timeout=10)
            logging.info("[PostgreSQL] تم إيقاف PostgreSQL بنجاح.")
        except Exception as e:
            logging.error(f"[PostgreSQL] خطأ أثناء إيقاف PostgreSQL: {e}")


# تسجيل إيقاف قاعدة البيانات عند الخروج
atexit.register(stop_embedded_postgres)

def handle_exit_signal(signum, frame):
    logging.info(f"[Backend] استلام إشارة إغلاق ({signum}). إيقاف العمليات...")
    stop_embedded_postgres()
    sys.exit(0)

try:
    signal.signal(signal.SIGINT, handle_exit_signal)
    signal.signal(signal.SIGTERM, handle_exit_signal)
except Exception:
    pass


def run_migrations():
    """تطبيق أي هجرات جديدة تلقائياً لضمان سلامة الجداول"""
    try:
        import django
        from django.core.management import call_command
        logging.info("[Backend] فحص وتطبيق هجرات قاعدة البيانات...")
        call_command("migrate", interactive=False, no_color=True)
        logging.info("[Backend] قاعدة البيانات محدثة بنجاح.")
    except Exception as e:
        logging.error(f"[Backend] حدث خطأ أثناء فحص الهجرات: {e}")


def start_server(port: int = 8000):
    """إطلاق خادم Waitress لخدمة واجهة Next.js والـ API معاً"""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "restaurant_management_system.settings")

    # 1. إعداد قاعدة البيانات
    setup_embedded_postgres()

    # 2. تهيئة Django
    import django
    django.setup()

    # 3. تشغيل الهجرات
    run_migrations()

    # 4. تشغيل خادم Waitress
    from waitress import serve
    from restaurant_management_system.wsgi import application

    logging.info(f"[Backend] خادم الإنتاج يعمل الآن على: http://127.0.0.1:{port}")
    print(f"DJANGO_SERVER_STARTED:http://127.0.0.1:{port}", flush=True)

    try:
        serve(
            application,
            host="127.0.0.1",
            port=port,
            threads=8,
            channel_timeout=120,
            cleanup_interval=30
        )
    except Exception as e:
        logging.critical(f"[Backend] توقف خادم Waitress: {e}", exc_info=True)
    finally:
        stop_embedded_postgres()


if __name__ == "__main__":
    port_arg = 8000
    if len(sys.argv) > 1:
        try:
            port_arg = int(sys.argv[1])
        except ValueError:
            pass
    start_server(port_arg)
