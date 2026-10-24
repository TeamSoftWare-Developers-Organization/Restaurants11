import os
import sys
import time
import socket
import subprocess
import urllib.request
import webbrowser
from pathlib import Path

# إعداد المسارات الأساسية للمشروع
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "restaurantsApi"
FRONTEND_DIR = ROOT_DIR / "restaurant-frontend"

# منافذ أجهزة البصمة البيومترية المحظور استخدامها لتطبيقات الويب لمنع التداخل والتعارض
FINGERPRINT_PORTS = {4370, 4444, 8888, 5003}

def find_available_port(preferred_port: int, max_attempts: int = 50) -> int:
    """فحص المنفذ واختيار أول منفذ حر تلقائياً، مع تخطي منافذ أجهزة البصمة فوراً"""
    for port in range(preferred_port, preferred_port + max_attempts):
        # تخطي منافذ أجهزة البصمة تلقائياً ودون أي تدخل
        if port in FINGERPRINT_PORTS:
            continue

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            # محاولة ربط المنفذ لاختبار توفره
            result = sock.connect_ex(("127.0.0.1", port))
            if result != 0:
                # المنفذ متاح وغير مستخدم بواسطة أي برنامج آخر
                return port
    raise RuntimeError(f"تعذر العثور على منفذ متاح بعد فحص {max_attempts} منفذاً بدءاً من {preferred_port}")

def wait_for_server(url: str, timeout: int = 30) -> bool:
    """الانتظار حتى يبدأ الخادم بالاستجابة الفعلية قبل محاولة فتحه"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'SystemLauncher'})
            with urllib.request.urlopen(req, timeout=1) as response:
                if response.status in (200, 301, 302, 307, 308):
                    return True
        except Exception:
            time.sleep(1)
    return False

def clean_stale_lock():
    """حذف ملف القفل القديم لـ Next.js إذا كان معلقاً لمنع خطأ Unable to acquire lock"""
    lock_file = FRONTEND_DIR / ".next" / "dev" / "lock"
    if lock_file.exists():
        try:
            lock_file.unlink()
            print(" 🧹 تم تنظيف قفل Next.js القديم بنجاح.")
        except Exception:
            pass

def run_database_migrations():
    """تطبيق أي هجرات جديدة في قاعدة البيانات تلقائياً قبل تشغيل السيرفر"""
    print("\n[*] جاري التحقق من تحديثات قاعدة البيانات وتطبيق الجداول (Migrations)...")
    try:
        subprocess.run(
            [sys.executable, "manage.py", "migrate", "--noinput"],
            cwd=BACKEND_DIR,
            check=True
        )
        print(" [V] قاعدة البيانات محدثة وجاهزة بالكامل.")
    except Exception as e:
        print(f" [!] تنبيه أثناء فحص قاعدة البيانات: {e}")

def launch_desktop_window(target_url: str):
    """
    تشغيل واجهة النظام في نافذة تطبيق مستقلة بدون أشرطة تصفح أو علامات تبويب
    الأولوية: Electron أولاً -> نمط التطبيق المستقل Edge App Mode -> نمط Chrome App Mode
    """
    # 1. محاولة التشغيل عبر Electron إن كان متوفراً محلياً
    electron_executables = [
        ROOT_DIR / "node_modules" / ".bin" / "electron.cmd",
        ROOT_DIR / "node_modules" / "electron" / "dist" / "electron.exe",
    ]
    for el_exe in electron_executables:
        if el_exe.exists():
            try:
                env_electron = os.environ.copy()
                env_electron["APP_URL"] = target_url
                subprocess.Popen([str(el_exe), str(ROOT_DIR / "electron" / "main.js")], cwd=ROOT_DIR, env=env_electron)
                print(" ✓ تم فتح النظام في نافذة تطبيق سطح المكتب المستقلة (Electron Desktop Window).")
                return True
            except Exception:
                pass

    # 2. محاولة التشغيل كنافذة تطبيق مستقلة عبر المسارات الحقيقية لـ Microsoft Edge و Google Chrome
    standalone_candidates = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        "msedge",
        "chrome",
        "google-chrome",
    ]

    for candidate in standalone_candidates:
        try:
            if os.path.isabs(candidate) and not os.path.exists(candidate):
                continue
            subprocess.Popen([candidate, f"--app={target_url}"])
            print(f" ✓ تم فتح النظام في نافذة تطبيق مستقلة بدون شريط متصفح (Standalone App Mode).")
            return True
        except Exception:
            continue

    # 3. إذا لم يتوفر أي خيار آخر فقط
    webbrowser.open(target_url)
    return False

def main():
    print("=" * 60)
    print(" 🚀 جاري فحص بيئة التشغيل والمنافذ المتوفرة لجهاز العميل...")
    print("=" * 60)

    # تنظيف أي قفل قديم للواجهة
    clean_stale_lock()

    # تطبيق هجرات قاعدة البيانات تلقائياً
    run_database_migrations()

    # 1. تحديد منافذ حرة للباك إند والفرونت إند تلقائياً مع حماية منافذ البصمة
    backend_port = find_available_port(8000)
    frontend_port = find_available_port(3005)

    print(f"\n ✓ تم اعتماد منفذ الواجهة الخلفية (Backend) : {backend_port}")
    print(f" ✓ تم اعتماد منفذ الواجهة الأمامية (Frontend) : {frontend_port}")
    print(f" 🔒 تم عزل وتأمين منافذ البصمة الشبكية (4370, 4444, 8888, 5003) تلقائياً.")

    # 2. حقن المتغيرات البيئية للفرونت إند ليتعرف على منفذ الباك إند الجديد
    env = os.environ.copy()
    env["PORT"] = str(frontend_port)
    env["NEXT_PUBLIC_API_URL"] = f"http://127.0.0.1:{backend_port}/api"

    # 3. تشغيل الواجهة الخلفية (Django)
    backend_cmd = [
        sys.executable,
        "manage.py",
        "runserver",
        f"127.0.0.1:{backend_port}",
        "--noreload"
    ]
    print(f"\n[1/3] بدء تشغيل خادم Django على المنفذ {backend_port}...")
    backend_process = subprocess.Popen(backend_cmd, cwd=BACKEND_DIR, env=env)

    # الانتظار حتى يتأكد السكربت من جاهزية خادم Django
    print(" ⏳ التحقق من جاهزية خادم الباك إند...")
    wait_for_server(f"http://127.0.0.1:{backend_port}/api/docs", timeout=15)

    # 4. تشغيل الواجهة الأمامية (Bun / Next.js)
    runner = "bun" if subprocess.run(["where" if os.name == "nt" else "which", "bun"], capture_output=True).returncode == 0 else "npm"

    # استخدام npx next dev أو bun run dev مباشرة لتمرير المنفذ الصحيح
    has_valid_build = (FRONTEND_DIR / ".next" / "BUILD_ID").exists()
    if has_valid_build:
        if runner == "bun":
            frontend_cmd = ["bun", "x", "next", "start", "-p", str(frontend_port)]
        else:
            frontend_cmd = ["npx", "next", "start", "-p", str(frontend_port)]
        mode_desc = "الإنتاج السريع (Production Mode)"
    else:
        if runner == "bun":
            frontend_cmd = ["bun", "x", "next", "dev", "--webpack", "-p", str(frontend_port)]
        else:
            frontend_cmd = ["npx", "next", "dev", "--webpack", "-p", str(frontend_port)]
        mode_desc = "التشغيل الفوري (Development Mode)"

    print(f"[2/3] بدء تشغيل واجهة الكاشير بوضع {mode_desc} عبر {runner} على المنفذ {frontend_port}...")
    frontend_process = subprocess.Popen(frontend_cmd, cwd=FRONTEND_DIR, env=env)

    # 5. فتح واجهة النظام تلقائياً بعد أن تصبح جاهزة للرد في نافذة تطبيق مستقلة
    target_url = f"http://localhost:{frontend_port}"
    print(f"[3/3] جاري انتظار استجابة الواجهة وفتح نافذة تطبيق النظام: {target_url}...")
    
    # انتظار جاهزية الفرونت إند قبل فتح النافذة
    is_ready = wait_for_server(target_url, timeout=35)
    if not is_ready:
        print(" ⚠️ الواجهة تأخذ وقتاً أطول في الإقلاع، جاري فتح النافذة الآن...")

    # تشغيل نافذة التطبيق المستقلة دون التوجيه للمتصفح العادي
    launch_desktop_window(target_url)

    print("=" * 60)
    print(" ✅ النظام يعمل بنجاح الآن كشاشة نقطة بيع مستقلة! لا تغلق هذه النافذة أثناء العمل.")
    print("=" * 60)

    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nجاري إيقاف الخدمات...")
        backend_process.terminate()
        frontend_process.terminate()

if __name__ == "__main__":
    main()
