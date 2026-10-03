'use client';

import React, { useEffect } from 'react';
import {
    Trash2,
    AlertTriangle,
    CheckCircle2,
    AlertCircle,
    Info,
    X,
    Loader2
} from 'lucide-react';
import { useModalStore, ModalVariant } from '@/store/modalStore';

export default function GlobalModals() {
    const {
        isConfirmOpen,
        confirmConfig,
        isConfirmLoading,
        closeConfirm,
        isAlertOpen,
        alertConfig,
        closeAlert,
    } = useModalStore();

    // Close on ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isConfirmOpen && !isConfirmLoading) {
                    closeConfirm(false);
                } else if (isAlertOpen) {
                    closeAlert();
                }
            }
        };

        if (isConfirmOpen || isAlertOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isConfirmOpen, isConfirmLoading, isAlertOpen, closeConfirm, closeAlert]);

    return (
        <>
            {/* -------------------- 1. CONFIRMATION MODAL -------------------- */}
            {isConfirmOpen && (
                <div className="fixed inset-0 z-[200] overflow-y-auto" dir="rtl">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => {
                            if (!isConfirmLoading) closeConfirm(false);
                        }}
                    />

                    <div className="min-h-full flex items-center justify-center p-4">
                        <div
                            className="bg-card dark:bg-card w-full max-w-sm sm:max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto p-6 sm:p-7 text-center space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => closeConfirm(false)}
                                disabled={isConfirmLoading}
                                className="absolute top-4 left-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
                                aria-label="إلغاء"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Badge Icon */}
                            {confirmConfig.variant === 'danger' ? (
                                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
                                    <Trash2 className="w-8 h-8 animate-in zoom-in duration-300" />
                                </div>
                            ) : confirmConfig.variant === 'warning' ? (
                                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                                    <AlertTriangle className="w-8 h-8 animate-in zoom-in duration-300" />
                                </div>
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
                                    <Info className="w-8 h-8 animate-in zoom-in duration-300" />
                                </div>
                            )}

                            {/* Title & Message */}
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                    {confirmConfig.title}
                                </h3>
                                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                    {confirmConfig.message}
                                    {confirmConfig.itemName && (
                                        <div className="mt-1 font-bold text-gray-900 dark:text-white underline decoration-rose-500 decoration-2 underline-offset-2">
                                            "{confirmConfig.itemName}"
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => closeConfirm(false)}
                                    disabled={isConfirmLoading}
                                    className="flex-1 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-black text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {confirmConfig.cancelText}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => closeConfirm(true)}
                                    disabled={isConfirmLoading}
                                    className={`flex-1 h-11 rounded-xl font-black text-xs sm:text-sm text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                                        confirmConfig.variant === 'danger'
                                            ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                                            : confirmConfig.variant === 'warning'
                                            ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
                                    }`}
                                >
                                    {isConfirmLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>جاري التنفيذ...</span>
                                        </>
                                    ) : (
                                        <span>{confirmConfig.confirmText}</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* -------------------- 2. ALERT MODAL (Replaces window.alert) -------------------- */}
            {isAlertOpen && (
                <div className="fixed inset-0 z-[200] overflow-y-auto" dir="rtl">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={closeAlert}
                    />

                    <div className="min-h-full flex items-center justify-center p-4">
                        <div
                            className="bg-card dark:bg-card w-full max-w-sm sm:max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto p-6 text-center space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={closeAlert}
                                className="absolute top-4 left-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                aria-label="إغلاق"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Icon Badge */}
                            {alertConfig.variant === 'error' ? (
                                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
                                    <AlertCircle className="w-7 h-7" />
                                </div>
                            ) : alertConfig.variant === 'success' ? (
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                                    <CheckCircle2 className="w-7 h-7" />
                                </div>
                            ) : alertConfig.variant === 'warning' ? (
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                                    <AlertTriangle className="w-7 h-7" />
                                </div>
                            ) : (
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
                                    <Info className="w-7 h-7" />
                                </div>
                            )}

                            {/* Content */}
                            <div className="space-y-1.5">
                                <h3 className="text-base font-black text-gray-900 dark:text-white">
                                    {alertConfig.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                    {alertConfig.message}
                                </p>
                            </div>

                            {/* OK Button */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={closeAlert}
                                    className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
                                >
                                    {alertConfig.buttonText || 'حسناً'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
