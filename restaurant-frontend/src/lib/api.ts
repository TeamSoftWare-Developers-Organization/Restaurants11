import axios from 'axios';

/**
 * دالة ذكية لتحديد الرابط الأساسي للـ API:
 * إذا تم تحديد NEXT_PUBLIC_API_URL في ملف البيئة يتم اعتماده أولاً.
 * إذا لم يتم تحديده وكان التطبيق يعمل محلياً، يتم توجيهه إلى خادم Django المحلي (127.0.0.1:8000).
 * وفي باقي الحالات يتم استخدام الرابط السحابي على Render.
 */
export const getApiBaseUrl = (): string => {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && envUrl.trim() !== '') {
        return envUrl.trim();
    }

    if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        if (origin && !origin.startsWith('file:') && !origin.includes('undefined')) {
            return `${origin}/api`;
        }
    }

    return 'https://restaurants11.onrender.com/api';
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 60000, // 60s timeout to allow Render free tier instances to spin up
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const authStorage = localStorage.getItem('auth-storage');
            if (authStorage) {
                try {
                    const parsed = JSON.parse(authStorage);
                    const token = parsed.state?.token || parsed.token;
                    if (token) {
                        const bearerToken = `Bearer ${token}`;

                        // 1. Direct assignment
                        if (!config.headers) config.headers = {} as any;
                        (config.headers as any).Authorization = bearerToken;

                        // 2. set method for Axios 1.x
                        if (config.headers.set && typeof config.headers.set === 'function') {
                            config.headers.set('Authorization', bearerToken);
                        }

                        // 3. common headers for some configs
                        if ((config.headers as any).common) {
                            (config.headers as any).common['Authorization'] = bearerToken;
                        }

                        // Diagnostic log for the browser console (visible to user)
                        console.log(`🚀 [API] ${config.method?.toUpperCase()} ${config.url} | Token: ${token.substring(0, 10)}...`);
                    } else {
                        console.warn(`⚠️ [API] ${config.method?.toUpperCase()} ${config.url} | NO TOKEN FOUND in storage!`);
                    }
                } catch (e) {
                    console.error('Error parsing auth-storage', e);
                }
            }

            // Only attach SuperDev Device Verification Headers when accessing SuperDev routes
            // to prevent unnecessary CORS preflight errors on normal endpoints
            if (config.url?.includes('/superdev/')) {
                const devToken = localStorage.getItem('resto_superdev_device_token');
                if (devToken) {
                    if (!config.headers) config.headers = {} as any;
                    (config.headers as any)['X-SuperDev-Device-Token'] = devToken;
                }

                const machineId = localStorage.getItem('resto_client_machine_id');
                if (machineId) {
                    if (!config.headers) config.headers = {} as any;
                    (config.headers as any)['X-Device-Machine-Id'] = machineId;
                }
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
