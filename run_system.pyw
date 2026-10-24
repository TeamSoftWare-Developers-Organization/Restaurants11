import os
import sys
import time
import socket
import subprocess
import webbrowser
from pathlib import Path

# إعداد المسارات الأساسية
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "restaurantsApi"
FRONTEND_DIR = ROOT_DIR / "restaurant-frontend"

# علم منع ظهور نافذة CMD نهائياً في نظام ويندوز
CREATE_NO_WINDOW = 0x08000000 if os.name == 'nt' else 0

def find_available_port(preferred_port: int, max_attempts: int = 50) -> int:
    """البحث الصامت عن أول منفذ حر"""
    for port in range(preferred_port, preferred_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.4)
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise RuntimeError(f"تعذر العثور على منفذ متاح بدءاً من {preferred_port}")

def main():
    # توجيه المخرجات لملف سجل داخلي بدلاً من شاشة CMD
    log_file_path = ROOT_DIR / "system_runtime.log"
    log_file = open(log_file_path, "a", encoding="utf-8")

    # 1. تحديد المنافذ المتاحة تلقائياً
    backend_port = find_available_port(8000)
    frontend_port = find_available_port(3005)

    env = os.environ.copy()
    env["PORT"] = str(frontend_port)
    env["NEXT_PUBLIC_API_URL"] = f"http://127.0.0.1:{backend_port}/api"

    # 2. تشغيل الواجهة الخلفية (Django) عبر pythonw الصامت تماماً
    venv_pythonw = BACKEND_DIR / "venv" / "Scripts" / "pythonw.exe"
    venv_python = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
    if venv_pythonw.exists():
        python_exe = str(venv_pythonw)
    elif venv_python.exists():
        python_exe = str(venv_python)
    else:
        python_exe = sys.executable
        if "python.exe" in python_exe.lower():
            python_exe = python_exe.lower().replace("python.exe", "pythonw.exe")

    backend_cmd = [python_exe, "manage.py", "runserver", f"127.0.0.1:{backend_port}", "--noreload"]
    subprocess.Popen(
        backend_cmd,
        cwd=BACKEND_DIR,
        env=env,
        stdout=log_file,
        stderr=log_file,
        creationflags=CREATE_NO_WINDOW
    )

    # انتظار ثانيتين لضمان استقرار الباك إند
    time.sleep(2)

    # 3. تشغيل الواجهة الأمامية (Bun أو NPM) في الخلفية بدون نوافذ
    bundled_bun = ROOT_DIR / "bin" / "bun.exe"
    user_bun = Path(os.environ.get("USERPROFILE", "")) / ".bun" / "bin" / "bun.exe"
    if bundled_bun.exists():
        runner = str(bundled_bun)
    elif user_bun.exists():
        runner = str(user_bun)
    elif subprocess.run(["where" if os.name == "nt" else "which", "bun"], capture_output=True).returncode == 0:
        runner = "bun"
    else:
        runner = "npm"

    frontend_cmd = f'"{runner}" run start -p {frontend_port}' if (FRONTEND_DIR / ".next").exists() else f'"{runner}" run dev -p {frontend_port}'

    subprocess.Popen(
        frontend_cmd,
        cwd=FRONTEND_DIR,
        env=env,
        shell=True,
        stdout=log_file,
        stderr=log_file,
        creationflags=CREATE_NO_WINDOW
    )

    # انتظار جاهزية السيرفر
    time.sleep(3)

    # 4. فتح واجهة النظام مباشرة كنافذة تطبيق مستقلة بدون شريط متصفح
    target_url = f"http://localhost:{frontend_port}"
    opened = False
    for browser_cmd in ["msedge", "chrome", "google-chrome"]:
        try:
            subprocess.Popen([browser_cmd, f"--app={target_url}"], creationflags=CREATE_NO_WINDOW)
            opened = True
            break
        except FileNotFoundError:
            continue

    if not opened:
        webbrowser.open(target_url)

if __name__ == "__main__":
    main()
