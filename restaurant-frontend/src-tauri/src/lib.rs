use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

#[cfg(windows)]
use std::os::windows::io::AsRawHandle;
#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
use windows::core::w;
#[cfg(windows)]
use windows::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, HANDLE};
#[cfg(windows)]
use windows::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
};
#[cfg(windows)]
use windows::Win32::System::Threading::CreateMutexW;

const BACKEND_PORT: u16 = 8000;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(windows)]
struct JobGuard(HANDLE);

#[cfg(windows)]
unsafe impl Send for JobGuard {}
#[cfg(windows)]
unsafe impl Sync for JobGuard {}

#[cfg(windows)]
impl Drop for JobGuard {
    fn drop(&mut self) {
        unsafe {
            if !self.0.is_invalid() {
                let _ = CloseHandle(self.0);
            }
        }
    }
}

struct BackendState {
    pid: Mutex<Option<u32>>,
    #[cfg(windows)]
    job: Mutex<Option<JobGuard>>,
}

fn is_backend_ready(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    if let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(400)) {
        let _ = stream.set_read_timeout(Some(Duration::from_millis(800)));
        let _ = stream.set_write_timeout(Some(Duration::from_millis(800)));
        let req = b"GET /api/health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
        if stream.write_all(req).is_ok() {
            let mut buf = [0u8; 64];
            if let Ok(n) = stream.read(&mut buf) {
                let header = String::from_utf8_lossy(&buf[..n]);
                return header.contains("200");
            }
        }
    }
    false
}

fn resolve_sidecar_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    // 1. فحص مسار الموارد الرسمي المنسوخ بواسطة Tauri Bundle (Production NSIS)
    if let Ok(res_dir) = app.path().resource_dir() {
        for rel in [
            "resources/django_server/django_server.exe",
            "django_server/django_server.exe",
            "resources/django_server/django_server",
            "django_server/django_server",
        ] {
            let candidate = res_dir.join(rel);
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    // 2. فحص المجلد بجانب الملف التنفيذي مباشرة
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            for rel in [
                "resources/django_server/django_server.exe",
                "django_server/django_server.exe",
                "django_server.exe",
                "resto-server.exe",
            ] {
                let candidate = exe_dir.join(rel);
                if candidate.exists() {
                    return Some(candidate);
                }
            }
        }
    }

    // 3. فحص مجلد موارد التطوير المحلي
    let dev_candidates = [
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("django_server")
            .join("django_server.exe"),
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("..")
            .join("backend_dist")
            .join("django_server")
            .join("django_server.exe"),
    ];
    for dev_path in dev_candidates {
        if dev_path.exists() {
            return Some(dev_path);
        }
    }

    None
}

fn spawn_sidecar(app: &tauri::AppHandle) {
    if is_backend_ready(BACKEND_PORT) {
        return;
    }

    let Some(sidecar_path) = resolve_sidecar_path(app) else {
        eprintln!("[Tauri] لم يتم العثور على الملف التنفيذي للخادم django_server");
        return;
    };

    let work_dir = sidecar_path
        .parent()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));

    let mut cmd = Command::new(&sidecar_path);
    cmd.arg(BACKEND_PORT.to_string()).current_dir(work_dir);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if let Ok(child) = cmd.spawn() {
        let child_pid = child.id();
        let state = app.state::<BackendState>();
        if let Ok(mut pid_guard) = state.pid.lock() {
            *pid_guard = Some(child_pid);
        }

        #[cfg(windows)]
        unsafe {
            if let Ok(job_handle) = CreateJobObjectW(None, None) {
                let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
                info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                let info_size = std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32;
                let ok = SetInformationJobObject(
                    job_handle,
                    JobObjectExtendedLimitInformation,
                    &info as *const _ as *const _,
                    info_size,
                );
                if ok.is_ok() {
                    let proc_handle = HANDLE(child.as_raw_handle());
                    if AssignProcessToJobObject(job_handle, proc_handle).is_ok() {
                        if let Ok(mut job_guard) = state.job.lock() {
                            *job_guard = Some(JobGuard(job_handle));
                            return;
                        }
                    }
                }
                let _ = CloseHandle(job_handle);
            }
        }

        std::mem::forget(child);
    }
}

fn cleanup_backend(app: &tauri::AppHandle) {
    let state = app.state::<BackendState>();

    if let Ok(mut pid_guard) = state.pid.lock() {
        if let Some(pid) = pid_guard.take() {
            #[cfg(windows)]
            {
                let _ = Command::new("taskkill")
                    .args(["/PID", &pid.to_string(), "/T", "/F"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
            }
            #[cfg(not(windows))]
            {
                let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();
            }
        }
    }

    #[cfg(windows)]
    {
        let taken_job = state.job.lock().ok().and_then(|mut guard| guard.take());
        drop(taken_job);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    let _instance_mutex = unsafe {
        let handle = CreateMutexW(None, true, w!("Global\\SmartRestaurantPOS_SingleInstance_Mutex"));
        if GetLastError() == ERROR_ALREADY_EXISTS {
            eprintln!("[SingleInstance] Another instance is already running. Exiting silently.");
            return;
        }
        handle.ok()
    };

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackendState {
            pid: Mutex::new(None),
            #[cfg(windows)]
            job: Mutex::new(None),
        })
        .setup(|app| {
            let handle = app.handle().clone();
            spawn_sidecar(&handle);

            std::thread::spawn(move || {
                // انتظار استقرار السيرفر الخلفي المباشر السريع (~1.5 ثانية) قبل فتح النافذة الرئيسية
                for _ in 0..120 {
                    if is_backend_ready(BACKEND_PORT) {
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(150));
                }

                let main_url = tauri::WebviewUrl::App(PathBuf::new());
                if let Ok(main_window) = tauri::WebviewWindowBuilder::new(&handle, "main", main_url)
                    .title("نظام إدارة المطعم ونقاط البيع الذكي")
                    .inner_size(1366.0, 768.0)
                    .min_inner_size(1024.0, 700.0)
                    .center()
                    .resizable(true)
                    .maximized(true)
                    .theme(Some(tauri::Theme::Dark))
                    .build()
                {
                    let _ = main_window.set_focus();
                }

                if let Some(splash) = handle.get_webview_window("splash") {
                    let _ = splash.close();
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("خطأ أثناء تهيئة تطبيق Tauri");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            cleanup_backend(app_handle);
        }
    });
}
