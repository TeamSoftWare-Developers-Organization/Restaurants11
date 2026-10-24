'use client';

import React from 'react';
import {
    Banknote,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Printer,
    Coins,
    Receipt,
    Calculator,
    X,
    ShieldCheck,
    Clock,
    UserCheck
} from 'lucide-react';
import { useShiftReconciliation } from '@/hooks/useShiftReconciliation';

export interface CloseShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    shiftId?: number;
    expectedCash?: number;
    onSuccess?: (report: any) => void;
}

export function CloseShiftModal({
    isOpen,
    onClose,
    shiftId,
    expectedCash: initialExpectedCash,
    onSuccess
}: CloseShiftModalProps) {
    const {
        countedCash,
        setCountedCash,
        notes,
        setNotes,
        isLoading,
        reconData,
        error,
        closingReport,
        expectedVal,
        hasEnteredCount,
        variance,
        varianceStatus,
        activeShift,
        user,
        handleConfirmClose,
        handlePrintSummary
    } = useShiftReconciliation({
        isOpen,
        shiftId,
        expectedCash: initialExpectedCash,
        onSuccess
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {closingReport ? 'تقرير تسوية وإغلاق الوردية' : 'إغلاق الوردية والمطابقة النقدية'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                احتساب فروقات الخزينة (عجز / فائض) والمطابقة الحسابية
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    {error && (
                        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {!closingReport ? (
                        <>
                            {/* Expected Breakdown Summary Card */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        الوردية الحالية: {reconData?.shift_name || activeShift?.shift_name || 'الوردية المباشرة'}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <UserCheck className="w-3.5 h-3.5" />
                                        الكاشير: {user ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email) : 'الحالي'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60 text-center">
                                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="text-[11px] text-slate-500 block">الافتتاحي</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                                            {(reconData?.opening_balance ?? activeShift?.opening_balance ?? 0).toFixed(2)} د.ل
                                        </span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">+ مبيعات كاش</span>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                            {(reconData?.total_cash_in ?? 0).toFixed(2)} د.ل
                                        </span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="text-[11px] text-rose-600 dark:text-rose-400 block">- مسحوبات الدرج</span>
                                        <span className="font-semibold text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
                                            {(reconData?.total_cash_out ?? 0).toFixed(2)} د.ل
                                        </span>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200 dark:border-blue-900/60">
                                        <span className="text-[11px] text-blue-700 dark:text-blue-300 block font-bold">الرصيد الدفتري المتوقع</span>
                                        <span className="font-black text-blue-700 dark:text-blue-300 text-xs sm:text-sm">
                                            {expectedVal.toFixed(2)} د.ل
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actual Drawer Cash Count Input */}
                            <div className="space-y-2">
                                <label className="flex items-center justify-between text-sm font-bold text-slate-800 dark:text-slate-200">
                                    <span className="flex items-center gap-2">
                                        <Calculator className="w-4 h-4 text-blue-600" />
                                        المبلغ الفعلي الموجود في الدرج الآن (د.ل) *
                                    </span>
                                    <span className="text-xs text-slate-400 font-normal">
                                        قم بعد النقدية الفعلية داخل الدرج
                                    </span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={countedCash}
                                        onChange={(e) => setCountedCash(e.target.value)}
                                        className="w-full text-2xl font-black px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl outline-hidden transition text-slate-900 dark:text-white"
                                        autoFocus
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                                        د.ل
                                    </span>
                                </div>
                            </div>

                            {/* Live Variance Calculation Badge */}
                            {hasEnteredCount && (
                                <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                                    varianceStatus === 'BALANCED'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                        : varianceStatus === 'SURPLUS'
                                        ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
                                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        {varianceStatus === 'BALANCED' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
                                        {varianceStatus === 'SURPLUS' && <TrendingUp className="w-6 h-6 text-indigo-600 shrink-0" />}
                                        {varianceStatus === 'DEFICIT' && <TrendingDown className="w-6 h-6 text-rose-600 shrink-0" />}
                                        <div>
                                            <h4 className="font-bold text-sm">
                                                {varianceStatus === 'BALANCED' && 'مطابقة تامة (متوازن 100%)'}
                                                {varianceStatus === 'SURPLUS' && 'يوجد فائض في الدرج'}
                                                {varianceStatus === 'DEFICIT' && 'يوجد عجز في الدرج'}
                                            </h4>
                                            <p className="text-xs opacity-80">
                                                {varianceStatus === 'BALANCED' && 'المبلغ الفعلي يتطابق تماماً مع المسجل دفترياً في النظام.'}
                                                {varianceStatus === 'SURPLUS' && 'النقدية الفعلية أكثر من المتوقع، سيتم تسجيل الفارق كفائض وردية.'}
                                                {varianceStatus === 'DEFICIT' && 'النقدية الفعلية أقل من المتوقع، سيتم تسجيل الفارق كعجز وردية.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left font-black text-xl">
                                        {variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)} د.ل
                                    </div>
                                </div>
                            )}

                            {/* Optional Notes */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    ملاحظات التسوية / تبرير الفارق (اختياري)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="أي تفاصيل أو ملاحظات حول تسوية هذا الدرج..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 outline-hidden transition resize-none text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        </>
                    ) : (
                        /* Closed Shift Report / Print Preview */
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                                <CheckCircle2 className="w-7 h-7 shrink-0 text-emerald-600" />
                                <div>
                                    <h4 className="font-bold text-base">تم إغلاق الوردية وترحيل التسوية بنجاح!</h4>
                                    <p className="text-xs opacity-90">
                                        تم قفل الوردية رقم #{closingReport.shift_id || shiftId || activeShift?.id} واحتساب الفروقات النقدية وحفظ التقرير.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 font-mono text-xs">
                                <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500">حالة المطابقة:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{closingReport.status_display || closingReport.status}</span>
                                </div>
                                <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500">الرصيد الدفتري المتوقع:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{(closingReport.expected_cash ?? expectedVal).toFixed(2)} د.ل</span>
                                </div>
                                <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500">المبلغ الفعلي المعدود:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{(closingReport.counted_cash ?? parseFloat(countedCash)).toFixed(2)} د.ل</span>
                                </div>
                                <div className="flex justify-between text-sm font-black pt-1">
                                    <span className="text-slate-700 dark:text-slate-300">الفارق النهائي (عجز / فائض):</span>
                                    <span className={
                                        (closingReport.variance ?? variance) < 0
                                            ? 'text-rose-600'
                                            : (closingReport.variance ?? variance) > 0
                                            ? 'text-indigo-600'
                                            : 'text-emerald-600'
                                    }>
                                        {(closingReport.variance ?? variance) > 0 ? `+${(closingReport.variance ?? variance).toFixed(2)}` : (closingReport.variance ?? variance).toFixed(2)} د.ل
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    {!closingReport ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmClose}
                                disabled={isLoading || !hasEnteredCount}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer"
                            >
                                {isLoading ? (
                                    <>جاري الإغلاق والتسوية...</>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4" />
                                        تأكيد الإغلاق واحتساب الفارق
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handlePrintSummary}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-xl transition"
                            >
                                <Printer className="w-4 h-4" />
                                طباعة ملخص الإغلاق
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
                            >
                                تم / إغلاق النافذة
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CloseShiftModal;
