import os
import sys
import shutil
import socket
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "restaurantsApi"
FRONTEND_DIR = ROOT_DIR / "restaurant-frontend"

def clean_installation():
    print("=" * 65)
    print(" 🧹 تنظيف بيئة التثبيت السابقة وضمان تثبيت نظيف وجديد بالكامل")
    print("=" * 65)

    # 1. حذف ملفات البيئة القديمة التي تحتوي على إعدادات سابقة
    env_files = [
        BACKEND_DIR / ".env",
        FRONTEND_DIR / ".env.local",
        FRONTEND_DIR / ".env.development",
    ]
    for env_file in env_files:
        if env_file.exists():
            try:
                env_file.unlink()
                print(f" ✓ تم حذف إعدادات البيئة القديمة: {env_file.name}")
            except Exception as e:
                print(f" ! تعذر حذف {env_file.name}: {e}")

    # 2. حذف ملفات الكاش وملفات القفل المعلقة
    cache_dirs = [
        FRONTEND_DIR / ".next" / "dev",
        FRONTEND_DIR / ".next" / "cache",
        BACKEND_DIR / "__pycache__",
    ]
    for c_dir in cache_dirs:
        if c_dir.exists():
            try:
                shutil.rmtree(c_dir, ignore_errors=True)
                print(f" ✓ تم تنظيف الكاش القديم: {c_dir.name}")
            except Exception:
                pass

    # 3. حذف قاعدة بيانات SQLite القديمة إن وُجدت للبدء من الصفر
    sqlite_db = BACKEND_DIR / "db.sqlite3"
    if sqlite_db.exists():
        try:
            sqlite_db.unlink()
            print(" ✓ تم حذف قاعدة بيانات SQLite التجريبية القديمة لضمان بدء نظيف.")
        except Exception:
            pass

    # 4. إعادة تعيين قاعدة بيانات PostgreSQL إذا اختار العميل البدء من الصفر
    host = "127.0.0.1"
    port = 5432
    db_name = "restaurant_db"
    db_user = "postgres"
    db_pass = "0918147613a"

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5)
        pg_live = (sock.connect_ex((host, port)) == 0)
        sock.close()
    except Exception:
        pg_live = False

    if pg_live:
        try:
            import psycopg2
            from psycopg2 import sql
            from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
            conn = psycopg2.connect(dbname="postgres", user=db_user, password=db_pass, host=host, port=port)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cur = conn.cursor()
            # إنهاء الجلسات الحالية وإعادة إنشاء قاعدة البيانات
            cur.execute("""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = %s
                  AND pid <> pg_backend_pid();
            """, (db_name,))
            cur.execute(sql.SQL("DROP DATABASE IF EXISTS {};").format(sql.Identifier(db_name)))
            cur.execute(sql.SQL("CREATE DATABASE {} WITH OWNER {} ENCODING 'UTF8';").format(
                sql.Identifier(db_name),
                sql.Identifier(db_user)
            ))
            cur.close()
            conn.close()
            print(" ✓ تم تصفير وإعادة إنشاء قاعدة بيانات PostgreSQL (restaurant_db) نظيفة بالكامل.")
        except Exception as e:
            print(f" ! تنبيه عند تصفير PostgreSQL: {e}")

    # 5. كتابة ملف .env جديد ونظيف بدون بيانات أجهزة أو مطاعم سابقة
    new_backend_env = """# Fresh Production Environment Settings
USE_POSTGRES=True
DB_NAME=restaurant_db
DB_USER=postgres
DB_PASSWORD=0918147613a
DB_HOST=127.0.0.1
DB_PORT=5432
DEBUG=True
SECRET_KEY=django-insecure-fresh-restoerp-setup-key-2026-clean-instance
"""
    try:
        with open(BACKEND_DIR / ".env", "w", encoding="utf-8") as f:
            f.write(new_backend_env)
        print(" ✓ تم إنشاء ملف .env جديد ونظيف لخادم النظام.")
    except Exception as e:
        print(f" ! خطأ في إنشاء .env: {e}")

    print("=" * 65)
    print(" [V] اكتملت تصفية الإعدادات بنجاح، النظام جاهز للتثبيت الجديد.")
    print("=" * 65)

if __name__ == "__main__":
    clean_installation()
