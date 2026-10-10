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

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        }
    }, [isLoggedIn, router]);

    if (!isClient || !isLoggedIn) return null;

    return (
        <div className="flex flex-col lg:flex-row bg-background dark:bg-background min-h-screen transition-colors duration-300 min-w-0 w-full" dir="rtl">
            <Sidebar />

            <main className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-3.5 sm:p-6 lg:p-8 min-w-0 w-full transition-all duration-300 bg-gray-50/60 dark:bg-background`}>
                <div className="bg-white dark:bg-[#131b2e]/60 border border-gray-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs p-2 sm:p-4">
                    <KDSQueueView />
                </div>
            </main>
        </div>
    );
}
