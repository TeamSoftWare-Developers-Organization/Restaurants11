'use client';

import React from 'react';
import {
    ShieldAlert,
    ShieldCheck,
    KeyRound,
    Lock,
    Sparkles
} from 'lucide-react';
import { useLicenseGuard } from '@/hooks/useLicenseGuard';

export default function ActivationGuard({ children }: { children: React.ReactNode }) {
    const {
        license,
        isLoading,
        productKey,
        isActivating,
        errorMessage,
        successMessage,
        isLocked,
        handleKeyChange,
        handleActivate
    } = useLicenseGuard();

    // أثناء التحميل الأولي لا نحجب الشاشة بالكامل ولكن ننتظر الثواني الأولى
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white space-y-4">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-400">جاري التحقق من أمان وترخيص النظام...</p>
            </div>
        );
    }

    // الحالة 1: النظام غير صالح (انتهت فترة الـ 14 يوماً أو الساعة التجريبية وغير مفعل) -> قفل الواجهة بالكامل
    if (isLocked) {
        return (
            <div className="fixed inset-0 z-[999999] bg-gray-950/98 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
                <div className="w-full max-w-xl bg-gray-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/40 text-center relative overflow-hidden">
                    {/* Glowing background decor */}
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Lock Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/10 animate-bounce">
                        <Lock className="w-8 h-8" />
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                        انتهت الفترة التجريبية للنظام (ساعة كاملة)
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-400 font-medium mb-6 leading-relaxed">
                        لقد استنفدت مدة الساعة التجريبية الممنوحة لك لاختبار النظام. لحماية البيانات واستئناف العمليات اليومية ونقاط البيع، يرجى إدخال مفتاح التفعيل الدائم المخصص لهذا الجهاز.
                    </p>

                    {/* Support Notice */}
                    <div className="bg-gray-950/80 border border-gray-800 rounded-2xl p-4 mb-6 text-right">
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-1.5">
                            <Sparkles className="w-4 h-4 shrink-0" />
                            <span>تفعيل النسخة الرسمية الدائمة:</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            للحصول على مفتاح التفعيل الدائم المخصص لمنشأتك، يرجى التواصل مباشرة مع المطورين المعتمدين للنظام (فريق الدعم الفني) وإدخال المفتاح أدناه.
                        </p>
                    </div>

                    {/* Product Key Input Form */}
                    <form onSubmit={handleActivate} className="space-y-4 text-right">
                        <div>
                            <label className="text-xs font-black text-gray-300 mb-1.5 flex items-center gap-1.5">
                                <KeyRound className="w-4 h-4 text-amber-400" />
                                <span>أدخل مفتاح المنتج (Product Key):</span>
                            </label>
                            <input
                                type="text"
                                value={productKey}
                                onChange={handleKeyChange}
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                maxLength={19}
                                className="w-full h-12 bg-gray-950 border border-gray-700 rounded-xl px-4 text-center font-mono font-black text-base tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase"
                                required
                            />
                        </div>

                        {errorMessage && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 shrink-0" />
                                <span>{successMessage}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isActivating || !productKey}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-900/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isActivating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>جاري التحقق من التشفير...</span>
                                </>
                            ) : (
                                <>
                                    <KeyRound className="w-4 h-4" />
                                    <span>تفعيل النظام مدى الحياة</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // الحالة 2: النظام مفعل بصفة دائمة أو التجربة لا زالت سارية
    return <>{children}</>;
}
