'use client';

import React, { useState, useEffect } from 'react';
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
import { shiftService, ShiftReconciliation } from '@/services/shiftService';
import { useAuthStore } from '@/store/authStore';

interface CloseShiftModalProps {
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
    const { activeShift, setActiveShift, user } = useAuthStore();
    const [countedCash, setCountedCash] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingRecon, setIsFetchingReFetchingRecon] = useState(false);
    const [reconData, setReconData] = useState<ShiftReconciliation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [closingReport, setClosingReport] = useState<any | null>(null);

    const currentShiftId = shiftId || activeShift?.id;

    // Load current live reconciliation when modal opens
    useEffect(() => {
        if (!isOpen) {
            setCountedCash('');
            setNotes('');
            setError(null);
            setClosingReport(null);
            return;
        }

        const fetchReconciliation = async () => {
            setIsFetchingReFetchingRecon(true);
            try {
                if (currentShiftId) {
                    const data = await shiftService.getShiftReconciliation(currentShiftId);
                    setReconData(data);
                } else {
                    const data = await shiftService.getCurrentPosShiftReconciliation();
                    setReconData(data);
                }
            } catch (err: any) {
                console.warn('Could not fetch pre-closing reconciliation:', err);
            } finally {
                setIsFetchingReFetchingRecon(false);
            }
        };

        fetchReconciliation();
    }, [isOpen, currentShiftId]);

    if (!isOpen) return null;

    // Numerical calculations
    const countedVal = parseFloat(countedCash) || 0;
    const expectedVal = reconData?.expected_drawer_cash ?? initialExpectedCash ?? Number(activeShift?.opening_balance || 0);
    const hasEnteredCount = countedCash.trim() !== '';
    const variance = hasEnteredCount ? Math.round((countedVal - expectedVal) * 100) / 100 : 0;

    let varianceStatus: 'BALANCED' | 'SURPLUS' | 'DEFICIT' | 'EMPTY' = 'EMPTY';
    if (hasEnteredCount) {
        if (Math.abs(variance) < 0.01) {
            varianceStatus = 'BALANCED';
        } else if (variance > 0) {
            varianceStatus = 'SURPLUS';
        } else {
            varianceStatus = 'DEFICIT';
        }
    }

    const handleConfirmClose = async () => {
        if (!hasEnteredCount) {
            setError('يرجى إدخال المبلغ الفعلي المعدود في الدرج');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const targetId = currentShiftId || activeShift?.id;
            let report: any;
            if (targetId) {
                report = await shiftService.closeShiftWithVariance(targetId, countedVal, notes);
            } else {
                throw new Error('لا توجد وردية نشطة محددة للإغلاق');
            }

            setClosingReport(report);
            if (setActiveShift) {
                setActiveShift(null);
            }
            if (onSuccess) {
                onSuccess(report);
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'فشل إغلاق الوردية');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrintSummary = () => {
        window.print();
    };

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
                                    <div className="bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200 dark:border-blue-900">
                                        <span className="text-[11px] text-blue-600 dark:text-blue-300 block font-bold">= النقدية المتوقعة</span>
                                        <span className="font-bold text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
                                            {expectedVal.toFixed(2)} د.ل
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actual Drawer Cash Input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    الرصيد الفعلي المعدود بالدرج (د.ل) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={countedCash}
                                        onChange={(e) => setCountedCash(e.target.value)}
                                        placeholder="أدخل المبلغ بعد عدّ النقود في الخزينة..."
                                        className="w-full pl-4 pr-11 py-3 text-lg font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none transition"
                                        autoFocus
                                    />
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                        د.ل
                                    </div>
                                    <Coins className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>

                            {/* Live Variance Calculation Widget */}
                            {hasEnteredCount && (
                                <div
                                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                                        varianceStatus === 'BALANCED'
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                                            : varianceStatus === 'SURPLUS'
                                            ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-400 dark:border-teal-700 text-teal-800 dark:text-teal-300'
                                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {varianceStatus === 'BALANCED' ? (
                                                <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
                                            ) : varianceStatus === 'SURPLUS' ? (
                                                <TrendingUp className="w-7 h-7 text-teal-500 shrink-0" />
                                            ) : (
                                                <TrendingDown className="w-7 h-7 text-rose-500 shrink-0" />
                                            )}
                                            <div>
                                                <h4 className="font-bold text-base">
                                                    {varianceStatus === 'BALANCED' && 'مطابقة تامة 100% (BALANCED)'}
                                                    {varianceStatus === 'SURPLUS' && 'يوجد فائض في الدرج (SURPLUS)'}
                                                    {varianceStatus === 'DEFICIT' && 'يوجد عجز في الدرج (DEFICIT)'}
                                                </h4>
                                                <p className="text-xs opacity-90 mt-0.5">
                                                    {varianceStatus === 'BALANCED' && 'الرصيد الفعلي في الدرج مساوٍ تماماً للنقدية المتوقعة دفترياً'}
                                                    {varianceStatus === 'SURPLUS' && `المبلغ المعدود أكبر من المتوقع بفارق ${variance.toFixed(2)} د.ل`}
                                                    {varianceStatus === 'DEFICIT' && `المبلغ المعدود أقل من المتوقع بفارق ${Math.abs(variance).toFixed(2)} د.ل`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-left font-black text-xl dir-ltr">
                                            {variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)} د.ل
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Closing Notes */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                                    ملاحظات الإغلاق والتسوية (اختياري)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    placeholder="أي توضيحات تخص فروقات الخزينة أو تسليم الوردية..."
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </>
                    ) : (
                        /* Itemized Shift Closing Receipt / Report */
                        <div id="shift-closing-print-area" className="space-y-4">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-1">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                                <h3 className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
                                    تم إغلاق الوردية واعتماد التسوية بنجاح
                                </h3>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                                    رقم الوردية: #{closingReport.shift_id} — {closingReport.shift_name}
                                </p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-sm">
                                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 dark:text-slate-400">الكاشير المسؤول</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{closingReport.cashier_name}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 dark:text-slate-400">الرصيد الافتتاحي</span>
                                    <span className="font-semibold">{Number(closingReport.opening_balance || 0).toFixed(2)} د.ل</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 dark:text-slate-400">مبيعات النقدية (Cash Sales)</span>
                                    <span className="font-semibold text-emerald-600">+{Number(closingReport.cash_sales || 0).toFixed(2)} د.ل</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 dark:text-slate-400">مسحوبات ومصاريف الوردية</span>
                                    <span className="font-semibold text-rose-600">-{Number(closingReport.cash_out || 0).toFixed(2)} د.ل</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-950/20 px-2 rounded">
                                    <span className="font-bold text-blue-700 dark:text-blue-300">الرصيد الدفتري المتوقع</span>
                                    <span className="font-bold text-blue-700 dark:text-blue-300">{Number(closingReport.expected_cash || 0).toFixed(2)} د.ل</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 px-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">الرصيد الفعلي المعدود</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{Number(closingReport.counted_cash || 0).toFixed(2)} د.ل</span>
                                </div>
                                <div className="flex justify-between py-2 px-2 rounded font-bold bg-slate-100 dark:bg-slate-700/60">
                                    <span>فارق الخزينة والتسوية</span>
                                    <span className={`dir-ltr ${
                                        closingReport.variance_status === 'BALANCED'
                                            ? 'text-emerald-600'
                                            : closingReport.variance_status === 'SURPLUS'
                                            ? 'text-teal-600'
                                            : 'text-rose-600'
                                    }`}>
                                        {closingReport.variance_status_display}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
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
