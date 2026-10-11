'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './index';
import { treasuryService } from '@/services/treasuryService';
import { shiftService } from '@/services/shiftService';
import { useAuthStore } from '@/store/authStore';
import {
    Wallet,
    Clock,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Briefcase,
    Calendar,
    ChevronDown,
    PlusCircle,
    Scale,
    ArrowRightLeft,
    Coins,
    Banknote
} from 'lucide-react';

interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'open' | 'close';
    onSuccess?: () => void;
}

export function ShiftModal({ isOpen, onClose, mode, onSuccess }: ShiftModalProps) {
    const { activeShift, setActiveShift, user } = useAuthStore();
    const [balance, setBalance] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Shift allocation & timing data
    const [todayAllocation, setTodayAllocation] = useState<any>(null);
    const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');

    // Overtime fields for shift close
    const [hasOvertime, setHasOvertime] = useState(false);
    const [overtimeHours, setOvertimeHours] = useState<string>('1.0');
    const [overtimeRate, setOvertimeRate] = useState<string>('15.0');
    const [extraDuties, setExtraDuties] = useState<string>('');

    // Live Shift Reconciliation (فرق إجمالي الوردية وحساب النقدية المتوقعة)
    const [reconciliation, setReconciliation] = useState<any>(null);
    const [isLoadingReconciliation, setIsLoadingReconciliation] = useState(false);

    // Load active session, shift templates, and reconciliation when modal opens
    useEffect(() => {
        if (isOpen) {
            setBalance('');
            setError(null);
            setHasOvertime(false);
            setOvertimeHours('1.0');
            setOvertimeRate('15.0');
            setExtraDuties('');
            setReconciliation(null);

            const loadShiftContext = async () => {
                try {
                    const sessionData = await shiftService.getPosActiveSession();
                    if (sessionData?.today_allocation) {
                        setTodayAllocation(sessionData.today_allocation);
                        if (sessionData.today_allocation.overtime_hourly_rate) {
                            setOvertimeRate(String(sessionData.today_allocation.overtime_hourly_rate));
                        }
                    }
                    const templates = await shiftService.getTemplates();
                    setAvailableTemplates(templates);

                    // إذا كان الإجراء إغلاق الوردية، جلب المطابقة المالية اللحظية للدرج
                    if (mode === 'close') {
                        setIsLoadingReconciliation(true);
                        try {
                            const reconData = await shiftService.getCurrentPosShiftReconciliation();
                            setReconciliation(reconData);
                        } catch (reconErr) {
                            console.error('Error fetching live reconciliation:', reconErr);
                        } finally {
                            setIsLoadingReconciliation(false);
                        }
                    }
                } catch (e) {
                    console.error('Error loading shift info in modal', e);
                }
            };
            loadShiftContext();
        }
    }, [isOpen, mode]);

    const calculatedOvertimeCost = hasOvertime && parseFloat(overtimeHours) > 0 && parseFloat(overtimeRate) > 0
        ? Math.round(parseFloat(overtimeHours) * parseFloat(overtimeRate) * 100) / 100
        : 0;

    // احتساب فرق إجمالي الوردية اللحظي (Live Variance)
    const enteredBalanceNum = balance !== '' && !isNaN(parseFloat(balance)) ? parseFloat(balance) : null;
    const expectedDrawerCash = reconciliation ? reconciliation.expected_drawer_cash : null;
    const liveVariance = enteredBalanceNum !== null && expectedDrawerCash !== null
        ? Math.round((enteredBalanceNum - expectedDrawerCash) * 100) / 100
        : null;

    const handleOpenShift = async () => {
        if (!balance || isNaN(parseFloat(balance))) {
            setError('يرجى إدخال مبلغ صحيح');
            return;
        }

        setIsLoading(true);
        try {
            // استخدام endpoint الورديات المتكامل الجديد
            const selectedTemplate = availableTemplates.find(t => t.id === Number(selectedTemplateId));
            const customName = selectedTemplate ? selectedTemplate.name : (todayAllocation?.shift_name || 'وردية نقطة البيع');

            await shiftService.startPosShift(
                parseFloat(balance),
                todayAllocation?.id,
                customName
            );

            // تحديث الوردية في الـ authStore
            const current = await treasuryService.getCurrentShift();
            setActiveShift(current);

            onSuccess?.();
            onClose();
        } catch (err: any) {
            // Fallback to legacy treasury service
            try {
                const shift = await treasuryService.openShift(parseFloat(balance));
                setActiveShift(shift);
                onSuccess?.();
                onClose();
            } catch (fallbackErr: any) {
                setError(err.response?.data?.message || fallbackErr.response?.data?.message || 'فشل فتح الوردية');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseShift = async () => {
        if (!balance || isNaN(parseFloat(balance))) {
            setError('يرجى إدخال مبلغ الرصيد الفعلي في الدرج');
            return;
        }

        setIsLoading(true);
        try {
            // إنهاء الوردية وتسجيل العمل الإضافي إن وُجد
            await shiftService.finishPosShift(
                parseFloat(balance),
                hasOvertime,
                hasOvertime ? (parseFloat(overtimeHours) || 0) : 0,
                hasOvertime ? (parseFloat(overtimeRate) || 15) : 15,
                hasOvertime ? extraDuties : undefined
            );

            setActiveShift(null);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            // Fallback to legacy treasury service
            try {
                const shift = await treasuryService.closeShift(parseFloat(balance));
                setActiveShift(null);
                onSuccess?.();
                onClose();
            } catch (fallbackErr: any) {
                setError(err.response?.data?.message || fallbackErr.response?.data?.message || 'فشل إغلاق الوردية');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'open' ? 'فتح وردية نقطة البيع' : 'إغلاق وردية نقطة البيع'}
            size="md"
        >
            <div className="space-y-4" dir="rtl">
                {/* Header Icon & Message */}
                <div className="flex flex-col items-center justify-center text-center space-y-1.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${mode === 'open'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-100 dark:border-emerald-900/40'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-100 dark:border-amber-900/40'
                        }`}>
                        {mode === 'open' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white">
                            {mode === 'open' ? 'بدء جلسة عمل الكاشير' : 'إنهاء وردية الكاشير وتسليم الصندوق'}
                        </h3>
                        <p className="text-xs font-bold text-gray-400 mt-0.5">
                            {mode === 'open'
                                ? 'يرجى التأكد من رصيد العهدة النقدية في الدرج وتوقيت الوردية.'
                                : 'عدّ النقدية الفعلية في الدرج وتسجيل أي أعمال إضافية تم إنجازها.'}
                        </p>
                    </div>
                </div>

                {/* Shift Allocation & Timing Banner */}
                {mode === 'open' && (
                    <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs space-y-2">
                        <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 font-black">
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span>توقيت الوردية المخصص لليوم</span>
                            </span>
                            {todayAllocation ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[10px] font-black">
                                    مخصص مسبقاً
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 font-bold">
                                    وردية حرة
                                </span>
                            )}
                        </div>

                        {todayAllocation ? (
                            <div className="text-gray-700 dark:text-gray-300 font-bold flex items-center justify-between">
                                <div>
                                    <span className="font-black text-blue-900 dark:text-blue-100">{todayAllocation.shift_name}</span>
                                    <span className="text-[11px] text-gray-500 mr-2">
                                        ({todayAllocation.start_time} إلى {todayAllocation.end_time})
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-500">{todayAllocation.pos_station}</span>
                            </div>
                        ) : availableTemplates.length > 0 ? (
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 block mb-1">اختر قالب الوردية:</label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full h-9 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-900/50 rounded-xl px-3 text-xs font-bold outline-none"
                                >
                                    <option value="">وردية عادية / مباشرة</option>
                                    {availableTemplates.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.start_time} - {t.end_time})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Cash Balance Input */}
                <div className="space-y-4">
                    <div className="relative">
                        <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-1.5 block">
                            {mode === 'open' ? 'الرصيد الافتتاحي بالدرج (د.ل)' : 'الرصيد الفعلي الموجود بالدرج حالياً (د.ل)'}
                        </label>
                        <div className="relative group">
                            <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                            <input
                                type="number"
                                step="0.01"
                                value={balance}
                                onChange={(e) => setBalance(e.target.value)}
                                placeholder="0.00"
                                className="w-full h-12 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl pr-11 pl-4 font-black text-base focus:ring-2 focus:ring-emerald-600/10 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Shift Drawer Financial Summary & Reconciliation in Close Mode */}
                    {mode === 'close' && (
                        <div className="space-y-3">
                            {isLoadingReconciliation ? (
                                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2 text-xs text-gray-500">
                                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    <span>جاري احتساب ومطابقة رصيد الوردية المسجل...</span>
                                </div>
                            ) : reconciliation ? (
                                <div className="p-3.5 rounded-2xl bg-linear-to-br from-gray-50 to-emerald-50/30 dark:from-gray-900 dark:to-emerald-950/20 border border-gray-200/80 dark:border-gray-800 space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between font-black text-gray-700 dark:text-gray-200">
                                        <span className="flex items-center gap-1.5">
                                            <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            <span>بيان المطابقة النقدية للوردية الحالية</span>
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold">
                                            {reconciliation.shift_name}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-gray-200/60 dark:border-gray-800">
                                        <div className="bg-white dark:bg-gray-800/80 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                            <span className="text-[10px] text-gray-400 block font-bold">الرصيد الافتتاحي</span>
                                            <span className="font-black text-gray-800 dark:text-gray-100 text-xs">
                                                {reconciliation.opening_balance.toFixed(2)} د.ل
                                            </span>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800/80 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">+ المقبوض نقداً</span>
                                            <span className="font-black text-emerald-700 dark:text-emerald-300 text-xs">
                                                +{reconciliation.total_cash_in.toFixed(2)} د.ل
                                            </span>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800/80 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                            <span className="text-[10px] text-rose-500 block font-bold">- المصروف نقداً</span>
                                            <span className="font-black text-rose-600 dark:text-rose-400 text-xs">
                                                -{reconciliation.total_cash_out.toFixed(2)} د.ل
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-2.5 bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl font-bold">
                                        <span className="text-[11px] text-emerald-900 dark:text-emerald-200 font-black">
                                            الرصيد الدفتري المتوقع في الدرج:
                                        </span>
                                        <span className="font-black text-emerald-800 dark:text-emerald-100 text-sm">
                                            {reconciliation.expected_drawer_cash.toFixed(2)} د.ل
                                        </span>
                                    </div>

                                    {/* Live Variance Calculation Badge */}
                                    {liveVariance !== null && (
                                        <div className={`p-2.5 rounded-xl border flex items-center justify-between font-black transition-all ${
                                            Math.abs(liveVariance) < 0.001
                                                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 text-blue-700 dark:text-blue-300'
                                                : liveVariance > 0
                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-300'
                                        }`}>
                                            <span className="text-xs flex items-center gap-1.5">
                                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                                <span>فرق إجمالي الوردية:</span>
                                            </span>
                                            <span className="text-xs font-black">
                                                {Math.abs(liveVariance) < 0.001
                                                    ? 'متطابق تماماً (0.00 د.ل)'
                                                    : liveVariance > 0
                                                    ? `فائض نقدي (+${liveVariance.toFixed(2)} د.ل)`
                                                    : `عجز نقدي (${liveVariance.toFixed(2)} د.ل)`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Overtime Section in Shift Close */}
                    {mode === 'close' && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={hasOvertime}
                                    onChange={(e) => setHasOvertime(e.target.checked)}
                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                                />
                                <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                                    هل تم أداء ساعات أو أعمال إضافية في هذه الوردية؟
                                </span>
                            </label>

                            {hasOvertime && (
                                <div className="space-y-3 pt-2 border-t border-amber-200/50 dark:border-amber-900/30 text-xs">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1">
                                                عدد الساعات الإضافية
                                            </label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0.5"
                                                value={overtimeHours}
                                                onChange={(e) => setOvertimeHours(e.target.value)}
                                                className="w-full h-9 bg-white dark:bg-gray-900 border border-amber-200 rounded-xl px-3 font-black text-xs outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1">
                                                سعر الساعة (د.ل)
                                            </label>
                                            <input
                                                type="number"
                                                step="1"
                                                value={overtimeRate}
                                                onChange={(e) => setOvertimeRate(e.target.value)}
                                                className="w-full h-9 bg-white dark:bg-gray-900 border border-amber-200 rounded-xl px-3 font-black text-xs outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Cost Calculator Badge */}
                                    <div className="flex items-center justify-between bg-amber-100/70 dark:bg-amber-900/40 p-2.5 rounded-xl font-bold">
                                        <span className="text-[11px] text-amber-900 dark:text-amber-200">إجمالي مستحق العمل الإضافي:</span>
                                        <span className="font-black text-amber-800 dark:text-amber-100 text-sm">
                                            {calculatedOvertimeCost.toFixed(2)} د.ل
                                        </span>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 block mb-1">
                                            بيان الأعمال والمهام الإضافية المنجزة
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={extraDuties}
                                            onChange={(e) => setExtraDuties(e.target.value)}
                                            placeholder="مثال: تغطية نقص كادر، تجهيز طلبات خارجية، جرد نهاية الدوام..."
                                            className="w-full bg-white dark:bg-gray-900 border border-amber-200 rounded-xl p-2 text-xs font-medium outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-xl text-xs font-bold ring-1 ring-rose-100 dark:ring-rose-900/30">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="sticky bottom-0 bg-white/95 dark:bg-card/95 backdrop-blur-xs pt-3 pb-1 border-t border-gray-100 dark:border-gray-800/40">
                        <button
                            onClick={mode === 'open' ? handleOpenShift : handleCloseShift}
                            disabled={isLoading}
                            className={`w-full h-11 rounded-xl font-black text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${mode === 'open'
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    <span>{mode === 'open' ? 'تأكيد فتح الوردية' : 'تأكيد إغلاق الوردية واعتماد الإضافي'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
