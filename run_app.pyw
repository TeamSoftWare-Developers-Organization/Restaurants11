import os
import sys
import time
import socket
import subprocess
import urllib.request
import webbrowser
from pathlib import Path

CREATE_NO_WINDOW = 0x08000000 if os.name == 'nt' else 0

# منافذ أجهزة البصمة البيومترية المحظور استخدامها لتطبيقات الويب لمنع التداخل والتعارض
FINGERPRINT_PORTS = {4370, 4444, 8888, 5003}

def resolve_project_root() -> tuple[Path, Path, Path]:
    """
    اكتشاف المسار الرئيسي الحقيقي للمشروع ومجلدي الباك إند والفرونت إند بمرونة وذكاء
    سواء تم تشغيل السكربت من الجذر، أو من مجلد فرعي، أو من اختصار سطح المكتب.
    """
    initial_dir = Path(__file__).resolve().parent

    candidates = [
        initial_dir,
        initial_dir.parent,
        initial_dir.parent.parent,
        Path.cwd(),
        Path.cwd().parent,
        Path(r"E:\restaurants"),
        Path(r"C:\restaurants"),
        Path(r"D:\restaurants"),
        Path.home() / "restaurants",
        Path.home() / "Documents" / "restaurants",
        Path.home() / "Desktop" / "restaurants"
    ]

    for cand in candidates:
        try:
            b_dir = cand / "restaurantsApi"
            f_dir = cand / "restaurant-frontend"
            if b_dir.is_dir() and f_dir.is_dir() and (b_dir / "manage.py").exists():
                return cand.resolve(), b_dir.resolve(), f_dir.resolve()
        except Exception:
            continue

    return initial_dir, initial_dir / "restaurantsApi", initial_dir / "restaurant-frontend"

ROOT_DIR, BACKEND_DIR, FRONTEND_DIR = resolve_project_root()
PG_DATA_DIR = ROOT_DIR / "pgsql" / "data"

def get_pythonw_executable(backend_dir: Path) -> str:
    """الحصول على بايثون الصامت pythonw الخاص بالبيئة الافتراضية إذا كان متوفراً"""
    venv_pyw = backend_dir / "venv" / "Scripts" / "pythonw.exe"
    if venv_pyw.exists():
        return str(venv_pyw)
    venv_py = backend_dir / "venv" / "Scripts" / "python.exe"
    if venv_py.exists():
        return str(venv_py)
    # بايثون النظام
    sys_pyw = sys.executable.replace("python.exe", "pythonw.exe")
    if os.path.exists(sys_pyw):
        return sys_pyw
    return sys.executable

def find_available_port(preferred_port: int, max_attempts: int = 50) -> int:
    """فحص المنفذ واختيار أول منفذ حر تلقائياً، مع تخطي منافذ أجهزة البصمة فوراً"""
    for port in range(preferred_port, preferred_port + max_attempts):
        if port in FINGERPRINT_PORTS:
            continue

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.3)
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise RuntimeError(f"تعذر العثور على منفذ متاح بعد فحص {max_attempts} منفذاً بدءاً من {preferred_port}")

def check_postgres_running() -> bool:
    """التحقق مما إذا كان خادم PostgreSQL يعمل على المنفذ القياسي 5432"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(('127.0.0.1', 5432)) == 0
    except Exception:
        return False

def wait_for_server(url: str, timeout: int = 35) -> bool:
    """الانتظار حتى يبدأ الخادم بالاستجابة الفعلية قبل محاولة فتحه"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'RestoERPDesktop'})
            with urllib.request.urlopen(req, timeout=1) as response:
                if response.status in (200, 301, 302, 307, 308):
                    return True
        except Exception:
            time.sleep(0.8)
    return False

def clean_stale_lock(frontend_dir: Path):
    """تنظيف أي قفل قديم لـ Next.js معلق لمنع رسائل الخطأ"""
    if not frontend_dir.is_dir():
        return
    lock_file = frontend_dir / ".next" / "dev" / "lock"
    if lock_file.exists():
        try:
            lock_file.unlink()
        except Exception:
            pass

def start_services() -> tuple[subprocess.Popen | None, subprocess.Popen | None, int]:
    """تشغيل خوادم PostgreSQL و Django و Next.js بصمت تام في الخلفية"""
    # 1. التأكد من تشغيل خادم PostgreSQL المحلي في حال استخدام النسخة المحمولة (Embedded)
    if not check_postgres_running():
        pg_ctl = ROOT_DIR / "pgsql" / "bin" / "pg_ctl.exe"
        if pg_ctl.exists() and PG_DATA_DIR.exists():
            try:
                subprocess.Popen(
                    [str(pg_ctl), "start", "-D", str(PG_DATA_DIR), "-w"],
                    creationflags=CREATE_NO_WINDOW
                )
                time.sleep(2)
            except Exception:
                pass

    # 2. تنظيف قفل الواجهة
    clean_stale_lock(FRONTEND_DIR)

    # 3. تحديد المنافذ تلقائياً لمنع أي تعارض على جهاز العميل
    backend_port = find_available_port(8000)
    frontend_port = find_available_port(3005)

    env = os.environ.copy()
    env["PORT"] = str(frontend_port)
    env["NEXT_PUBLIC_API_URL"] = f"http://127.0.0.1:{backend_port}/api"

    # 4. تشغيل الواجهة الخلفية (Django) بصمت تام عبر pythonw
    python_exe = get_pythonw_executable(BACKEND_DIR)
    backend_cmd = [
        python_exe,
        "manage.py",
        "runserver",
        f"127.0.0.1:{backend_port}",
        "--noreload"
    ]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=BACKEND_DIR,
        env=env,
        creationflags=CREATE_NO_WINDOW
    )

    # 5. تشغيل الواجهة الأمامية (Next.js) بصمت تام
    bundled_bun = ROOT_DIR / "bin" / "bun.exe"
    if bundled_bun.exists():
        runner = str(bundled_bun)
    elif subprocess.run(["where" if os.name == "nt" else "which", "bun"], capture_output=True).returncode == 0:
        runner = "bun"
    else:
        runner = "npm"

    has_valid_build = (FRONTEND_DIR / ".next" / "BUILD_ID").exists()
    if has_valid_build:
        if runner.endswith("bun.exe") or runner == "bun":
            frontend_cmd = [runner, "run", "start", "-p", str(frontend_port)]
        else:
            frontend_cmd = ["npx.cmd" if os.name == 'nt' else "npx", "next", "start", "-p", str(frontend_port)]
    else:
        if runner.endswith("bun.exe") or runner == "bun":
            frontend_cmd = [runner, "run", "dev", "--webpack", "-p", str(frontend_port)]
        else:
            frontend_cmd = ["npx.cmd" if os.name == 'nt' else "npx", "next", "dev", "--webpack", "-p", str(frontend_port)]

    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=FRONTEND_DIR,
        env=env,
        shell=(os.name == 'nt'),
        creationflags=CREATE_NO_WINDOW
    )

    # انتظار جاهزية السيرفرات
    wait_for_server(f"http://127.0.0.1:{backend_port}/api/docs", timeout=15)
    wait_for_server(f"http://localhost:{frontend_port}", timeout=35)

    return backend_proc, frontend_proc, frontend_port

def on_closed(backend_proc: subprocess.Popen | None, frontend_proc: subprocess.Popen | None):
    """إغلاق كافة العمليات الفرعية في الخلفية فور إغلاق نافذة البرنامج"""
    try:
        if backend_proc:
            backend_proc.terminate()
    except Exception:
        pass
    try:
        if frontend_proc:
            frontend_proc.terminate()
    except Exception:
        pass

    if os.name == 'nt':
        try:
            subprocess.run("taskkill /F /IM pythonw.exe >nul 2>&1", shell=True, check=False)
            subprocess.run("taskkill /F /IM bun.exe >nul 2>&1", shell=True, check=False)
            subprocess.run("taskkill /F /IM node.exe >nul 2>&1", shell=True, check=False)
        except Exception:
            pass

def launch_native_or_standalone(target_url: str, backend_proc, frontend_proc):
    """
    تشغيل واجهة البرنامج كنافذة تطبيق أصلية Native Desktop Window عبر pywebview (WebView2).
    وفي حال تعذر ذلك، التبديل بسلاسة إلى وضع التطبيق المستقل (Standalone App Window).
    """
    try:
        import webview

        window = webview.create_window(
            title="نظام إدارة المطاعم والمقاهي الذكي",
            url=target_url,
            width=1366,
            height=768,
            resizable=True,
            fullscreen=False,
            confirm_close=True,
            background_color='#070b14'
        )

        window.events.closed += lambda: on_closed(backend_proc, frontend_proc)
        webview.start(private_mode=False)
        return
    except Exception as e:
        # Fallback إلى نمط التطبيق المستقل (Standalone Window) عبر Edge أو Chrome
        standalone_candidates = [
            os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
            os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
            os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
            os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
            "msedge",
            "chrome"
        ]

        app_launched = False
        for candidate in standalone_candidates:
            try:
                if os.path.isabs(candidate) and not os.path.exists(candidate):
                    continue
                proc = subprocess.Popen([candidate, f"--app={target_url}"])
                app_launched = True
                proc.wait()
                on_closed(backend_proc, frontend_proc)
                break
            except Exception:
                continue

        if not app_launched:
            webbrowser.open(target_url)

if __name__ == "__main__":
    b_proc, f_proc, port = start_services()
    target = f"http://localhost:{port}"
    launch_native_or_standalone(target, b_proc, f_proc)
