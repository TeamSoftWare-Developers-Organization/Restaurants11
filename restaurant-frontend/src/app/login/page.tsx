'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { LayoutDashboard, Lock, User, Sun, Moon, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function LoginPage() {
    const { login, isLoading, isLoggedIn, error: storeError } = useAuthStore();
    const router = useRouter();
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
        const success = await login(username, password);
        if (success) {
            router.push('/');
        } else {
            setError(storeError || 'بيانات الدخول غير صحيحة. يرجى التأكد من اسم المستخدم وكلمة المرور.');
        }
    };

    const handleFillAccount = (u: string, p: string) => {
        setUsername(u);
        setPassword(p);
        setError('');
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-background p-4 transition-colors duration-500" dir="rtl">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full"></div>

            {/* Theme Toggle - Corner */}
            <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                type="button"
                className="absolute top-6 left-6 p-2 bg-card dark:bg-card border border-gray-100 dark:border-gray-800/40 rounded-xl text-gray-500 hover:text-indigo-600 transition-all shadow-sm cursor-pointer"
            >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="w-full max-w-[360px] relative z-10 transition-all">
                <div className="bg-card dark:bg-card/70 backdrop-blur-xl border border-gray-100 dark:border-gray-800/40 shadow-2xl rounded-2xl p-6 sm:p-7">
                    {/* Header */}
                    <div className="flex flex-col items-center gap-3 mb-6">
                        <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 rotate-3">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">دخول النظام</h2>
                            <p className="text-[11px] text-gray-400 font-bold tracking-wide mt-0.5">أهلاً بك مجدداً في RestoERP</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 mr-1 uppercase tracking-wider">اسم المستخدم</label>
                            <div className="relative group">
                                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full h-10 bg-gray-50/50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800/50 rounded-xl pr-9 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                                    placeholder="أدخل اسم المستخدم"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 mr-1 uppercase tracking-wider">كلمة المرور</label>
                            <div className="relative group">
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-10 bg-gray-50/50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800/50 rounded-xl pr-9 pl-10 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                                    placeholder="••••••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                                    title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="text-rose-500 text-[11px] font-bold text-center bg-rose-50 dark:bg-rose-950/20 p-2 rounded-xl border border-rose-100 dark:border-rose-900/30 animate-in fade-in">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 cursor-pointer"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'دخول للنظام'
                            )}
                        </button>
                    </form>

                    {/* Quick Demo Switcher */}
                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/40 space-y-2">
                        <span className="text-[10px] text-gray-400 font-bold block text-center">حسابات الدخول السريعة:</span>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <button
                                type="button"
                                onClick={() => handleFillAccount('zafer', 'Password@123')}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-center transition cursor-pointer"
                            >
                                ⚡ ظافر (SuperDev)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFillAccount('admin', 'Password@123')}
                                className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold text-center transition cursor-pointer"
                            >
                                👤 المدير (Admin)
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 text-center border-t border-gray-100 dark:border-gray-800/40 pt-4">
                        <p className="text-[9px] text-gray-300 dark:text-gray-600 font-bold uppercase tracking-tighter">نظام إدارة المطاعم الذكي v2.0</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
