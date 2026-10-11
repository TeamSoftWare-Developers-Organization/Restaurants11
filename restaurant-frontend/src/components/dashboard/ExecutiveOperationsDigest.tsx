'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Activity,
    AlertTriangle,
    ShieldAlert,
    ChefHat,
    Calendar,
    Sparkles,
    TrendingUp,
    PackageX,
    CheckCircle2,
    RefreshCw,
    ArrowLeft,
    Clock,
    DollarSign,
    Box,
    Layers,
    ChevronLeft,
    ExternalLink
} from 'lucide-react';
import {
    executiveDigestService,
    ExecutiveDigestResponse,
    ActionableInsight
} from '@/services/executiveDigestService';

export default function ExecutiveOperationsDigest() {
    const router = useRouter();
    const [digest, setDigest] = useState<ExecutiveDigestResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const loadDigest = async (showRefreshSpinner = false) => {
        try {
            if (showRefreshSpinner) setIsRefreshing(true);
            else setIsLoading(true);
            const data = await executiveDigestService.getExecutiveBrief();
            setDigest(data);
        } catch (err) {
            console.error('Failed to load executive operations digest', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadDigest();
    }, []);

    if (isLoading) {
        return (
            <div className="bg-card dark:bg-card border border-gray-100 dark:border-gray-800/50 rounded-2xl p-4 sm:p-5 mb-6 shadow-xs animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-800" />
                        <div className="space-y-1.5">
                            <div className="w-48 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                            <div className="w-32 h-3 rounded bg-gray-100 dark:bg-gray-800/60" />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800/40 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!digest) return null;

    const getPriorityBadgeStyle = (priority: ActionableInsight['priority']) => {
        switch (priority) {
            case 'critical':
                return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/50';
            case 'warning':
                return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50';
            case 'info':
                return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/50';
            case 'success':
            default:
                return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';
        }
    };

    const getInsightIcon = (category: ActionableInsight['category']) => {
        switch (category) {
            case 'inventory':
                return <PackageX className="w-4 h-4 text-rose-500" />;
            case 'shifts':
                return <ShieldAlert className="w-4 h-4 text-amber-500" />;
            case 'kitchen':
                return <ChefHat className="w-4 h-4 text-amber-500" />;
            case 'reservations':
                return <Calendar className="w-4 h-4 text-blue-500" />;
            case 'finance':
                return <Sparkles className="w-4 h-4 text-purple-500" />;
            default:
                return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        }
    };

    return (
        <section className="bg-card dark:bg-card border border-gray-100 dark:border-gray-800/60 rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-xs relative overflow-hidden">
            {/* Top Bar: Title, Live Pulse & Quick Navigation Pills */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </span>
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-none">
                                الموجز التنفيذي الذكي للإدارة
                            </h2>
                            <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 px-2 py-0.5 rounded-full">
                                AI Operations Digest
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold mt-1">
                            مؤشرات التشغيل اللحظية | صحة العمليات: <strong className="text-emerald-600 dark:text-emerald-400">{digest.health_label} ({digest.health_score}%)</strong>
                        </p>
                    </div>
                </div>

                {/* Quick Navigation Pills for the 6 Core Operations */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => router.push('/purchases')}
                        className="px-2.5 py-1 text-[11px] font-black rounded-xl bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-800 transition-all flex items-center gap-1"
                    >
                        <Box className="w-3 h-3 text-rose-500" />
                        <span>المشتريات</span>
                    </button>
                    <button
                        onClick={() => router.push('/inventory')}
                        className="px-2.5 py-1 text-[11px] font-black rounded-xl bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-800 transition-all flex items-center gap-1"
                    >
                        <span>المخزون</span>
                    </button>
                    <button
                        onClick={() => router.push('/shifts')}
                        className="px-2.5 py-1 text-[11px] font-black rounded-xl bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-800 transition-all flex items-center gap-1"
                    >
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>الورديات</span>
                    </button>
                    <button
                        onClick={() => router.push('/kitchen')}
                        className="px-2.5 py-1 text-[11px] font-black rounded-xl bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-800 transition-all flex items-center gap-1"
                    >
                        <ChefHat className="w-3 h-3 text-blue-500" />
                        <span>المطبخ (KDS)</span>
                    </button>
                    <button
                        onClick={() => router.push('/reservations')}
                        className="px-2.5 py-1 text-[11px] font-black rounded-xl bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-800 transition-all flex items-center gap-1"
                    >
                        <Calendar className="w-3 h-3 text-purple-500" />
                        <span>الحجوزات</span>
                    </button>
                    <button
                        onClick={() => router.push('/employees')}
                        className="px-2.5 py-1 text-[11px] font-black rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 transition-all flex items-center gap-1"
                    >
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>الجدولة الذكية</span>
                    </button>

                    <button
                        onClick={() => loadDigest(true)}
                        disabled={isRefreshing}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        title="تحديث البيانات اللحظية"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* 4 Core Operational Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                {/* 1. المخزون */}
                <div
                    onClick={() => router.push('/inventory')}
                    className="group bg-gray-50/60 dark:bg-gray-900/30 hover:bg-white dark:hover:bg-gray-900/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/60 transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                >
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-gray-500 dark:text-gray-400">حالة المخزون</span>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            digest.inventory.critical_count > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                        }`}>
                            <Box className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-black tabular-nums ${
                            digest.inventory.critical_count > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                            {digest.inventory.critical_count > 0 ? digest.inventory.critical_count : 'مستقر'}
                        </span>
                        {digest.inventory.critical_count > 0 && (
                            <span className="text-[10px] font-bold text-gray-400">أصناف قاربت على النفاد</span>
                        )}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1 flex items-center justify-between">
                        <span>{digest.inventory.critical_count > 0 ? 'اضغط لطلب توريد' : 'كافة المواد متوفرة'}</span>
                        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                </div>

                {/* 2. المطبخ */}
                <div
                    onClick={() => router.push('/kitchen')}
                    className="group bg-gray-50/60 dark:bg-gray-900/30 hover:bg-white dark:hover:bg-gray-900/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/60 transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                >
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-gray-500 dark:text-gray-400">المطبخ وKDS</span>
                        <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                            <ChefHat className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                            {digest.kitchen.active_orders}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">طلب قيد التحضير</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1 flex items-center justify-between">
                        <span>{digest.kitchen.load_status}</span>
                        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                </div>

                {/* 3. الورديات والخزينة */}
                <div
                    onClick={() => router.push('/shifts')}
                    className="group bg-gray-50/60 dark:bg-gray-900/30 hover:bg-white dark:hover:bg-gray-900/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/60 transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                >
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-gray-500 dark:text-gray-400">الورديات والخزينة</span>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            digest.shifts.suspicious_count > 0 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                        }`}>
                            <Clock className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                            {digest.shifts.open_count}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">وردية نشطة</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1 flex items-center justify-between">
                        <span>
                            {digest.shifts.suspicious_count > 0
                                ? `${digest.shifts.suspicious_count} تتطلب مراجعة`
                                : 'الخزينة متطابقة 100%'}
                        </span>
                        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                </div>

                {/* 4. المبيعات والوفر المالي */}
                <div
                    onClick={() => router.push('/pos')}
                    className="group bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 hover:from-indigo-50 hover:to-purple-50 p-3.5 rounded-2xl border border-indigo-200/50 dark:border-indigo-900/40 transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                >
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">مبيعات اليوم والوفر</span>
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {digest.sales_and_savings.today_revenue}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">د.ل</span>
                    </div>
                    <div className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 mt-1 flex items-center justify-between">
                        <span>وفر عمالة: ~{digest.sales_and_savings.daily_ai_savings} د.ل</span>
                        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                </div>
            </div>

            {/* Actionable Insights: Direct Executive Directives with Quick Links */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                        نقاط التركيز الإدارية المباشرة (Actionable Insights):
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                        {digest.actionable_insights.length} توصيات ذات أولوية
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {digest.actionable_insights.map((insight) => (
                        <div
                            key={insight.id}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${getPriorityBadgeStyle(insight.priority)}`}
                        >
                            <div className="flex items-start gap-2.5 min-w-0">
                                <div className="p-2 rounded-xl bg-white/70 dark:bg-black/20 shrink-0 mt-0.5">
                                    {getInsightIcon(insight.category)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-black truncate leading-tight">
                                        {insight.title}
                                    </h4>
                                    <p className="text-[11px] opacity-80 line-clamp-1 mt-0.5 font-bold">
                                        {insight.description}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push(insight.action_url)}
                                className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 text-[11px] font-black shadow-xs shrink-0 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                            >
                                <span>{insight.action_label}</span>
                                <ArrowLeft className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
