'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function ElectronWindowControls() {
    const [isElectron, setIsElectron] = useState(false);
    const [isMaximized, setIsMaximized] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
            setIsElectron(true);
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F11') {
                e.preventDefault();
                (window as any).electronAPI?.toggleFullscreen?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isElectron) return null;

    const handleMinimize = () => {
        (window as any).electronAPI?.minimizeWindow?.();
    };

    const handleMaximize = () => {
        (window as any).electronAPI?.maximizeWindow?.();
        setIsMaximized(!isMaximized);
    };

    const handleClose = () => {
        (window as any).electronAPI?.closeWindow?.();
    };

    return (
        <>
            {/* Top Drag Region: allows dragging and double clicking to maximize */}
            <div 
                className="fixed top-0 left-0 right-0 h-2 z-[99998] pointer-events-auto"
                style={{ WebkitAppRegion: 'drag' } as any}
                onDoubleClick={handleMaximize}
            />

            {/* Discrete Floating Desktop Window Controls (Top Left in RTL) */}
            <div 
                className="fixed top-2 left-2 z-[99999] flex items-center gap-0.5 bg-gray-950/70 hover:bg-gray-950/95 backdrop-blur-md px-1.5 py-1 rounded-xl border border-gray-800/60 opacity-40 hover:opacity-100 transition-all shadow-md group"
                style={{ WebkitAppRegion: 'no-drag' } as any}
                dir="ltr"
            >
                <button
                    onClick={handleClose}
                    type="button"
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
                    title="إغلاق البرنامج (Close)"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleMaximize}
                    type="button"
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
                    title="تكبير / استعادة (Maximize / Restore)"
                >
                    <Square className="w-3 h-3" />
                </button>
                <button
                    onClick={handleMinimize}
                    type="button"
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
                    title="تصغير إلى شريط المهام (Minimize)"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
            </div>
        </>
    );
}
