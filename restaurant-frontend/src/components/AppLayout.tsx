'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { useUIStore } from '@/store/uiStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { isSidebarCollapsed } = useUIStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isAuthPage = pathname === '/login' || pathname?.startsWith('/login');

    if (isAuthPage) {
        return (
            <main className="min-h-screen w-full overflow-x-hidden p-0 m-0 bg-background">
                {children}
            </main>
        );
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main
                className={`flex-1 ${
                    isSidebarCollapsed ? 'mr-20' : 'mr-20 md:mr-64'
                } transition-all duration-300 p-6 overflow-x-hidden`}
            >
                {children}
            </main>
        </div>
    );
}
