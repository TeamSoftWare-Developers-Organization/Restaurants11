'use client';

import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title?: string;
    message?: string;
    itemName?: string;
    isLoading?: boolean;
    confirmText?: string;
    cancelText?: string;
}

export default function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'تأكيد الحذف',
    message,
    itemName,
    isLoading = false,
    confirmText = 'نعم، حذف',
    cancelText = 'إلغاء',
}: DeleteConfirmModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
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
    }, [isOpen, isLoading, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                onClick={() => {
                    if (!isLoading) onClose();
                }}
                aria-hidden="true"
            />

            {/* Modal Dialog Position Container */}
            <div className="min-h-full flex items-center justify-center p-4">
                <div
                    className="bg-card dark:bg-card w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl border border-rose-500/20 dark:border-rose-500/20 relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto p-6 text-center space-y-4"
                    onClick={(e) => e.stopPropagation()}
                    dir="rtl"
                >
                    {/* Close button */}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="absolute top-4 left-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label="إغلاق"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Danger Icon Badge */}
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
                        <Trash2 className="w-8 h-8 animate-in zoom-in duration-300" />
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                            {message ? (
                                message
                            ) : itemName ? (
                                <>
                                    هل أنت متأكد من رغبتك في حذف{' '}
                                    <span className="font-bold text-gray-900 dark:text-white underline decoration-rose-500 decoration-2 underline-offset-2">
                                        "{itemName}"
                                    </span>
                                    ؟ لا يمكن التراجع عن هذه العملية بعد إتمامها.
                                </>
                            ) : (
                                'هل أنت متأكد من رغبتك في إتمام عملية الحذف؟ لا يمكن التراجع عن هذا الإجراء.'
                            )}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-black text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm transition-all shadow-lg shadow-rose-600/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>جاري الحذف...</span>
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    <span>{confirmText}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
