import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

import { UserPermissions } from '@/services/employeeService';

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    permissions?: UserPermissions;
}

export interface Shift {
    id: number;
    cashier_id: number;
    start_time: string;
    end_time: string | null;
    opening_balance: number;
    closing_balance: number | null;
    status: 'open' | 'closed';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    error: string | null;
    activeShift: Shift | null;
    login: (username: string, password?: string) => Promise<boolean>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    hasPermission: (key: string) => boolean;
    setActiveShift: (shift: Shift | null) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isLoggedIn: false,
            isLoading: false,
            error: null,
            activeShift: null,
            login: async (username: string, password?: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/login/', { 
                        username: username.trim(),
                        email: username.trim(),
                        password 
                    });
                    const { access } = response.data;

                    set({ token: access, isLoggedIn: true });

                    // Fetch user info with the new token
                    const userResponse = await api.get('/auth/me/');
                    const profile = userResponse.data.employee_profile;

                    set({
                        user: {
                            id: profile.id,
                            email: profile.user.email,
                            first_name: profile.user.first_name,
                            last_name: profile.user.last_name,
                            role: profile.role,
                            permissions: profile.permissions || {}
                        },
                        isLoading: false
                    });
                    return true;
                } catch (err: any) {
                    set({
                        isLoading: false,
                        error: err.response?.data?.message || 'بيانات الدخول غير صحيحة. يرجى التأكد من اسم المستخدم وكلمة المرور.'
                    });
                    return false;
                }
            },
            logout: () => set({ user: null, token: null, isLoggedIn: false, error: null }),
            checkAuth: async () => {
                try {
                    const response = await api.get('/auth/me/');
                    const profile = response.data?.employee_profile;
                    if (profile) {
                        set({
                            user: {
                                id: profile.id,
                                email: profile.user?.email || '',
                                first_name: profile.user?.first_name || '',
                                last_name: profile.user?.last_name || '',
                                role: profile.role || 'manager',
                                permissions: profile.permissions || {}
                            },
                            isLoggedIn: true
                        });
                    }
                } catch (err) {
                    // Do not wipe credentials on temporary error
                }
            },
            hasPermission: (key: string) => {
                const user = get().user;
                // If user is not yet loaded, default to true so options don't vanish
                if (!user) return true;
                // Managers and Admins have full access to everything
                if (user.role === 'manager' || user.role === 'admin' || (user as any).is_superuser) return true;
                // Check explicit boolean permission if defined
                if (user.permissions && typeof user.permissions[key] === 'boolean') {
                    return user.permissions[key];
                }
                return true;
            },
            setActiveShift: (shift) => set({ activeShift: shift }),
            clearShift: () => set({ activeShift: null }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
