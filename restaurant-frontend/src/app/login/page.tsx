'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { LayoutDashboard, Lock, User, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function LoginPage() {
    const { login, isLoading, isLoggedIn, error: storeError } = useAuthStore();
    const router = useRouter();
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setMounted(true);
        if (isLoggedIn) {
            router.push('/');
        }
    }, [isLoggedIn, router]);

    const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = await login(email, password);
        if (success) {
            router.push('/');
        } else {
            setError(storeError || 'البيانات غير صحيحة');
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-background p-4 transition-colors duration-500">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full"></div>

            {/* Theme Toggle - Corner */}
            <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="absolute top-6 left-6 p-2 bg-card dark:bg-card border border-gray-100 dark:border-gray-800/40 rounded-xl text-gray-500 hover:text-indigo-600 transition-all shadow-sm"
            >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="w-full max-w-[340px] relative z-10 transition-all">
                <div className="bg-card dark:bg-card/70 backdrop-blur-xl border border-gray-100 dark:border-gray-800/40 shadow-2xl rounded-2xl p-6">
                    {/* Header */}
                    <div className="flex flex-col items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 rotate-3">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">دخول النظام</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">أهلاً بك مجدداً</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 mr-1 uppercase tracking-widest">البريد الإلكتروني</label>
                            <div className="relative group">
                                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-9 bg-gray-50/50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800/40 rounded-lg pr-9 pl-4 text-[12px] font-bold outline-none focus:ring-1 focus:ring-indigo-600/20 transition-all placeholder:text-gray-300"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 mr-1 uppercase tracking-widest">كلمة المرور</label>
                            <div className="relative group">
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-9 bg-gray-50/50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800/40 rounded-lg pr-9 pl-4 text-[12px] font-bold outline-none focus:ring-1 focus:ring-indigo-600/20 transition-all placeholder:text-gray-300"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-rose-500 text-[10px] font-bold text-center bg-rose-50 dark:bg-rose-950/20 py-1 rounded-md">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-black text-[12px] shadow-lg shadow-indigo-600/15 transition-all active:scale-[0.97] flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'دخول للنظام'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center border-t border-gray-100 dark:border-gray-800/40 pt-4">
                        <p className="text-[9px] text-gray-300 dark:text-gray-600 font-bold uppercase tracking-tighter">نظام إدارة المطاعم الذكي v2.0</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
