const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');

// إعداد المنافذ والروابط
const BACKEND_PORT = 8000;
const FRONTEND_DEV_PORT = 3005;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const FRONTEND_DEV_URL = `http://localhost:${FRONTEND_DEV_PORT}`;

let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;

// قفل تشغيل نسخة واحدة فقط من التطبيق (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

/**
 * فحص استجابة خادم الويب المحلي
 */
function checkServerReady(url, maxRetries = 35, intervalMs = 600) {
    return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
            attempts++;
            const req = http.get(url, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 500) {
                    resolve(true);
                } else if (attempts < maxRetries) {
                    setTimeout(check, intervalMs);
                } else {
                    resolve(false);
                }
            });

            req.on('error', () => {
                if (attempts < maxRetries) {
                    setTimeout(check, intervalMs);
                } else {
                    resolve(false);
                }
            });

            req.setTimeout(1200, () => {
                req.destroy();
                if (attempts < maxRetries) {
                    setTimeout(check, intervalMs);
                } else {
                    resolve(false);
                }
            });
        };
        check();
    });
}

/**
 * العثور على مسار ملف سيرفر Django التنفيذي
 */
function getBackendExecutablePath() {
    const isPackaged = app.isPackaged;
    const projectRoot = path.join(__dirname, '..');

    if (isPackaged) {
        // المسارات المحتملة بعد التحزيم داخل resources
        const candidatePaths = [
            path.join(process.resourcesPath, 'django_server', 'django_server.exe'),
            path.join(process.resourcesPath, 'backend_server', 'backend_server.exe'),
            path.join(process.resourcesPath, 'backend', 'django_server.exe'),
            path.join(process.resourcesPath, 'core', 'RestoCore', 'RestoCore.exe'),
            path.join(path.dirname(process.execPath), 'resources', 'django_server', 'django_server.exe'),
        ];

        for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }
    } else {
        // مسارات أثناء وضع التطوير
        const devCandidatePaths = [
            path.join(projectRoot, 'backend_dist', 'django_server', 'django_server.exe'),
            path.join(projectRoot, 'dist', 'django_server', 'django_server.exe'),
            path.join(projectRoot, 'ClosedSource_Release', 'core', 'RestoCore', 'RestoCore.exe'),
        ];

        for (const p of devCandidatePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }
    }

    return null;
}

/**
 * تشغيل خادم Django الخلفي
 */
function startBackend() {
    checkServerReady(`${BACKEND_URL}/api/docs`, 2, 400).then((isAlive) => {
        if (isAlive) {
            console.log('[Electron] سيرفر الباك إند يعمل مسبقاً على المنفذ ' + BACKEND_PORT);
            return;
        }

        const exePath = getBackendExecutablePath();

        if (exePath && fs.existsSync(exePath)) {
            console.log('[Electron] تشغيل سيرفر الباك إند المستقل من:', exePath);
            try {
                backendProcess = spawn(exePath, [String(BACKEND_PORT)], {
                    cwd: path.dirname(exePath),
                    shell: false,
                    windowsHide: true,
                    stdio: 'ignore'
                });

                backendProcess.on('error', (err) => {
                    console.error('[Electron] فشل تشغيل سيرفر الباك إند التنفيذي:', err);
                });
            } catch (err) {
                console.error('[Electron] استثناء أثناء تشغيل سيرفر الباك إند:', err);
            }
        } else {
            // وضع التطوير إذا لم يتم بناء الملف التنفيذي بعد
            console.log('[Electron] لم يتم العثور على ملف تنفيذي للباك إند، محاولة تشغيل بيئة بايثون الافتراضية...');
            const projectRoot = path.join(__dirname, '..');
            const apiDir = path.join(projectRoot, 'restaurantsApi');
            const venvPythonW = path.join(apiDir, 'venv', 'Scripts', 'pythonw.exe');
            const venvPython = path.join(apiDir, 'venv', 'Scripts', 'python.exe');
            const pythonExe = fs.existsSync(venvPythonW) ? venvPythonW : (fs.existsSync(venvPython) ? venvPython : 'python');

            const serverScript = fs.existsSync(path.join(apiDir, 'server.py')) 
                ? path.join(apiDir, 'server.py') 
                : 'manage.py';

            const serverArgs = serverScript.endsWith('server.py')
                ? [serverScript, String(BACKEND_PORT)]
                : ['manage.py', 'runserver', `127.0.0.1:${BACKEND_PORT}`];

            try {
                backendProcess = spawn(pythonExe, serverArgs, {
                    cwd: apiDir,
                    shell: false,
                    windowsHide: true,
                    stdio: 'ignore'
                });

                backendProcess.on('error', (err) => {
                    console.error('[Electron] خطأ في تشغيل بايثون:', err);
                });
            } catch (e) {
                console.error('[Electron] تعذر إطلاق عملية الباك إند:', e);
            }
        }
    });
}

/**
 * تشغيل خادم الفرونت إند في وضع التطوير فقط إن لزم
 */
function startFrontendDevIfNeeded() {
    if (app.isPackaged) return; // في النسخة الإنتاجية يتم تقديم الواجهة مباشرة عبر Django أو الملفات المحلية

    checkServerReady(FRONTEND_DEV_URL, 2, 400).then((isAlive) => {
        if (isAlive) {
            console.log('[Electron] خادم Next.js التطويري يعمل مسبقاً على المنفذ ' + FRONTEND_DEV_PORT);
            return;
        }

        const projectRoot = path.join(__dirname, '..');
        const frontendDir = path.join(projectRoot, 'restaurant-frontend');
        const candidateBuns = [
            path.join(projectRoot, 'bin', 'bun.exe'),
            path.join(process.env.USERPROFILE || '', '.bun', 'bin', 'bun.exe'),
            'bun'
        ];

        let bunExe = candidateBuns.find(p => p === 'bun' || fs.existsSync(p)) || 'npm';

        try {
            const args = bunExe.includes('npm') ? ['run', 'dev'] : ['run', 'dev'];
            frontendProcess = spawn(bunExe, args, {
                cwd: frontendDir,
                shell: false,
                windowsHide: true,
                stdio: 'ignore'
            });

            frontendProcess.on('error', (err) => {
                console.error('[Electron] خطأ في تشغيل الواجهة التطويرية:', err);
            });
        } catch (e) {
            console.error('[Electron] تعذر إطلاق خادم التطوير للفرونت إند:', e);
        }
    });
}

/**
 * إنشاء نافذة سطح المكتب الرئيسية
 */
function createWindow() {
    const iconCandidates = [
        path.join(__dirname, 'icon.ico'),
        path.join(__dirname, '..', 'restaurant-frontend', 'public', 'icons', 'icon-512x512.png'),
        path.join(__dirname, '..', 'restaurant-frontend', 'public', 'favicon.ico')
    ];
    const iconPath = iconCandidates.find(p => fs.existsSync(p)) || undefined;

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'RestoERP - Restaurant Management & POS Suite',
        icon: iconPath,
        backgroundColor: '#070b14',
        show: false,
        frame: false,
        autoHideMenuBar: true,
        menuBarVisible: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: true
        }
    });

    Menu.setApplicationMenu(null);
    mainWindow.setMenuBarVisibility(false);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
    });

    // شاشة الانتظار الحديثة (Loading Splash)
    const splashHtml = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
        <meta charset="utf-8">
        <style>
            body {
                margin: 0;
                background-color: #070b14;
                color: #f8fafc;
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                user-select: none;
            }
            .spinner {
                width: 52px;
                height: 52px;
                border: 4px solid #1e293b;
                border-top: 4px solid #2563eb;
                border-radius: 50%;
                animation: spin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                margin-bottom: 24px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h1 { font-size: 22px; font-weight: 800; margin: 0 0 10px 0; color: #ffffff; letter-spacing: -0.5px; }
            p { font-size: 14px; color: #94a3b8; margin: 0; }
        </style>
    </head>
    <body>
        <div class="spinner"></div>
        <h1>RestoERP - نظام إدارة المطاعم والمقاهي</h1>
        <p>جاري تشغيل خوادم النظام وقواعد البيانات المحلية تلقائياً...</p>
    </body>
    </html>
    `;

    mainWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(splashHtml));

    // تحديد الرابط المستهدف: خادم Django الموحد (الذي يقدم الواجهة + API معاً بدون مشاكل CORS)
    // أو منفذ الفرونت إند التطويري إذا كان يعمل
    const loadApp = async () => {
        if (!app.isPackaged) {
            const devReady = await checkServerReady(FRONTEND_DEV_URL, 6, 500);
            if (devReady && mainWindow) {
                console.log('[Electron] توجيه النافذة نحو خادم Next.js التطويري:', FRONTEND_DEV_URL);
                mainWindow.loadURL(FRONTEND_DEV_URL);
                return;
            }
        }

        // انتظار استقرار خادم الباك إند (الذي يقدم الواجهة والـ API)
        const backendReady = await checkServerReady(`${BACKEND_URL}/api/docs`, 40, 600);
        if (backendReady && mainWindow) {
            console.log('[Electron] توجيه النافذة نحو خادم الإنتاج الموحد:', BACKEND_URL);
            mainWindow.loadURL(BACKEND_URL);
        } else if (mainWindow) {
            // محاولة التحميل من ملفات Static Export المحلية كخيار إضافي
            const localOutHtml = path.join(__dirname, '..', 'restaurant-frontend', 'out', 'index.html');
            if (fs.existsSync(localOutHtml)) {
                mainWindow.loadFile(localOutHtml);
            } else {
                mainWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(`
                    <html dir="rtl" style="background:#070b14;color:#f8fafc;font-family:sans-serif;padding:40px;text-align:center;">
                    <body>
                        <h2 style="color:#ef4444;">تعذر بدء تشغيل خدمة النظام</h2>
                        <p style="color:#94a3b8;">يرجى التأكد من اكتمال بناء النظام أو تشغيل السيرفر يدوياً.</p>
                        <button onclick="location.reload()" style="margin-top:16px;padding:12px 24px;font-size:14px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;">إعادة المحاولة</button>
                    </body>
                    </html>
                `));
            }
        }
    };

    loadApp();

    // اختصار F11 للشاشة الكاملة
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11' && input.type === 'keyDown') {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
            event.preventDefault();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// معالجات IPC لطباعة الفواتير وأزرار النافذة
ipcMain.handle('get-printers', async () => {
    if (!mainWindow) return [];
    return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle('print-silent', async (event, options = {}) => {
    if (!mainWindow) return { success: false, error: 'النافذة غير متاحة' };
    try {
        const defaultOptions = {
            silent: true,
            printBackground: true,
            deviceName: options.deviceName || '',
            margins: { marginType: 'none' }
        };
        const printSuccess = await new Promise((resolve) => {
            mainWindow.webContents.print(defaultOptions, (success, errorType) => {
                resolve({ success, errorType });
            });
        });
        return printSuccess;
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('toggle-fullscreen', () => {
    if (mainWindow) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
        return mainWindow.isFullScreen();
    }
    return false;
});

ipcMain.handle('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.handle('window-close', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.handle('get-machine-id', () => {
    try {
        const netInterfaces = os.networkInterfaces();
        let mac = '';
        for (const key of Object.keys(netInterfaces)) {
            for (const item of netInterfaces[key]) {
                if (!item.internal && item.mac && item.mac !== '00:00:00:00:00:00') {
                    mac = item.mac;
                    break;
                }
            }
            if (mac) break;
        }
        const str = `${os.hostname()}-${mac || os.platform()}`;
        const hash = crypto.createHash('sha256').update(str).digest('hex').substring(0, 16).toUpperCase();
        return `${hash.substring(0,4)}-${hash.substring(4,8)}-${hash.substring(8,12)}-${hash.substring(12,16)}`;
    } catch (e) {
        return 'CLIENT-DESKTOP';
    }
});

// إيقاف جميع العمليات التابعة بأمان تام
function killChildProcesses() {
    if (backendProcess && backendProcess.pid) {
        try {
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', backendProcess.pid.toString(), '/f', '/t'], { windowsHide: true, shell: false });
            } else {
                backendProcess.kill();
            }
        } catch (e) {}
        backendProcess = null;
    }

    if (frontendProcess && frontendProcess.pid) {
        try {
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', frontendProcess.pid.toString(), '/f', '/t'], { windowsHide: true, shell: false });
            } else {
                frontendProcess.kill();
            }
        } catch (e) {}
        frontendProcess = null;
    }
}

// دورة حياة التطبيق (App Lifecycle)
app.whenReady().then(() => {
    startBackend();
    startFrontendDevIfNeeded();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('before-quit', () => {
    killChildProcesses();
});

app.on('window-all-closed', () => {
    killChildProcesses();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
