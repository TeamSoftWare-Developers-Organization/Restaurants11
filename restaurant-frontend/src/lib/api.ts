import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
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
                    const token = parsed.state?.token || parsed.token; // Fallback if structure is different
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
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace('/api', '');
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default api;
