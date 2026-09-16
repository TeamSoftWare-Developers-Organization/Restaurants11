'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components';
import {
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    TrendingUp,
    Banknote,
    History,
    Calendar,
    Filter
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { treasuryService, TreasuryTransaction } from '@/services/treasuryService';

export default function TreasuryPage() {
    const { isSidebarCollapsed } = useUIStore();
    const [summary, setSummary] = useState<any>(null);
    const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [sum, trans] = await Promise.all([
                treasuryService.getTreasurySummary(),
                treasuryService.listGeneralTransactions()
            ]);
            setSummary(sum);
            setTransactions(trans);
        } catch (error) {
            console.error('Failed to fetch treasury data', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex bg-background min-h-screen" dir="rtl">
                <Sidebar />
                <main className={`flex-1 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-80'} p-8 flex items-center justify-center transition-all duration-300`}>
                    <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                </main>
            </div>
        );
    }

    const cards = [
        { label: 'الرصيد الحالي', value: summary?.total_balance, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'إجمالي الداخل', value: summary?.total_inflows, icon: ArrowUpCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'إجمالي الخارج', value: summary?.total_outflows, icon: ArrowDownCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    ];

    const stats = [
        { label: 'المبيعات', value: summary?.total_sales, sub: 'الإيرادات النقدية' },
        { label: 'المصروفات', value: summary?.total_expenses, sub: 'شاملة ورديات الكاشير' },
        { label: 'المرتبات', value: summary?.total_salaries, sub: 'مدفوعات الموظفين' },
    ];

    return (
        <div className="flex bg-gray-50 dark:bg-background min-h-screen transition-colors duration-300" dir="rtl">
            <Sidebar />

            <main className={`flex-1 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-80'} min-h-screen p-6 lg:p-8 transition-all duration-300`}>
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Banknote className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">خزينة المطعم</h1>
                            <p className="text-gray-400 text-[13px] font-bold opacity-70 italic">نظرة شاملة على التدفقات المالية والسيولة</p>
                        </div>
                    </div>
                </header>

                {/* Main Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {cards.map((card, idx) => (
                        <div key={idx} className="bg-white dark:bg-card p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/40 relative overflow-hidden group">
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">{card.label}</p>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                                        {card.value?.toLocaleString() || '0'}
                                        <span className="text-xs font-bold text-gray-400 mr-1 italic">د.ل</span>
                                    </h3>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                    <card.icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                                <card.icon className="w-24 h-24" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Secondary Stats */}
                    <div className="lg:col-span-1 space-y-4">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="bg-white dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-sm">
                                <p className="text-gray-400 font-black text-[10px] uppercase tracking-tighter mb-0.5">{stat.label}</p>
                                <h4 className="text-lg font-black text-gray-800 dark:text-white mb-0.5">{stat.value?.toLocaleString() || '0'} <small className="text-[10px] font-bold uppercase opacity-50">د.ل</small></h4>
                                <p className="text-[10px] font-bold text-gray-400 italic leading-none">{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Transactions History */}
                    <div className="lg:col-span-3 bg-white dark:bg-card rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-800/40 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/10">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-base font-black text-gray-900 dark:text-white">سجل الحركات المالية</h2>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors">
                                    <Filter className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-right text-sm">
                                <thead>
                                    <tr className="bg-gray-50/30 dark:bg-gray-900/20 text-gray-400 font-black text-[11px] uppercase tracking-widest">
                                        <th className="px-6 py-4">التاريخ والوقت</th>
                                        <th className="px-6 py-4">النوع</th>
                                        <th className="px-6 py-4">المصدر</th>
                                        <th className="px-6 py-4">المبلغ</th>
                                        <th className="px-6 py-4">الوصف</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                                    {transactions.length > 0 ? transactions.map((t) => {
                                        const refMap: any = {
                                            'order': { label: 'فاتورة بيع', color: 'text-emerald-600 bg-emerald-50' },
                                            'expense': { label: 'مصروف وردية', color: 'text-rose-600 bg-rose-50' },
                                            'general_expense': { label: 'مصروف عام', color: 'text-rose-600 bg-rose-100' },
                                            'salary': { label: 'صرف مرتب', color: 'text-blue-600 bg-blue-50' },
                                            'refund': { label: 'استرجاع', color: 'text-amber-600 bg-amber-50' },
                                        };
                                        const ref = refMap[t.reference_type] || { label: t.reference_type, color: 'text-gray-400 bg-gray-50' };

                                        return (
                                            <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-gray-400 dark:text-gray-500 tabular-nums">
                                                    {new Date(t.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {t.transaction_type === 'in' ? (
                                                            <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                                                        ) : (
                                                            <ArrowDownCircle className="w-4 h-4 text-rose-500" />
                                                        )}
                                                        <span className={`font-black uppercase text-[10px] ${t.transaction_type === 'in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {t.transaction_type === 'in' ? 'دخل' : 'صرف'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${ref.color}`}>
                                                        {ref.label}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 font-black tabular-nums ${t.transaction_type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {t.transaction_type === 'in' ? '+' : '-'}{t.amount.toLocaleString()} د.ل
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 dark:text-gray-500 font-bold truncate max-w-[200px]">
                                                    {t.description || '--'}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-300 font-bold italic">لا توجد حركات مالية مسجلة بعد</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
