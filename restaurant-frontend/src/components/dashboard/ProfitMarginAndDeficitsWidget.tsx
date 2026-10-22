'use client';

import React, { useEffect, useState } from 'react';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    Percent,
    Receipt,
    Layers,
    Send,
    Check,
    Clock,
    UserCircle,
    Info,
    Sparkles
} from 'lucide-react';
import { treasuryService, ProfitMarginStatement, ShiftDeficitItem } from '@/services/treasuryService';

export default function ProfitMarginAndDeficitsWidget() {
    const [data, setData] = useState<ProfitMarginStatement | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Active Tab in the widget
    const [activeTab, setActiveTab] = useState<'statement' | 'deficits'>('statement');

    // Transfer Profit modal / inline state
    const [showTransferProfit, setShowTransferProfit] = useState(false);
    const [transferProfitAmount, setTransferProfitAmount] = useState<string>('');
    const [transferProfitDesc, setTransferProfitDesc] = useState<string>('');
    const [isTransferringProfit, setIsTransferringProfit] = useState(false);

    // Single deficit settlement state
    const [settlingShiftId, setSettlingShiftId] = useState<number | null>(null);
    const [isSettlingAll, setIsSettlingAll] = useState(false);

    const loadData = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            else setIsRefreshing(true);
            const res = await treasuryService.getProfitMarginAndDeficits();
            setData(res);
            if (res.net_profit > 0) {
                setTransferProfitAmount(res.net_profit.toString());
            }
        } catch (err) {
            console.error('Failed to load profit margin & deficits statement', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Settle single shift deficit / surplus
    const handleSettleShift = async (shift: ShiftDeficitItem) => {
        try {
            setSettlingShiftId(shift.shift_id);
            setActionMsg(null);
            const res = await treasuryService.settleShiftDeficit(shift.shift_id);
            setActionMsg({ type: 'success', text: res.message });
            await loadData(true);
        } catch (err: any) {
            setActionMsg({
                type: 'error',
                text: err.response?.data?.message || 'فشل ترحيل تسوية الوردية إلى الخزينة.'
            });
        } finally {
            setSettlingShiftId(null);
        }
    };

    // Settle all pending shift deficits at once
    const handleSettleAllDeficits = async () => {
        if (!confirm('هل أنت متأكد من ترحيل وتسوية جميع العجوزات النقدية المعلقة إلى الخزينة؟')) {
            return;
        }

        try {
            setIsSettlingAll(true);
            setActionMsg(null);
            const res = await treasuryService.settleAllDeficits();
            setActionMsg({ type: 'success', text: res.message });
            await loadData(true);
        } catch (err: any) {
            setActionMsg({
                type: 'error',
                text: err.response?.data?.message || 'فشل ترحيل العجوزات إلى الخزينة.'
            });
        } finally {
            setIsSettlingAll(false);
        }
    };

    // Transfer periodic profit to main treasury
    const handleTransferProfit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(transferProfitAmount);
        if (!amt || amt <= 0) {
            setActionMsg({ type: 'error', text: 'يرجى إدخال مبلغ صحيح أكبر من صفر.' });
            return;
        }

        try {
            setIsTransferringProfit(true);
            setActionMsg(null);
            const res = await treasuryService.transferProfitToTreasury(amt, transferProfitDesc);
            setActionMsg({ type: 'success', text: res.message });
            setShowTransferProfit(false);
            setTransferProfitDesc('');
            await loadData(true);
        } catch (err: any) {
            setActionMsg({
                type: 'error',
                text: err.response?.data?.message || 'فشل ترحيل الأرباح إلى الخزينة.'
            });
        } finally {
            setIsTransferringProfit(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-card border border-gray-100 dark:border-gray-800/40 rounded-3xl p-6 mb-6 shadow-xs animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/3 mb-4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded-2xl"></div>
                    <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded-2xl"></div>
                    <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded-2xl"></div>
                    <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const isProfitable = data.net_profit >= 0;
    const unsettledDeficitsCount = data.deficits_list.filter(d => !d.is_settled && d.variance! < -0.01).length;

    return (
        <section className="bg-white dark:bg-card border border-gray-100 dark:border-gray-800/40 rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-xs" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                                كشف هامش الربح وعجز الورديات
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
                                تحليل مالي فوري
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 font-bold mt-0.5">
                            رصد هوامش الأرباح، تكلفة المواد، وحصر عجوزات الكاشير مع إمكانية الترحيل المباشر للخزينة
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {unsettledDeficitsCount > 0 && (
                        <button
                            onClick={handleSettleAllDeficits}
                            disabled={isSettlingAll}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shadow-rose-600/20 active:scale-95 cursor-pointer"
                        >
                            <ShieldAlert className="w-4 h-4" />
                            <span>{isSettlingAll ? 'جاري الترحيل...' : `ترحيل العجز للخزينة (${data.total_unsettled_deficits.toLocaleString()} د.ل)`}</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowTransferProfit(!showTransferProfit)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 cursor-pointer"
                    >
                        <Wallet className="w-4 h-4" />
                        <span>ترحيل أرباح للخزينة</span>
                    </button>

                    <button
                        onClick={() => loadData(true)}
                        disabled={isRefreshing}
                        className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-all cursor-pointer"
                        title="تحديث البيانات"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Action Alert Banner */}
            {actionMsg && (
                <div className={`mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                    actionMsg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                }`}>
                    {actionMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{actionMsg.text}</span>
                </div>
            )}

            {/* Transfer Profit Form Drawer */}
            {showTransferProfit && (
                <form onSubmit={handleTransferProfit} className="mt-4 p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-3 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                                ترحيل وتوريد أرباح تشغيلية إلى الخزينة الرئيسية
                            </h4>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">
                            رصيد الخزينة الحالي: <strong className="font-mono text-emerald-600">{data.treasury_current_balance.toLocaleString()} د.ل</strong>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 block mb-1">المبلغ المراد ترحيله (د.ل)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={transferProfitAmount}
                                onChange={(e) => setTransferProfitAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full h-10 px-3 bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-black font-mono outline-none focus:ring-2 focus:ring-emerald-500/20"
                                required
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="text-[10px] font-black text-gray-500 block mb-1">بيان حركة التوريد (اختياري)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={transferProfitDesc}
                                    onChange={(e) => setTransferProfitDesc(e.target.value)}
                                    placeholder="مثال: ترحيل أرباح مبيعات عطلة نهاية الأسبوع"
                                    className="flex-1 h-10 px-3 bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                                <button
                                    type="submit"
                                    disabled={isTransferringProfit}
                                    className="px-5 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer shrink-0"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>{isTransferringProfit ? 'جاري الترحيل...' : 'تأكيد الترحيل للخزينة'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {/* Financial Performance KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 my-5">
                {/* 1. Gross Sales */}
                <div className="p-3.5 bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800/60">
                    <span className="text-[10px] font-black text-gray-400 block mb-1">إجمالي المبيعات</span>
                    <strong className="text-sm sm:text-base font-black text-gray-900 dark:text-white font-mono block tabular-nums">
                        {data.total_sales.toLocaleString('ar-LY', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[9px] text-gray-400 font-bold">طلب مكتمل</span>
                </div>

                {/* 2. COGS (Cost of ingredients) */}
                <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/50 dark:border-amber-900/30">
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 block mb-1">تكلفة المواد (COGS)</span>
                    <strong className="text-sm sm:text-base font-black text-amber-800 dark:text-amber-300 font-mono block tabular-nums">
                        {data.total_cogs.toLocaleString('ar-LY', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">المكونات والوصفات</span>
                </div>

                {/* 3. Gross Profit & Margin */}
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200/50 dark:border-indigo-900/30">
                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 block mb-1">مجمل الربح</span>
                    <strong className={`text-sm sm:text-base font-black font-mono block tabular-nums ${data.gross_profit >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-rose-600'}`}>
                        {data.gross_profit.toLocaleString('ar-LY', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="inline-block text-[9px] font-black text-indigo-600 dark:text-indigo-400">
                        هامش {data.gross_margin_percentage}%
                    </span>
                </div>

                {/* 4. Operating Expenses & Salaries */}
                <div className="p-3.5 bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800/60">
                    <span className="text-[10px] font-black text-gray-400 block mb-1">المصروفات والرواتب</span>
                    <strong className="text-sm sm:text-base font-black text-gray-800 dark:text-gray-200 font-mono block tabular-nums">
                        {(data.total_expenses + data.total_salaries).toLocaleString('ar-LY', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[9px] text-gray-400 font-bold">تشغيل + أجور</span>
                </div>

                {/* 5. Deficit / Shortage (Unsettled) */}
                <div className={`p-3.5 rounded-2xl border ${
                    data.total_unsettled_deficits > 0
                        ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                        : 'bg-gray-50/70 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/60'
                }`}>
                    <span className="text-[10px] font-black text-rose-600 block mb-1 flex items-center justify-between">
                        <span>العجز المعلق</span>
                        {unsettledDeficitsCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        )}
                    </span>
                    <strong className="text-sm sm:text-base font-black text-rose-600 font-mono block tabular-nums">
                        {data.total_unsettled_deficits.toLocaleString('ar-LY', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[9px] text-rose-500 font-bold">
                        {unsettledDeficitsCount} وردية تحتاج تسوية
                    </span>
                </div>

                {/* 6. Net Operating Profit & Margin */}
                <div className={`p-3.5 rounded-2xl border ${
                    isProfitable
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                }`}>
                    <span className={`text-[10px] font-black block mb-1 ${isProfitable ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                        صافي الربح الفعلي
                    </span>
                    <strong className={`text-sm sm:text-base font-black font-mono block tabular-nums ${isProfitable ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}`}>
                        {data.net_profit.toLocaleString('ar-LY', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className={`inline-block text-[9px] font-black ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        هامش {data.net_profit_margin_percentage}%
                    </span>
                </div>

                {/* 7. Treasury Current Balance */}
                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 col-span-2 md:col-span-1">
                    <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 block mb-1">رصيد الخزينة</span>
                    <strong className="text-sm sm:text-base font-black text-blue-800 dark:text-blue-300 font-mono block tabular-nums">
                        {data.treasury_current_balance.toLocaleString('ar-LY', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">سيولة نقدية متوفرة</span>
                </div>
            </div>

            {/* Tabs for Statement Breakdown vs Shift Deficits */}
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                <button
                    onClick={() => setActiveTab('statement')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeTab === 'statement'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-900/40'
                    }`}
                >
                    كشف هيكل التكاليف وهوامش الربح
                </button>
                <button
                    onClick={() => setActiveTab('deficits')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'deficits'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-900/40'
                    }`}
                >
                    <span>كشف عجز وفروقات الورديات</span>
                    {unsettledDeficitsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-100 text-rose-700 font-bold">
                            {unsettledDeficitsCount} معلق
                        </span>
                    )}
                </button>
            </div>

            {/* TAB 1: Statement Breakdown */}
            {activeTab === 'statement' && (
                <div className="space-y-4">
                    {/* Visual Profit Progression Bar */}
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/60 space-y-2">
                        <div className="flex justify-between items-center text-xs font-black">
                            <span className="text-gray-600 dark:text-gray-300">توزيع الإيرادات والتكاليف</span>
                            <span className="text-indigo-600 font-mono">100% المبيعات ({data.total_sales.toLocaleString()} د.ل)</span>
                        </div>

                        {data.total_sales > 0 ? (
                            <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex font-mono text-[9px] text-white font-bold text-center leading-4">
                                <div
                                    style={{ width: `${Math.min(100, Math.max(0, (data.total_cogs / data.total_sales) * 100))}%` }}
                                    className="bg-amber-500 transition-all"
                                    title={`تكلفة المواد: ${data.total_cogs} د.ل`}
                                >
                                    {data.total_cogs > 0 && `${Math.round((data.total_cogs / data.total_sales) * 100)}%`}
                                </div>
                                <div
                                    style={{ width: `${Math.min(100, Math.max(0, ((data.total_expenses + data.total_salaries) / data.total_sales) * 100))}%` }}
                                    className="bg-blue-500 transition-all"
                                    title={`المصروفات والرواتب: ${data.total_expenses + data.total_salaries} د.ل`}
                                >
                                    {(data.total_expenses + data.total_salaries) > 0 && `${Math.round(((data.total_expenses + data.total_salaries) / data.total_sales) * 100)}%`}
                                </div>
                                <div
                                    style={{ width: `${Math.min(100, Math.max(0, (data.net_profit / data.total_sales) * 100))}%` }}
                                    className={`${isProfitable ? 'bg-emerald-600' : 'bg-rose-500'} transition-all`}
                                    title={`صافي الربح: ${data.net_profit} د.ل`}
                                >
                                    {data.net_profit > 0 && `${Math.round((data.net_profit / data.total_sales) * 100)}%`}
                                </div>
                            </div>
                        ) : (
                            <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded-full text-center text-[10px] text-gray-400 font-bold leading-4">
                                بانتظار اكتمال طلبات المبيعات لاحتساب المؤشرات
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-[10.5px] font-bold text-gray-500 pt-1">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                                <span>تكلفة المواد الخام: {data.total_cogs.toLocaleString()} د.ل</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                                <span>المصروفات التشغيلية والرواتب: {(data.total_expenses + data.total_salaries).toLocaleString()} د.ل</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${isProfitable ? 'bg-emerald-600' : 'bg-rose-500'} inline-block`}></span>
                                <span>صافي الربح: {data.net_profit.toLocaleString()} د.ل ({data.net_profit_margin_percentage}%)</span>
                            </span>
                        </div>
                    </div>

                    {/* Summary Table */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800/50 space-y-2 text-xs">
                            <h4 className="font-black text-gray-800 dark:text-gray-200 pb-1 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <span>بيان الدخل والمبيعات</span>
                                <Receipt className="w-4 h-4 text-indigo-600" />
                            </h4>
                            <div className="flex justify-between py-1 border-b border-dashed border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                                <span>إيرادات مبيعات الطلبات:</span>
                                <span className="font-mono font-bold text-gray-900 dark:text-white">{data.total_sales.toLocaleString()} د.ل</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-dashed border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                                <span>تكلفة المكونات والوجبات (COGS):</span>
                                <span className="font-mono font-bold text-amber-600">-{data.total_cogs.toLocaleString()} د.ل</span>
                            </div>
                            <div className="flex justify-between py-1.5 font-black text-indigo-700 dark:text-indigo-400">
                                <span>مجمل الربح (Gross Profit):</span>
                                <span className="font-mono">{data.gross_profit.toLocaleString()} د.ل</span>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800/50 space-y-2 text-xs">
                            <h4 className="font-black text-gray-800 dark:text-gray-200 pb-1 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <span>بيان المصروفات والعجوزات</span>
                                <Percent className="w-4 h-4 text-rose-600" />
                            </h4>
                            <div className="flex justify-between py-1 border-b border-dashed border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                                <span>المصروفات التشغيلية العامة:</span>
                                <span className="font-mono font-bold text-gray-900 dark:text-white">-{data.total_expenses.toLocaleString()} د.ل</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-dashed border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                                <span>المرتبات والأجور المنصرفة:</span>
                                <span className="font-mono font-bold text-gray-900 dark:text-white">-{data.total_salaries.toLocaleString()} د.ل</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-dashed border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                                <span>عجز الكاشير المعلق بالورديات:</span>
                                <span className="font-mono font-bold text-rose-600">-{data.total_unsettled_deficits.toLocaleString()} د.ل</span>
                            </div>
                            <div className="flex justify-between py-1.5 font-black text-emerald-700 dark:text-emerald-400">
                                <span>صافي الربح النهائي (Net Profit):</span>
                                <span className="font-mono">{data.net_profit.toLocaleString()} د.ل</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Shift Deficits & Variances Statement */}
            {activeTab === 'deficits' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-bold">
                            سجل الفروقات والعجوزات النقدية المسجلة عند إغلاق الورديات
                        </span>
                        {unsettledDeficitsCount > 0 && (
                            <span className="text-rose-600 font-black">
                                إجمالي العجز غير المرحل: {data.total_unsettled_deficits.toLocaleString()} د.ل
                            </span>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[650px] text-right text-xs">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/40 text-gray-400 font-black text-[10.5px] uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-4 py-3">الوردية</th>
                                    <th className="px-4 py-3">الكاشير</th>
                                    <th className="px-3 py-3">المتوقع بالدرج</th>
                                    <th className="px-3 py-3">الفعلي المحسوب</th>
                                    <th className="px-4 py-3">الفارق المالي</th>
                                    <th className="px-3 py-3">الحالة</th>
                                    <th className="px-4 py-3 text-center">إجراء الترحيل للخزينة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                                {data.deficits_list.length > 0 ? data.deficits_list.map((shift) => {
                                    const isDeficit = shift.variance! < -0.01;
                                    const isSurplus = shift.variance! > 0.01;
                                    const isBalanced = !isDeficit && !isSurplus;

                                    return (
                                        <tr key={shift.shift_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                                            <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                                                <span>{shift.shift_name}</span>
                                                <span className="block text-[10px] text-gray-400 font-mono">
                                                    #{shift.shift_id} • {shift.end_time ? new Date(shift.end_time).toLocaleDateString('ar-LY') : 'مفتوحة'}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-300">
                                                    <UserCircle className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>{shift.cashier_name || 'كاشير'}</span>
                                                </div>
                                            </td>

                                            <td className="px-3 py-3 font-mono font-bold text-gray-600 dark:text-gray-400 tabular-nums">
                                                {shift.expected_cash.toFixed(2)} د.ل
                                            </td>

                                            <td className="px-3 py-3 font-mono font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                                                {shift.actual_cash.toFixed(2)} د.ل
                                            </td>

                                            <td className="px-4 py-3">
                                                {isDeficit && (
                                                    <span className="font-mono font-black text-rose-600 text-xs">
                                                        -{shift.deficit_amount.toFixed(2)} د.ل (عجز)
                                                    </span>
                                                )}
                                                {isSurplus && (
                                                    <span className="font-mono font-black text-emerald-600 text-xs">
                                                        +{shift.variance?.toFixed(2)} د.ل (فائض)
                                                    </span>
                                                )}
                                                {isBalanced && (
                                                    <span className="font-bold text-gray-400 text-xs">
                                                        0.00 د.ل (مطابق)
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-3 py-3">
                                                {shift.is_settled ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                        <Check className="w-3 h-3" />
                                                        تم الترحيل للخزينة
                                                    </span>
                                                ) : isBalanced ? (
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        مطابق
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                        <Clock className="w-3 h-3" />
                                                        معلق لم يرحل
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                {!shift.is_settled && (isDeficit || isSurplus) ? (
                                                    <button
                                                        onClick={() => handleSettleShift(shift)}
                                                        disabled={settlingShiftId === shift.shift_id}
                                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-xs active:scale-95 ${
                                                            isDeficit
                                                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                                                        }`}
                                                    >
                                                        <Send className="w-3 h-3" />
                                                        <span>{settlingShiftId === shift.shift_id ? 'جاري الترحيل...' : (isDeficit ? 'ترحيل العجز للخزينة' : 'توريد الفائض للخزينة')}</span>
                                                    </button>
                                                ) : shift.is_settled ? (
                                                    <span className="text-[11px] font-bold text-gray-400">
                                                        مكتمل ومسوى
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-gray-300">--</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-300 font-bold italic">
                                            لا توجد ورديات مغلقة مسجلة حتى الآن
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}
