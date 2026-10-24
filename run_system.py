import os
import sys
import time
import socket
import subprocess
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

def main():
    print("=" * 60)
    print(" 🚀 جاري فحص بيئة التشغيل والمنافذ المتوفرة لجهاز العميل...")
    print("=" * 60)

    # 1. تحديد منافذ حرة للباك إند والفرونت إند تلقائياً مع حماية منافذ البصمة
    backend_port = find_available_port(8000)
    frontend_port = find_available_port(3005)

    print(f" ✓ تم اعتماد منفذ الواجهة الخلفية (Backend) : {backend_port}")
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

    # انتظار ثانيتين للتأكد من قيام السيرفر
    time.sleep(2)

    # 4. تشغيل الواجهة الأمامية (Bun / Next.js)
    # فحص الأداة المتوفرة (Bun أولاً ثم NPM)
    runner = "bun" if subprocess.run(["where" if os.name == "nt" else "which", "bun"], capture_output=True).returncode == 0 else "npm"
    frontend_cmd = [runner, "run", "start", "-p", str(frontend_port)] if (FRONTEND_DIR / ".next").exists() else [runner, "run", "dev", "-p", str(frontend_port)]

    print(f"[2/3] بدء تشغيل واجهة الكاشير عبر {runner} على المنفذ {frontend_port}...")
    frontend_process = subprocess.Popen(frontend_cmd, cwd=FRONTEND_DIR, env=env)

    # 5. فتح واجهة النظام تلقائياً في شاشة تطبيق مستقلة (App Mode)
    target_url = f"http://localhost:{frontend_port}"
    print(f"[3/3] جاري فتح نافذة النظام: {target_url}\n")
    time.sleep(3)

    # محاولة فتح التطبيق عبر Edge أو Chrome بوضع التطبيق المستقل (Standalone PWA)
    opened = False
    for browser_cmd in ["msedge", "chrome", "google-chrome"]:
        try:
            subprocess.Popen([browser_cmd, f"--app={target_url}"])
            opened = True
            break
        except FileNotFoundError:
            continue

    if not opened:
        webbrowser.open(target_url)

    print("=" * 60)
    print(" ✅ النظام يعمل بنجاح الآن! لا تغلق هذه النافذة أثناء العمل.")
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
