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
            <div className="min-h-screen bg-[#0b1120] relative" dir="rtl">
                <button
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-4 left-4 z-50 bg-[#131b2e] hover:bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-700 transition"
                >
                    الخروج من وضع ملء الشاشة ✕
                </button>
                <KDSQueueView />
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row bg-background dark:bg-background min-h-screen transition-colors duration-300 min-w-0 w-full" dir="rtl">
            <Sidebar />

            <main className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-2 sm:p-4 min-w-0 w-full transition-all duration-300`}>
                <div className="flex justify-end p-2">
                    <button
                        onClick={() => setIsFullscreen(true)}
                        className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5"
                    >
                        <span>⛶</span>
                        وضع ملء الشاشة لشاشات المطبخ
                    </button>
                </div>
                <KDSQueueView />
            </main>
        </div>
    );
}
