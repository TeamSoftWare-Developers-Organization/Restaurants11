'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    maxWidth?: string;
    className?: string;
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
};

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    maxWidth,
    className = ''
}: ModalProps) {
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const widthClass = maxWidth || sizeClasses[size] || 'max-w-lg';

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Dialog Position Container */}
            <div className="min-h-full flex items-center justify-center p-3 sm:p-6">
                <div
                    className={`bg-card dark:bg-card w-full ${widthClass} max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800/40 relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto ${className}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <header className="px-6 py-4 border-b border-gray-100 dark:border-gray-800/30 flex items-center justify-between shrink-0 bg-card/90 backdrop-blur-xs">
                        <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                            {title}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            aria-label="إغلاق"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </header>

                    {/* Content Body */}
                    <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
