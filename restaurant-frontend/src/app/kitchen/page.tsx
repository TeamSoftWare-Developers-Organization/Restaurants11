'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import KDSQueueView from '@/components/kitchen/KDSQueueView';

export default function KitchenPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn } = useAuthStore();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        }
    }, [isLoggedIn, router]);

    if (!isClient || !isLoggedIn) return null;

    if (isFullscreen) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] relative transition-colors duration-300" dir="rtl">
                <button
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-4 left-4 z-50 bg-white dark:bg-[#131b2e] hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md font-bold transition active:scale-95 cursor-pointer"
                >
                    الخروج من وضع ملء الشاشة ✕
                </button>
                <div className="p-4 sm:p-6">
                    <KDSQueueView />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row bg-background dark:bg-background min-h-screen transition-colors duration-300 min-w-0 w-full" dir="rtl">
            <Sidebar />

            <main className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-3.5 sm:p-6 lg:p-8 min-w-0 w-full transition-all duration-300 bg-gray-50/60 dark:bg-background`}>
                <div className="flex justify-end mb-3">
                    <button
                        onClick={() => setIsFullscreen(true)}
                        className="bg-white dark:bg-indigo-600/20 hover:bg-indigo-50 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-indigo-500/30 text-xs px-3.5 py-2 rounded-xl font-black transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                    >
                        <span>⛶</span>
                        وضع ملء الشاشة لشاشات المطبخ
                    </button>
                </div>
                <div className="bg-white dark:bg-[#131b2e]/60 border border-gray-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs p-2 sm:p-4">
                    <KDSQueueView />
                </div>
            </main>
        </div>
    );
}
