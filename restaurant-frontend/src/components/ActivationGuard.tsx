'use client';

import React, { useState, useEffect } from 'react';
import { licenseService, LicenseStatus } from '@/services/licenseService';
import {
    ShieldAlert,
    ShieldCheck,
    KeyRound,
    Copy,
    Check,
    Lock,
    Sparkles,
    AlertTriangle,
    RefreshCw,
    Clock,
    Laptop
} from 'lucide-react';

export default function ActivationGuard({ children }: { children: React.ReactNode }) {
    const [license, setLicense] = useState<LicenseStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [productKey, setProductKey] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isBannerDismissed, setIsBannerDismissed] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState<number>(0);

    // تحديث الثواني عند جلب حالة الترخيص
    useEffect(() => {
        if (license && license.is_trial_active && license.remaining_trial_seconds !== undefined) {
            setSecondsLeft(license.remaining_trial_seconds);
        }
    }, [license]);

    // عداد تنازلي حي بالثواني للفترة التجريبية (ساعة واحدة)
    useEffect(() => {
        if (!license || !license.is_trial_active || secondsLeft <= 0) return;

        const interval = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    fetchStatus();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [license, secondsLeft]);

    const formatCountdown = (secs: number) => {
        if (secs <= 0) return 'انتهت مدة التجربة';
        const hours = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (hours > 0) {
            return `${hours} ساعة و ${mins} دقيقة و ${s} ثانية`;
        }
        return `${mins} دقيقة و ${s} ثانية`;
    };

    // فحص حالة الترخيص عند تحميل المكون
    const fetchStatus = async (retryCount = 1) => {
        try {
            const data = await licenseService.getLicenseStatus();
            setLicense(data);
        } catch (err: any) {
            console.warn('[ActivationGuard] Could not fetch license status:', err?.message || err);
            if (retryCount > 0) {
                setTimeout(() => fetchStatus(retryCount - 1), 3000);
                return;
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    // نسخ معرف الجهاز
    const handleCopyMachineId = () => {
        if (!license?.machine_id) return;
        navigator.clipboard.writeText(license.machine_id);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    };

    // معالجة إدخال مفتاح المنتج وتنسيقه XXXX-XXXX-XXXX-XXXX
    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length > 16) val = val.slice(0, 16);
        // تقسيم إلى مجموعات من 4
        const parts = val.match(/.{1,4}/g);
        setProductKey(parts ? parts.join('-') : val);
        setErrorMessage(null);
    };

    // إرسال كود التفعيل
    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productKey.trim()) {
            setErrorMessage('يرجى إدخال مفتاح المنتج المكون من 16 حرفاً.');
            return;
        }

        setIsActivating(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const res = await licenseService.activateProductKey(productKey);
            if (res.success) {
                setSuccessMessage(res.message);
                if (res.license_status) {
                    setLicense(res.license_status);
                }
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setErrorMessage(res.message);
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'فشل التحقق من المفتاح، يرجى المحاولة لاحقاً.';
            setErrorMessage(msg);
        } finally {
            setIsActivating(false);
        }
    };

    // أثناء التحميل الأولي لا نحجب الشاشة بالكامل ولكن ننتظر الثواني الأولى
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white space-y-4">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-400">جاري التحقق من أمان وترخيص النظام...</p>
            </div>
        );
    }

    // الحالة 1: النظام غير صالح (انتهت فترة الـ 14 يوماً وغير مفعل) -> قفل الواجهة بالكامل
    const isLocked = license && !license.is_valid;

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

                    {/* Machine ID Box */}
                    <div className="bg-gray-950/80 border border-gray-800 rounded-2xl p-4 mb-6 text-right">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                            <span className="flex items-center gap-1.5 font-bold">
                                <Laptop className="w-4 h-4 text-emerald-400" />
                                <span>معرف الجهاز الفريد (Machine ID):</span>
                            </span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
                                فريد ومشفر
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 bg-gray-900 px-3 py-2.5 rounded-xl border border-gray-800">
                            <span className="font-mono font-black text-sm sm:text-base text-emerald-400 tracking-wider">
                                {license?.machine_id}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyMachineId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-all active:scale-95 shrink-0"
                            >
                                {isCopied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400">تم النسخ</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>نسخ المعرف</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2">
                            * شارك هذا المعرف مع فريق الدعم الفني أو المورد لإصدار مفتاح المنتج الخاص بك.
                        </p>
                    </div>

                    {/* Product Key Input Form */}
                    <form onSubmit={handleActivate} className="space-y-4 text-right">
                        <div>
                            <label className="text-xs font-black text-gray-300 block mb-1.5 flex items-center gap-1.5">
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
                            className="w-full h-12 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-900/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

    // الحالة 2: النظام مفعل بصفة دائمة -> عرض التطبيق مباشرة دون أي شريط
    if (license?.is_activated) {
        return <>{children}</>;
    }

    // تم إخفاء الشريط العلوي في نافذة النظام بالكامل وعرض محتوى التطبيق مباشرة
    return <>{children}</>;
}
