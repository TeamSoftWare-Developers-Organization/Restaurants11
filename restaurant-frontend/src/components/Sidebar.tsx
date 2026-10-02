'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
    Home,
    Truck,
    LayoutDashboard,
    ChefHat,
    BadgeCheck,
    Snowflake,
    Building2,
    Moon,
    Sun,
    LogOut,
    ChevronLeft,
    ChevronRight,
    User,
    ShoppingBag,
    Table as TableIcon,
    Wallet,
    ReceiptText,
    Banknote,
    Settings,
    Menu as MenuIcon,
    CookingPot,
    ShoppingCart,
    Fingerprint,
    X
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';

const links = [
    { label: 'لوحة التحكم', icon: Home, href: '/', color: 'indigo', perm: 'dashboard' },
    { label: 'نقطة البيع', icon: ShoppingBag, href: '/pos', color: 'emerald', perm: 'pos' },
    { label: 'الموظفون والصلاحيات', icon: User, href: '/employees', color: 'blue', perm: 'employees' },
    { label: 'حضور وبصمة الموظفين', icon: Fingerprint, href: '/attendance', color: 'cyan' },
    { label: 'المخزون', icon: Snowflake, href: '/inventory', color: 'amber', perm: 'inventory' },
    { label: 'دليل الموردين', icon: Building2, href: '/suppliers', color: 'blue', perm: 'inventory' },
    { label: 'فواتير المشتريات', icon: ShoppingCart, href: '/purchases', color: 'emerald', perm: 'inventory' },
    { label: 'قائمة الطعام', icon: ChefHat, href: '/menu', color: 'violet', perm: 'menu' },
    { label: 'وصفات الطعام', icon: CookingPot, href: '/recipes', color: 'amber', perm: 'recipes' },
    { label: 'الطلبات', icon: Truck, href: '/orders', color: 'rose', perm: 'orders' },
    { label: 'الطاولات', icon: TableIcon, href: '/tables', color: 'cyan', perm: 'tables' },
    { label: 'الحجوزات', icon: BadgeCheck, href: '/reservations', color: 'sky', perm: 'reservations' },
    { label: 'المدفوعات', icon: Building2, href: '/payments', color: 'orange', perm: 'payments' },
    { label: 'الخزينة', icon: Wallet, href: '/treasury', color: 'indigo', perm: 'treasury' },
    { label: 'المصروفات', icon: ReceiptText, href: '/expenses', color: 'rose', perm: 'expenses' },
    { label: 'المرتبات', icon: Banknote, href: '/salaries', color: 'emerald', perm: 'salaries' },
    { label: 'الإعدادات', icon: Settings, href: '/settings', color: 'slate', perm: 'settings' }
];

const colorVariants: Record<string, string> = {
    indigo: 'bg-indigo-600 text-white shadow-indigo-600/20',
    emerald: 'bg-emerald-600 text-white shadow-emerald-600/20',
    blue: 'bg-blue-600 text-white shadow-blue-600/20',
    amber: 'bg-amber-600 text-white shadow-amber-600/20',
    violet: 'bg-violet-600 text-white shadow-violet-600/20',
    rose: 'bg-rose-600 text-white shadow-rose-600/20',
    sky: 'bg-sky-600 text-white shadow-sky-600/20',
    orange: 'bg-orange-600 text-white shadow-orange-600/20',
    cyan: 'bg-cyan-600 text-white shadow-cyan-600/20',
    slate: 'bg-slate-700 text-white shadow-slate-700/20'
};

const hoverVariants: Record<string, string> = {
    indigo: 'hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10',
    emerald: 'hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10',
    blue: 'hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10',
    amber: 'hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10',
    violet: 'hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10',
    rose: 'hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10',
    sky: 'hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/10',
    orange: 'hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10',
    cyan: 'hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/10',
    slate: 'hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/10'
};

interface SidebarProps {
    className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const logout = useAuthStore((state) => state.logout);
    const {
        isSidebarCollapsed,
        toggleSidebar,
        isMobileMenuOpen,
        toggleMobileMenu,
        setMobileMenuOpen
    } = useUIStore();
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const { token, user, checkAuth } = useAuthStore.getState();
        if (token && (!user || !user.role)) {
            checkAuth();
        }
    }, []);

    // Close mobile menu whenever pathname changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname, setMobileMenuOpen]);

    const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
    const hasPermission = useAuthStore((state) => state.hasPermission);

    // Filter links based on current user permissions
    const visibleLinks = links.filter((link) => !link.perm || hasPermission(link.perm));
    // Safety fallback: ensure sidebar options are always displayed and never empty
    const displayLinks = visibleLinks.length > 0 ? visibleLinks : links;

    const { settings } = useSettingsStore();
    const getFullLogoUrl = (path?: string) => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const baseApi = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
        const baseUrl = baseApi.replace(/\/api\/?$/, '');
        return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    const logoUrl = getFullLogoUrl(settings?.logo);

    return (
        <>
            {/* 1. Mobile Top Header (< lg screens) */}
            <header className={`lg:hidden sticky top-0 z-40 w-full bg-card/95 dark:bg-card/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/60 px-3.5 sm:px-5 py-2.5 flex items-center justify-between shadow-xs transition-colors duration-200 ${className || ''}`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                        onClick={toggleMobileMenu}
                        type="button"
                        className="p-2 -mr-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer active:scale-95"
                        aria-label="القائمة الرئيسية"
                    >
                        <MenuIcon className="w-5 h-5" />
                    </button>

                    <Link href="/" className="flex items-center gap-2 min-w-0">
                        {logoUrl ? (
                            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs shrink-0 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center p-0.5">
                                <img src={logoUrl} alt={settings?.name || 'شعار المطعم'} className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-xs shrink-0">
                                <LayoutDashboard className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <span className="text-sm font-black text-gray-900 dark:text-white truncate">
                            {settings?.name || 'إدارة المطعم'}
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Link
                        href="/pos"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40 text-xs font-black transition-all active:scale-95"
                    >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline text-[11px]">نقطة البيع</span>
                    </Link>

                    <button
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        type="button"
                        className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        aria-label="تبديل المظهر"
                    >
                        {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    </button>
                </div>
            </header>

            {/* 2. Mobile Drawer Backdrop (< lg screens) */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* 3. Mobile Navigation Drawer (< lg screens) */}
            <div
                className={`lg:hidden fixed inset-y-0 right-0 w-72 max-w-[85vw] bg-card dark:bg-card border-l border-gray-100 dark:border-gray-800 z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
                    isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/60 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {logoUrl ? (
                            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-xs shrink-0 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center p-0.5">
                                <img src={logoUrl} alt={settings?.name || 'شعار المطعم'} className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 rotate-3 shrink-0">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-sm font-black text-gray-900 dark:text-white leading-tight truncate">
                                {settings?.name || 'إدارة المطعم'}
                            </h2>
                            <span className="text-[10px] text-gray-400 font-bold block truncate">
                                {settings?.bio || 'نظام إدارة المطاعم'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        type="button"
                        className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        aria-label="إغلاق القائمة"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Links (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                    <nav className="space-y-1">
                        {displayLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href || (link.href === '/stock' && pathname === '/');

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                                        isActive
                                            ? `${colorVariants[link.color]} shadow-md font-black`
                                            : `text-gray-600 dark:text-gray-300 ${hoverVariants[link.color]} font-bold`
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'scale-110' : ''}`} />
                                    <span className="text-sm">{link.label}</span>
                                    {isActive && <ChevronLeft className="mr-auto w-4 h-4 opacity-70" />}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-800/60 space-y-1 bg-gray-50/50 dark:bg-gray-900/30 shrink-0">
                    <button
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        type="button"
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm transition-all cursor-pointer"
                    >
                        {isDark ? <Sun className="w-5 h-5 text-amber-500 shrink-0" /> : <Moon className="w-5 h-5 text-indigo-500 shrink-0" />}
                        <span>{isDark ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
                    </button>
                    <button
                        onClick={() => {
                            setMobileMenuOpen(false);
                            logout();
                        }}
                        type="button"
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold text-sm transition-all cursor-pointer"
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </div>

            {/* 4. Desktop Sidebar (>= lg screens) */}
            <aside
                className={`fixed inset-y-0 right-0 ${
                    isSidebarCollapsed ? 'w-20' : 'w-64'
                } bg-card dark:bg-card border-l border-gray-100 dark:border-gray-800/40 z-50 transition-all duration-300 hidden lg:block shadow-[1px_0_15px_rgba(0,0,0,0.03)] ${
                    className || ''
                }`}
            >
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Header with Toggle */}
                    <div className="flex items-center justify-between p-4 mb-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {logoUrl ? (
                                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shrink-0 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center p-0.5">
                                    <img src={logoUrl} alt={settings?.name || 'شعار المطعم'} className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 rotate-3 shrink-0">
                                    <LayoutDashboard className="w-5 h-5 text-white" />
                                </div>
                            )}
                            {!isSidebarCollapsed && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-300 min-w-0">
                                    <h1 className="text-[15px] font-black text-gray-900 dark:text-white leading-tight truncate" title={settings?.name || 'إدارة المطعم'}>
                                        {settings?.name || 'إدارة المطعم'}
                                    </h1>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block -mt-0.5 opacity-60 truncate">
                                        {settings?.bio || 'نظام متكامل'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Toggle Button - Floating */}
                    <button
                        onClick={toggleSidebar}
                        type="button"
                        className="absolute -left-3 top-20 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all text-gray-400 hover:text-indigo-600 z-50 cursor-pointer"
                        aria-label="طي/توسيع القائمة"
                    >
                        {isSidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {/* Navigation - Scrollable Area */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent">
                        <nav className="space-y-1">
                            {displayLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive = pathname === link.href || (link.href === '/stock' && pathname === '/');

                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        title={isSidebarCollapsed ? link.label : ''}
                                        className={`flex items-center ${
                                            isSidebarCollapsed ? 'justify-center' : 'gap-3'
                                        } px-3 py-2.5 rounded-xl transition-all duration-300 group relative ${
                                            isActive
                                                ? `${colorVariants[link.color]} shadow-md font-bold scale-[1.02]`
                                                : `text-gray-500 ${hoverVariants[link.color]} font-semibold`
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                        {!isSidebarCollapsed && (
                                            <span className="text-[13px] whitespace-nowrap animate-in fade-in slide-in-from-right-1">{link.label}</span>
                                        )}
                                        {isActive && !isSidebarCollapsed && (
                                            <ChevronLeft className="mr-auto w-3 h-3 opacity-60" />
                                        )}

                                        {/* Tooltip for collapsed mode */}
                                        {isSidebarCollapsed && (
                                            <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                                {link.label}
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-4 mt-auto space-y-1 border-t border-gray-100 dark:border-gray-800/30">
                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            type="button"
                            className={`flex items-center ${
                                isSidebarCollapsed ? 'justify-center' : 'gap-3'
                            } w-full px-3 py-2 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-semibold group relative cursor-pointer`}
                            title={isSidebarCollapsed ? (isDark ? 'الوضع النهاري' : 'الوضع الليلي') : ''}
                        >
                            {isDark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
                            {!isSidebarCollapsed && (
                                <span className="text-[13px] whitespace-nowrap animate-in fade-in slide-in-from-right-1">
                                    {isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
                                </span>
                            )}
                            {isSidebarCollapsed && (
                                <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                    {isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
                                </div>
                            )}
                        </button>
                        <button
                            onClick={logout}
                            type="button"
                            className={`flex items-center ${
                                isSidebarCollapsed ? 'justify-center' : 'gap-3'
                            } w-full px-3 py-2 rounded-xl text-rose-500/80 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all font-bold group relative cursor-pointer`}
                            title={isSidebarCollapsed ? 'تسجيل الخروج' : ''}
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            {!isSidebarCollapsed && (
                                <span className="text-[13px] whitespace-nowrap animate-in fade-in slide-in-from-right-1">
                                    تسجيل الخروج
                                </span>
                            )}
                            {isSidebarCollapsed && (
                                <div className="absolute right-full mr-2 px-2 py-1 bg-rose-600 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                    تسجيل الخروج
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
