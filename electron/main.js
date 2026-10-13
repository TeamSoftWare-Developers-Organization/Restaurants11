const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

// Define app constants
const FRONTEND_PORT = 3005;
const BACKEND_PORT = 8000;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;

// Ensure single instance lock
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
 * Check if an HTTP service is responding
 */
function checkServerReady(url, maxRetries = 25, intervalMs = 1000) {
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

            req.setTimeout(1500, () => {
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
 * Launch backend Django if not already running
 */
function startBackendIfNeeded() {
    checkServerReady(`${BACKEND_URL}/api/docs/`, 3, 500).then((isAlive) => {
        if (isAlive) {
            console.log('[Electron] Backend Django is already running on port ' + BACKEND_PORT);
            return;
        }

        const projectRoot = path.join(__dirname, '..');
        const apiDir = path.join(projectRoot, 'restaurantsApi');
        const venvPython = path.join(apiDir, 'venv', 'Scripts', 'python.exe');

        console.log('[Electron] Starting Django backend service...');
        try {
            backendProcess = spawn(venvPython, ['manage.py', 'runserver', `127.0.0.1:${BACKEND_PORT}`], {
                cwd: apiDir,
                shell: true,
                detached: false,
                stdio: 'ignore'
            });

            backendProcess.on('error', (err) => {
                console.error('[Electron] Failed to start Django:', err);
            });
        } catch (e) {
            console.error('[Electron] Error spawning backend process:', e);
        }
    });
}

/**
 * Launch frontend Next.js dev server if not already running
 */
function startFrontendIfNeeded() {
    checkServerReady(FRONTEND_URL, 3, 500).then((isAlive) => {
        if (isAlive) {
            console.log('[Electron] Frontend Next.js is already running on port ' + FRONTEND_PORT);
            return;
        }

        const projectRoot = path.join(__dirname, '..');
        const frontendDir = path.join(projectRoot, 'restaurant-frontend');

        console.log('[Electron] Starting Next.js frontend service...');
        try {
            frontendProcess = spawn('bun', ['run', 'dev'], {
                cwd: frontendDir,
                shell: true,
                detached: false,
                stdio: 'ignore'
            });

            frontendProcess.on('error', (err) => {
                console.error('[Electron] Failed to start frontend with bun, trying npm/node:', err);
            });
        } catch (e) {
            console.error('[Electron] Error spawning frontend process:', e);
        }
    });
}

/**
 * Create the main desktop application window
 */
function createWindow() {
    const iconPath = path.join(__dirname, '..', 'restaurant-frontend', 'public', 'icons', 'icon-512x512.png');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'RestoERP - Restaurant Management & POS Suite',
        icon: iconPath,
        backgroundColor: '#070b14',
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: true
        }
    });

    // Native window controls
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
    });

    // Loading Splash / Progress
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
                width: 48px;
                height: 48px;
                border: 4px solid #1e293b;
                border-top: 4px solid #2563eb;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 24px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h1 { font-size: 20px; font-weight: 800; margin: 0 0 8px 0; color: #ffffff; }
            p { font-size: 13px; color: #94a3b8; margin: 0; }
        </style>
    </head>
    <body>
        <div class="spinner"></div>
        <h1>RestoERP - نظام إدارة المطاعم ونقاط البيع</h1>
        <p>جاري تهيئة خدمات النظام وقواعد البيانات المحلية...</p>
    </body>
    </html>
    `;

    mainWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(splashHtml));

    // Wait for the servers to be online, then load frontend
    checkServerReady(FRONTEND_URL, 30, 1000).then((ready) => {
        if (ready && mainWindow) {
            mainWindow.loadURL(FRONTEND_URL);
        } else if (mainWindow) {
            mainWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(`
                <html dir="rtl" style="background:#070b14;color:#f8fafc;font-family:sans-serif;padding:40px;text-align:center;">
                <body>
                    <h2>تعذر الاتصال بخدمة الواجهة الأمامية</h2>
                    <p style="color:#ef4444;">يرجى التأكد من تشغيل خادم النظام (run_system.bat) ثم إعادة المحاولة.</p>
                    <button onclick="location.reload()" style="padding:10px 20px;font-size:14px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;">إعادة المحاولة</button>
                </body>
                </html>
            `));
        }
    });

    // Handle POS F11 Fullscreen Toggle
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

// IPC Handlers
ipcMain.handle('get-printers', async () => {
    if (!mainWindow) return [];
    return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle('print-silent', async (event, options = {}) => {
    if (!mainWindow) return { success: false, error: 'Window not available' };
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

// App Lifecycle
app.whenReady().then(() => {
    startBackendIfNeeded();
    startFrontendIfNeeded();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    // Terminate child processes on Windows
    if (backendProcess) {
        try { backendProcess.kill(); } catch (e) {}
    }
    if (frontendProcess) {
        try { frontendProcess.kill(); } catch (e) {}
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});
