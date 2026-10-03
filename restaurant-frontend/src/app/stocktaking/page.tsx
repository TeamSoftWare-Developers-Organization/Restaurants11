'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Sidebar, Modal } from '@/components';
import {
    ClipboardCheck,
    Search,
    Filter,
    CheckCircle2,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    History,
    Save,
    RotateCcw,
    Printer,
    FileSpreadsheet,
    Calendar,
    User,
    Package,
    Boxes,
    Info,
    Check,
    X,
    ChevronDown,
    Eye,
    TrendingDown,
    TrendingUp,
    Scale
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import {
    inventoryService,
    StocktakeAuditItem,
    StocktakeSession,
    StocktakeHistoryItem
} from '@/services/inventoryService';

interface AuditRowState {
    ingredient_id: number;
    name: string;
    unit: string;
    unit_display: string;
    cost_per_unit: number;
    system_stock: number;
    actual_stock: number | '';
    notes: string;
    image?: string | null;
}

function ItemImage({ src, name }: { src?: string | null; name: string }) {
    const [hasError, setHasError] = useState(false);

    if (!src || hasError) {
        return <Package className="w-4 h-4 text-gray-400" />;
    }

    let resolvedSrc = src;
    if (!resolvedSrc.startsWith('http://') && !resolvedSrc.startsWith('https://')) {
        const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
        resolvedSrc = `${backendBase}${resolvedSrc.startsWith('/') ? '' : '/'}${resolvedSrc}`;
    }

    return (
        <img
            src={resolvedSrc}
            alt={name}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
        />
    );
}

export default function StocktakingPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn, user } = useAuthStore();
    const router = useRouter();

    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'audit' | 'history'>('audit');

    // Audit State
    const [auditItems, setAuditItems] = useState<AuditRowState[]>([]);
    const [referenceNumber, setReferenceNumber] = useState('');
    const [performedBy, setPerformedBy] = useState('');
    const [sessionNotes, setSessionNotes] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'shortage' | 'surplus' | 'matched' | 'pending'>('all');

    // Confirm & Reconcile Modal
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState<any>(null);

    // History State
    const [historyList, setHistoryList] = useState<StocktakeSession[]>([]);
    const [selectedHistory, setSelectedHistory] = useState<StocktakeSession | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        } else {
            initStocktakeSession();
        }
    }, [isLoggedIn, router]);

    const initStocktakeSession = async () => {
        try {
            setIsLoading(true);
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');
            setReferenceNumber(`STK-${dateStr}-${timeStr}`);
            setPerformedBy(user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'مدير النظام');

            const items = await inventoryService.getItemsForStocktake();
            const initialAuditRows: AuditRowState[] = items.map((item) => {
                const cleanStock = typeof item.current_stock === 'number' ? Number(item.current_stock.toFixed(2)) : item.current_stock;
                return {
                    ingredient_id: item.id,
                    name: item.name,
                    unit: item.unit,
                    unit_display: item.unit_display,
                    cost_per_unit: item.cost_per_unit,
                    system_stock: cleanStock,
                    actual_stock: cleanStock, // Start defaulted to system count
                    notes: '',
                    image: item.image,
                };
            });
            setAuditItems(initialAuditRows);
        } catch (err) {
            console.error('Failed to init stocktake session', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            setIsLoading(true);
            const data = await inventoryService.getStocktakeHistory();
            setHistoryList(data);
        } catch (err) {
            console.error('Failed to load history', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitchMode = (mode: 'audit' | 'history') => {
        setViewMode(mode);
        if (mode === 'history') {
            loadHistory();
        }
    };

    // Row input handlers
    const handleActualStockChange = (id: number, val: string) => {
        const numVal = val === '' ? '' : parseFloat(val);
        setAuditItems((prev) =>
            prev.map((row) => (row.ingredient_id === id ? { ...row, actual_stock: numVal } : row))
        );
    };

    const handleStepStock = (id: number, delta: number) => {
        setAuditItems((prev) =>
            prev.map((row) => {
                if (row.ingredient_id === id) {
                    const current = typeof row.actual_stock === 'number' ? row.actual_stock : (typeof row.system_stock === 'number' ? row.system_stock : 0);
                    const nextVal = Math.max(0, Math.round((current + delta) * 100) / 100);
                    return { ...row, actual_stock: nextVal };
                }
                return row;
            })
        );
    };

    const handleMatchSingle = (id: number) => {
        setAuditItems((prev) =>
            prev.map((row) => (row.ingredient_id === id ? { ...row, actual_stock: typeof row.system_stock === 'number' ? Number(row.system_stock.toFixed(2)) : row.system_stock } : row))
        );
    };

    const handleMatchAllToSystem = () => {
        if (confirm('هل تريد ضبط جميع الكميات الفعلية لتطابق الرصيد الدفتري المسجل؟')) {
            setAuditItems((prev) => prev.map((row) => ({ ...row, actual_stock: typeof row.system_stock === 'number' ? Number(row.system_stock.toFixed(2)) : row.system_stock })));
        }
    };

    const handleResetAllToZero = () => {
        if (confirm('هل أنت متأكد من تصفير جميع الكميات المحصورة للبدء من الصفر؟')) {
            setAuditItems((prev) => prev.map((row) => ({ ...row, actual_stock: 0 })));
        }
    };

    const handleRowNotesChange = (id: number, notes: string) => {
        setAuditItems((prev) =>
            prev.map((row) => (row.ingredient_id === id ? { ...row, notes } : row))
        );
    };

    // Calculated metrics
    const computedMetrics = useMemo(() => {
        let matched = 0;
        let shortage = 0;
        let surplus = 0;
        let pending = 0;
        let totalSysVal = 0;
        let totalActVal = 0;
        let totalVarianceVal = 0;

        auditItems.forEach((row) => {
            const sysQty = row.system_stock;
            const cost = row.cost_per_unit;
            totalSysVal += sysQty * cost;

            if (row.actual_stock === '') {
                pending++;
            } else {
                const actQty = Number(row.actual_stock);
                const diff = actQty - sysQty;
                totalActVal += actQty * cost;
                totalVarianceVal += diff * cost;

                if (Math.abs(diff) < 0.0001) {
                    matched++;
                } else if (diff < 0) {
                    shortage++;
                } else {
                    surplus++;
                }
            }
        });

        return {
            totalItems: auditItems.length,
            matched,
            shortage,
            surplus,
            pending,
            totalSysVal: Math.round(totalSysVal * 100) / 100,
            totalActVal: Math.round(totalActVal * 100) / 100,
            totalVarianceVal: Math.round(totalVarianceVal * 100) / 100,
        };
    }, [auditItems]);

    // Filtered Rows
    const filteredRows = useMemo(() => {
        return auditItems.filter((row) => {
            const matchesSearch =
                row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.unit_display.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter === 'all') return true;
            if (row.actual_stock === '') return statusFilter === 'pending';

            const diff = Number(row.actual_stock) - row.system_stock;
            if (statusFilter === 'matched') return Math.abs(diff) < 0.0001;
            if (statusFilter === 'shortage') return diff < -0.0001;
            if (statusFilter === 'surplus') return diff > 0.0001;
            return true;
        });
    }, [auditItems, searchQuery, statusFilter]);

    // Submit Reconciliation
    const handleReconcileSubmit = async () => {
        try {
            setIsSubmitting(true);
            const payload = {
                reference_number: referenceNumber,
                performed_by: performedBy,
                notes: sessionNotes,
                auto_reconcile: true,
                items: auditItems.map((r) => ({
                    ingredient_id: r.ingredient_id,
                    actual_stock: r.actual_stock === '' ? r.system_stock : Number(r.actual_stock),
                    notes: r.notes || undefined,
                })),
            };

            const result = await inventoryService.reconcileStocktake(payload);
            setSubmitSuccess(result);
        } catch (err: any) {
            console.error('Reconciliation failed', err);
            alert(err.response?.data?.message || 'فشل اعتماد وتسوية الجرد. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrintSheet = () => {
        window.print();
    };

    const handleFinishSuccess = () => {
        setIsConfirmModalOpen(false);
        setSubmitSuccess(null);
        initStocktakeSession();
    };

    if (!isClient) return null;

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans overflow-hidden" dir="rtl">
            <Sidebar />

            <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? 'mr-20' : 'mr-64'} p-4 md:p-8 space-y-6`}>
                {/* Header Topbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800/60 pb-5">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
                                <ClipboardCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    جرد المنتجات والمخزون
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40">
                                        تسوية حية
                                    </span>
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                                    حصر الكميات الفعلية ومطابقتها دفترياً وتسوية فروقات العجز والهدر في المخزون
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* View Switcher & Quick Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-xl flex items-center border border-gray-200/80 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => handleSwitchMode('audit')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                    viewMode === 'audit'
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Scale className="w-3.5 h-3.5 text-amber-500" />
                                <span>جلسة الجرد الحالية</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSwitchMode('history')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                    viewMode === 'history'
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <History className="w-3.5 h-3.5 text-sky-500" />
                                <span>سجل الجرد السابق</span>
                            </button>
                        </div>

                        {viewMode === 'audit' && (
                            <>
                                <button
                                    type="button"
                                    onClick={handlePrintSheet}
                                    title="طباعة كشف الحصر اليدوي"
                                    className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 shadow-xs"
                                >
                                    <Printer className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsConfirmModalOpen(true)}
                                    disabled={auditItems.length === 0}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>اعتماد وتسوية الجرد</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {viewMode === 'audit' ? (
                    <>
                        {/* KPI Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                            {/* Card 1: Total Items */}
                            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs space-y-1">
                                <div className="flex items-center justify-between text-gray-400">
                                    <span className="text-[11px] font-bold">إجمالي المواد</span>
                                    <Package className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                                    {computedMetrics.totalItems}
                                </div>
                                <div className="text-[10px] text-gray-400 font-medium">مادة خاضعة للجرد</div>
                            </div>

                            {/* Card 2: Matched */}
                            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-950/40 shadow-xs space-y-1">
                                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                    <span className="text-[11px] font-bold">متطابقة تماماً</span>
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {computedMetrics.matched}
                                </div>
                                <div className="text-[10px] text-emerald-700/70 dark:text-emerald-400/60 font-medium">بدون أي فروقات</div>
                            </div>

                            {/* Card 3: Shortage */}
                            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-rose-100 dark:border-rose-950/40 shadow-xs space-y-1">
                                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                                    <span className="text-[11px] font-bold">مواد بها عجز</span>
                                    <TrendingDown className="w-4 h-4" />
                                </div>
                                <div className="text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                                    {computedMetrics.shortage}
                                </div>
                                <div className="text-[10px] text-rose-700/70 dark:text-rose-400/60 font-medium">الفعلي أقل من الدفتري</div>
                            </div>

                            {/* Card 4: Surplus */}
                            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-sky-100 dark:border-sky-950/40 shadow-xs space-y-1">
                                <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
                                    <span className="text-[11px] font-bold">مواد بها زيادة</span>
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div className="text-xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
                                    {computedMetrics.surplus}
                                </div>
                                <div className="text-[10px] text-sky-700/70 dark:text-sky-400/60 font-medium">الفعلي أكبر من الدفتري</div>
                            </div>

                            {/* Card 5: Financial Impact */}
                            <div className={`p-4 rounded-2xl border shadow-xs space-y-1 col-span-2 md:col-span-1 ${
                                computedMetrics.totalVarianceVal < 0
                                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                    : computedMetrics.totalVarianceVal > 0
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                            }`}>
                                <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                                    <span className="text-[11px] font-bold">صافي الفارق المالي</span>
                                    <span className="text-[10px] font-bold">د.ل</span>
                                </div>
                                <div className={`text-xl font-black tabular-nums ${
                                    computedMetrics.totalVarianceVal < 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : computedMetrics.totalVarianceVal > 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                    {computedMetrics.totalVarianceVal > 0 ? '+' : ''}
                                    {computedMetrics.totalVarianceVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-gray-400 font-medium">
                                    {computedMetrics.totalVarianceVal < 0 ? 'عجز مالي في المخزون' : computedMetrics.totalVarianceVal > 0 ? 'وفر / زيادة في المخزون' : 'مطابقة مالية تامة'}
                                </div>
                            </div>
                        </div>

                        {/* Session Metadata Card */}
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                    رقم إذن الجرد المرجعي
                                </label>
                                <input
                                    type="text"
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                    className="w-full h-9 bg-gray-50/50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 rounded-xl px-3 font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                    المسؤول عن الجرد الفعلي
                                </label>
                                <input
                                    type="text"
                                    value={performedBy}
                                    onChange={(e) => setPerformedBy(e.target.value)}
                                    className="w-full h-9 bg-gray-50/50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 rounded-xl px-3 font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                    ملاحظات عامة على الجلسة
                                </label>
                                <input
                                    type="text"
                                    value={sessionNotes}
                                    onChange={(e) => setSessionNotes(e.target.value)}
                                    placeholder="مثال: جرد نهاية الأسبوع / التدقيق الربع سنوي"
                                    className="w-full h-9 bg-gray-50/50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 rounded-xl px-3 font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                            </div>
                        </div>

                        {/* Search & Filter Toolbar */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800/60 flex flex-col md:flex-row items-center justify-between gap-3">
                                {/* Search */}
                                <div className="relative w-full md:w-80 group">
                                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="بحث باسم المادة أو وحدة القياس..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-10 bg-gray-50/50 dark:bg-gray-950/40 border border-gray-200/80 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-amber-500/20 rounded-xl pr-10 pl-4 text-xs font-bold transition-all outline-none"
                                    />
                                </div>

                                {/* Status Filter Tabs */}
                                <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                            statusFilter === 'all'
                                                ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/20'
                                                : 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        الكل ({computedMetrics.totalItems})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('shortage')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                            statusFilter === 'shortage'
                                                ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/20'
                                                : 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 hover:text-rose-600'
                                        }`}
                                    >
                                        عجز ({computedMetrics.shortage})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('surplus')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                            statusFilter === 'surplus'
                                                ? 'bg-sky-600 text-white shadow-xs shadow-sky-600/20'
                                                : 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 hover:text-sky-600'
                                        }`}
                                    >
                                        زيادة ({computedMetrics.surplus})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('matched')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                            statusFilter === 'matched'
                                                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                                                : 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 hover:text-emerald-600'
                                        }`}
                                    >
                                        مطابق ({computedMetrics.matched})
                                    </button>
                                </div>

                                {/* Helper bulk actions */}
                                <div className="flex items-center gap-1.5 self-end md:self-center">
                                    <button
                                        type="button"
                                        onClick={handleMatchAllToSystem}
                                        title="جعل كل الكميات الفعلية مطابقة للدفتري"
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-[11px] font-black transition-all active:scale-95"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>مطابقة الكل</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetAllToZero}
                                        title="تصفير الجرد الفعلي"
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-black transition-all active:scale-95"
                                    >
                                        <X className="w-3 h-3" />
                                        <span>تصفير</span>
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto text-sm">
                                <table className="w-full text-right" dir="rtl">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-gray-900/40 text-gray-400 font-black text-[11px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                                            <th className="px-5 py-3.5">المادة / المنتج</th>
                                            <th className="px-4 py-3.5 text-center">الوحدة</th>
                                            <th className="px-4 py-3.5 text-center">التكلفة</th>
                                            <th className="px-5 py-3.5 text-center bg-gray-100/40 dark:bg-gray-800/20">الرصيد الدفتري (النظام)</th>
                                            <th className="px-6 py-3.5 text-center bg-amber-500/5 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">الرصيد الفعلي (العد)</th>
                                            <th className="px-5 py-3.5 text-center">الفارق</th>
                                            <th className="px-5 py-3.5 text-center">الأثر المالي</th>
                                            <th className="px-5 py-3.5">ملاحظات البند / السبب</th>
                                            <th className="px-3 py-3.5 text-center">إجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={9} className="p-12 text-center text-gray-400 font-bold italic">
                                                    جاري تحميل أصناف المخزون...
                                                </td>
                                            </tr>
                                        ) : filteredRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="p-12 text-center">
                                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
                                                        <Boxes className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-500">لا توجد مواد مطابقة للبحث أو الفلتر المحدد</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRows.map((row) => {
                                                const sys = row.system_stock;
                                                const act = row.actual_stock === '' ? 0 : Number(row.actual_stock);
                                                const diff = Math.round((act - sys) * 1000) / 1000;
                                                const varianceVal = Math.round(diff * row.cost_per_unit * 100) / 100;
                                                const isMatched = Math.abs(diff) < 0.0001;
                                                const isShortage = diff < -0.0001;
                                                const isSurplus = diff > 0.0001;

                                                return (
                                                    <tr key={row.ingredient_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                                        {/* Item info */}
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden border border-gray-200/60 dark:border-gray-700/60">
                                                                    <ItemImage src={row.image} name={row.name} />
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-gray-900 dark:text-gray-100 text-xs">
                                                                        {row.name}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 font-medium">
                                                                        كود: #{row.ingredient_id}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Unit */}
                                                        <td className="px-4 py-3.5 text-center">
                                                            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-bold">
                                                                {row.unit_display}
                                                            </span>
                                                        </td>

                                                        {/* Cost per unit */}
                                                        <td className="px-4 py-3.5 text-center font-black tabular-nums text-xs text-gray-700 dark:text-gray-300">
                                                            {row.cost_per_unit.toFixed(2)} د.ل
                                                        </td>

                                                        {/* System Stock */}
                                                        <td className="px-5 py-3.5 text-center font-black tabular-nums text-xs bg-gray-50/60 dark:bg-gray-800/10 text-gray-800 dark:text-gray-200">
                                                            {typeof row.system_stock === 'number' ? Number(row.system_stock.toFixed(2)) : row.system_stock}
                                                        </td>

                                                        {/* Actual Stock Input */}
                                                        <td className="px-6 py-3.5 text-center bg-amber-500/5 dark:bg-amber-500/10">
                                                            <div className="inline-flex items-center gap-1 bg-white dark:bg-gray-950 p-1 rounded-xl border border-amber-300/80 dark:border-amber-700/50 shadow-xs">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStepStock(row.ingredient_id, -1)}
                                                                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center font-black text-xs transition-colors"
                                                                >
                                                                    -
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    value={row.actual_stock}
                                                                    onChange={(e) => handleActualStockChange(row.ingredient_id, e.target.value)}
                                                                    className="w-20 sm:w-24 text-center text-xs font-black tabular-nums bg-transparent outline-none text-gray-900 dark:text-white px-1"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStepStock(row.ingredient_id, 1)}
                                                                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center font-black text-xs transition-colors"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </td>

                                                        {/* Difference / Variance */}
                                                        <td className="px-5 py-3.5 text-center">
                                                            {isMatched ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                                    <span>0 (مطابق)</span>
                                                                </span>
                                                            ) : isShortage ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 tabular-nums">
                                                                    <ArrowDownRight className="w-3.5 h-3.5" />
                                                                    <span>{diff} {row.unit_display}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40 tabular-nums">
                                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                                    <span>+{diff} {row.unit_display}</span>
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Financial Impact */}
                                                        <td className="px-5 py-3.5 text-center font-black tabular-nums text-xs">
                                                            {isMatched ? (
                                                                <span className="text-gray-400">0.00 د.ل</span>
                                                            ) : (
                                                                <span className={isShortage ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'}>
                                                                    {varianceVal > 0 ? '+' : ''}{varianceVal.toFixed(2)} د.ل
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Row Notes */}
                                                        <td className="px-5 py-3.5">
                                                            <input
                                                                type="text"
                                                                value={row.notes}
                                                                placeholder="سبب الفارق (هدر، تلف، خطأ عد)..."
                                                                onChange={(e) => handleRowNotesChange(row.ingredient_id, e.target.value)}
                                                                className="w-full h-8 bg-gray-50/50 dark:bg-gray-950/40 border border-gray-200/60 dark:border-gray-800 rounded-lg px-2.5 text-[11px] font-medium text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-amber-500/20"
                                                            />
                                                        </td>

                                                        {/* Single Row Match Button */}
                                                        <td className="px-3 py-3.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMatchSingle(row.ingredient_id)}
                                                                title="مطابقة هذا البند بالرصيد الدفتري"
                                                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    /* History View */
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <History className="w-4 h-4 text-sky-500" />
                                    أرشيف جلسات الجرد المعتمدة السابقة
                                </h3>
                                <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                                    سجل تاريخي بكل عمليات الجرد والتسويات التي تم اعتمادها في النظام
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={loadHistory}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                            >
                                تحديث الأرشيف
                            </button>
                        </div>

                        <div className="overflow-x-auto text-sm">
                            <table className="w-full text-right" dir="rtl">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-900/40 text-gray-400 font-black text-[11px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-6 py-4">رقم إذن الجرد</th>
                                        <th className="px-6 py-4">التاريخ والوقت</th>
                                        <th className="px-6 py-4">القائم بالجرد</th>
                                        <th className="px-6 py-4 text-center">الأصناف المجرودة</th>
                                        <th className="px-6 py-4 text-center">أصناف العجز</th>
                                        <th className="px-6 py-4 text-center">صافي الفارق المالي</th>
                                        <th className="px-6 py-4 text-center">الحالة</th>
                                        <th className="px-6 py-4 text-center">التفاصيل</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                    {historyList.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-12 text-center text-gray-400 font-bold italic">
                                                لا توجد جلسات جرد سابقة محفوظة في النظام بعد.
                                            </td>
                                        </tr>
                                    ) : (
                                        historyList.map((session) => (
                                            <tr key={session.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                                <td className="px-6 py-4 font-black text-gray-900 dark:text-gray-100 text-xs">
                                                    {session.reference_number}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-500 text-xs">
                                                    {session.created_at}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300 text-xs">
                                                    {session.performed_by}
                                                </td>
                                                <td className="px-6 py-4 text-center font-black text-xs tabular-nums">
                                                    {session.total_items_counted}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {session.items_with_shortage > 0 ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-black">
                                                            {session.items_with_shortage} مادة
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs font-bold">لا يوجد</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center font-black text-xs tabular-nums">
                                                    <span className={session.net_variance_value < 0 ? 'text-rose-600' : session.net_variance_value > 0 ? 'text-emerald-600' : 'text-gray-400'}>
                                                        {session.net_variance_value > 0 ? '+' : ''}{session.net_variance_value.toFixed(2)} د.ل
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-black">
                                                        {session.status_display}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedHistory(session);
                                                            setIsDetailModalOpen(true);
                                                        }}
                                                        className="p-2 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-xl transition-colors"
                                                        title="استعراض بنود وفروقات هذه الجلسة"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Reconciliation Confirmation Modal */}
            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => !isSubmitting && setIsConfirmModalOpen(false)}
                title="تأكيد اعتماد وتسوية الجرد الفعلي"
            >
                {submitSuccess ? (
                    <div className="space-y-4 text-center py-4" dir="rtl">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-900 dark:text-white">
                                {submitSuccess.message}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">
                                تم حفظ إذن الجرد برقم: <span className="font-mono text-gray-800 dark:text-gray-200 font-black">{submitSuccess.reference_number}</span>
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-xs grid grid-cols-3 gap-2">
                            <div>
                                <span className="text-gray-400 block text-[10px]">المواد المجرودة</span>
                                <span className="font-black text-gray-800 dark:text-gray-200">{submitSuccess.total_items_counted}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block text-[10px]">المواد المتطابقة</span>
                                <span className="font-black text-emerald-600">{submitSuccess.items_matched}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block text-[10px]">مواد بها عجز</span>
                                <span className="font-black text-rose-600">{submitSuccess.items_with_shortage}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleFinishSuccess}
                            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                        >
                            إتمام والعودة لشاشة الجرد
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 text-right" dir="rtl">
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                            <p className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                تحذير هام قبل الاعتماد النهائي:
                            </p>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                                سيقوم النظام بتحديث الأرصدة الحالية لجميع المواد في المخزون فورياً لتطابق الكميات الفعلية التي قمت بحصرها، وتسجيل الفروقات المالية وحفظ سجل دائم للجلسة.
                            </p>
                        </div>

                        {/* Summary of Changes */}
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2 text-xs">
                            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 font-bold">
                                <span>إجمالي الأصناف الخاضعة للجرد:</span>
                                <span className="font-black text-gray-900 dark:text-white tabular-nums">{computedMetrics.totalItems} مادة</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                                <span>أصناف متطابقة بدون فروقات:</span>
                                <span className="font-black tabular-nums">{computedMetrics.matched} مادة</span>
                            </div>
                            <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-bold">
                                <span>أصناف بها عجز (نقص):</span>
                                <span className="font-black tabular-nums">{computedMetrics.shortage} مادة</span>
                            </div>
                            <div className="flex justify-between items-center text-sky-600 dark:text-sky-400 font-bold">
                                <span>أصناف بها زيادة (فائض):</span>
                                <span className="font-black tabular-nums">{computedMetrics.surplus} مادة</span>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-800 pt-2 flex justify-between items-center font-black">
                                <span>صافي الفارق المالي الإجمالي:</span>
                                <span className={`text-sm tabular-nums ${computedMetrics.totalVarianceVal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {computedMetrics.totalVarianceVal > 0 ? '+' : ''}{computedMetrics.totalVarianceVal.toFixed(2)} د.ل
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleReconcileSubmit}
                                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Save className="w-4 h-4" />
                                <span>{isSubmitting ? 'جاري ترحيل وتسوية المخزون...' : 'تأكيد التسوية والترحيل للمخزون'}</span>
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-4 h-11 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-black text-xs transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* History Details Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`تفاصيل إذن الجرد: ${selectedHistory?.reference_number || ''}`}
            >
                {selectedHistory && (
                    <div className="space-y-4 text-right" dir="rtl">
                        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-xs grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <span className="text-gray-400 block text-[10px]">تاريخ الجرد</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{selectedHistory.created_at}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block text-[10px]">القائم بالجرد</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{selectedHistory.performed_by}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block text-[10px]">الأصناف المجرودة</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{selectedHistory.total_items_counted} مادة</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block text-[10px]">صافي الفارق المالي</span>
                                <span className={`font-black ${selectedHistory.net_variance_value < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {selectedHistory.net_variance_value > 0 ? '+' : ''}{selectedHistory.net_variance_value.toFixed(2)} د.ل
                                </span>
                            </div>
                        </div>

                        {selectedHistory.notes && (
                            <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-black text-gray-800 dark:text-gray-200">ملاحظات: </span>
                                {selectedHistory.notes}
                            </div>
                        )}

                        <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
                            <table className="w-full text-right text-xs" dir="rtl">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-900 text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                                        <th className="p-2.5">المادة</th>
                                        <th className="p-2.5 text-center">الوحدة</th>
                                        <th className="p-2.5 text-center">الدفتري</th>
                                        <th className="p-2.5 text-center">الفعلي</th>
                                        <th className="p-2.5 text-center">الفارق</th>
                                        <th className="p-2.5 text-center">القيمة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {selectedHistory.items.map((it) => (
                                        <tr key={it.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                                            <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200">
                                                {it.ingredient_name}
                                            </td>
                                            <td className="p-2.5 text-center text-gray-500">
                                                {it.unit_display}
                                            </td>
                                            <td className="p-2.5 text-center tabular-nums text-gray-600 dark:text-gray-400">
                                                {it.system_stock}
                                            </td>
                                            <td className="p-2.5 text-center tabular-nums font-bold text-gray-900 dark:text-white">
                                                {it.actual_stock}
                                            </td>
                                            <td className="p-2.5 text-center tabular-nums font-black">
                                                <span className={it.difference < 0 ? 'text-rose-600' : it.difference > 0 ? 'text-sky-600' : 'text-emerald-600'}>
                                                    {it.difference > 0 ? '+' : ''}{it.difference}
                                                </span>
                                            </td>
                                            <td className="p-2.5 text-center tabular-nums font-bold">
                                                <span className={it.variance_value < 0 ? 'text-rose-600' : it.variance_value > 0 ? 'text-sky-600' : 'text-gray-400'}>
                                                    {it.variance_value > 0 ? '+' : ''}{it.variance_value.toFixed(2)} د.ل
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pt-2 text-left">
                            <button
                                type="button"
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl font-black text-xs transition-colors"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
