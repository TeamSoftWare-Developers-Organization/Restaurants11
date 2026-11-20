import axios from 'axios';

/**
 * دالة ذكية لتحديد الرابط الأساسي للـ API:
 * إذا تم تحديد NEXT_PUBLIC_API_URL في ملف البيئة يتم اعتماده أولاً.
 * إذا لم يتم تحديده وكان التطبيق يعمل محلياً، يتم توجيهه إلى خادم Django المحلي (127.0.0.1:8000).
 * وفي باقي الحالات يتم استخدام الرابط السحابي على Render.
 */
export const getApiBaseUrl = (): string => {
    if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        const protocol = window.location.protocol;
        const href = window.location.href;

        // بيئة سطح المكتب (Tauri / Electron) أو الخادم المحلي: توجيه مباشر نحو السيرفر المحلي دائماً
        // ملاحظة: في محرك Chromium تكون قيمة origin لبروتوكول file:// هي النص 'null'، وفي Tauri تكون tauri.localhost
        const isTauri =
            protocol === 'tauri:' ||
            origin.includes('tauri.localhost') ||
            '__TAURI_INTERNALS__' in window;

        if (
            isTauri ||
            protocol === 'file:' ||
            origin === 'null' ||
            href.startsWith('file:') ||
            (origin && (origin.includes('127.0.0.1') || origin.includes('localhost')))
        ) {
            if (origin && origin.includes(':8000')) {
                return `${origin}/api`;
            }
            return 'http://127.0.0.1:8000/api';
        }

        // إذا كان يعمل على خادم ويب حقيقي (نطاق سحابي مخصص)، استخدم نفس الأصل
        if (origin && origin !== 'null' && !origin.includes('undefined')) {
            return `${origin}/api`;
        }
    }

    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && envUrl.trim() !== '') {
        return envUrl.trim();
    }

    return 'http://127.0.0.1:8000/api';
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
    (config) => {
        config.baseURL = getApiBaseUrl();
        if (typeof window !== 'undefined') {
            const authStorage = localStorage.getItem('auth-storage');
            if (authStorage) {
                try {
                    const parsed = JSON.parse(authStorage);
                    const token = parsed.state?.token || parsed.token;
                    switch (Boolean(token)) {
                        case true: {
                            const bearerToken = `Bearer ${token}`;

                            // 1. Direct assignment
                            switch (Boolean(!config.headers)) {
                                case true:
                                    config.headers = {} as any;
                                    break;
                                default:
                                    break;
                            }
                            (config.headers as any).Authorization = bearerToken;

                            // 2. set method for Axios 1.x
                            switch (Boolean(typeof config.headers?.set === 'function')) {
                                case true:
                                    config.headers.set('Authorization', bearerToken);
                                    break;
                                default:
                                    break;
                            }

                            // 3. common headers for some configs
                            switch (Boolean((config.headers as any)?.common)) {
                                case true:
                                    (config.headers as any).common['Authorization'] = bearerToken;
                                    break;
                                default:
                                    break;
                            }

                            // Diagnostic log for the browser console (visible to user)
                            console.log(`🚀 [API] ${config.method?.toUpperCase()} ${config.url} | Token: ${token.substring(0, 10)}...`);
                            break;
                        }
                        default:
                            console.warn(`⚠️ [API] ${config.method?.toUpperCase()} ${config.url} | NO TOKEN FOUND in storage!`);
                            break;
                    }
                } catch (e) {
                    console.error('Error parsing auth-storage', e);
                }
            }

            // Only attach SuperDev Device Verification Headers when accessing SuperDev routes
            // to prevent unnecessary CORS preflight errors on normal endpoints
            switch (Boolean(config.url?.includes('/superdev/'))) {
                case true: {
                    const devToken = localStorage.getItem('resto_superdev_device_token');
                    switch (Boolean(devToken)) {
                        case true:
                            switch (Boolean(!config.headers)) {
                                case true:
                                    config.headers = {} as any;
                                    break;
                                default:
                                    break;
                            }
                            (config.headers as any)['X-SuperDev-Device-Token'] = devToken;
                            break;
                        default:
                            break;
                    }

                    const machineId = localStorage.getItem('resto_client_machine_id');
                    switch (Boolean(machineId)) {
                        case true:
                            switch (Boolean(!config.headers)) {
                                case true:
                                    config.headers = {} as any;
                                    break;
                                default:
                                    break;
                            }
                            (config.headers as any)['X-Device-Machine-Id'] = machineId;
                            break;
                        default:
                            break;
                    }
                    break;
                }
                default:
                    break;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Optional: Add a response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Check if we're already on the login page to avoid loops
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                console.error('🔥 [API] 401 Unauthorized! Clearing session...');
                localStorage.removeItem('auth-storage');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const getFullUrl = (path: string | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = getApiBaseUrl().replace('/api', '');
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default api;
