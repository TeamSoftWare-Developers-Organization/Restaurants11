'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Modal } from '@/components';
import {
    ReceiptText,
    Plus,
    History,
    AlertCircle,
    CheckCircle,
    TrendingDown,
    Calendar,
    FileText,
    Banknote
} from 'lucide-react';
import { treasuryService, TreasuryTransaction } from '@/services/treasuryService';
import { useUIStore } from '@/store/uiStore';

export default function ExpensesPage() {
    const { isSidebarCollapsed } = useUIStore();
    const [expenses, setExpenses] = useState<TreasuryTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const allTransactions = await treasuryService.listGeneralTransactions();
            // Filter only general expenses or shift expenses
            const filtered = allTransactions.filter(t =>
                t.reference_type === 'general_expense' || t.reference_type === 'expense'
            );
            setExpenses(filtered);
        } catch (error) {
            console.error('Failed to fetch expenses', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) {
            setError('يرجى إدخال المبلغ والوصف');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await treasuryService.recordGeneralExpense({
                amount: parseFloat(amount),
                description: description,
                reference_type: 'general_expense'
            });
            setShowAddModal(false);
            fetchData();
            setAmount('');
            setDescription('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل إضافة المصروف');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex bg-gray-50 dark:bg-background min-h-screen transition-colors duration-300" dir="rtl">
            <Sidebar />

            <main className={`flex-1 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-80'} min-h-screen p-6 lg:p-8 transition-all duration-300`}>
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20">
                            <ReceiptText className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">المصروفات العامة</h1>
                            <p className="text-gray-400 text-[13px] font-bold opacity-70 italic">تسجيل ومتابعة التكاليف التشغيلية للمطعم</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-rose-600/20 transition-all font-black text-sm flex items-center gap-2 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة مصروف جديد
                    </button>
                </header>

                <div className="bg-white dark:bg-card rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-800/40 flex items-center gap-2 bg-gray-50/50 dark:bg-gray-900/10">
                        <History className="w-5 h-5 text-rose-600" />
                        <h2 className="text-base font-black text-gray-900 dark:text-white">جدول المصروفات</h2>
                    </div>

                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr className="bg-gray-50/30 dark:bg-gray-900/20 text-gray-400 font-black text-[11px] uppercase tracking-widest">
                                    <th className="px-6 py-4">التاريخ</th>
                                    <th className="px-6 py-4">النوع</th>
                                    <th className="px-6 py-4">المبلغ</th>
                                    <th className="px-6 py-4">الوصف</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                                {expenses.length > 0 ? expenses.map((e) => (
                                    <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                                                    {new Date(e.created_at).toLocaleDateString('ar-EG')}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold tabular-nums">
                                                    {new Date(e.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${e.reference_type === 'general_expense'
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {e.reference_type === 'general_expense' ? 'مصروف عام' : 'مصروف وردية'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-black text-rose-600 tabular-nums text-lg">
                                            {e.amount.toLocaleString()} <small className="text-[10px] font-bold uppercase opacity-50 mr-0.5">د.ل</small>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 group-hover:translate-x-[-4px] transition-transform">
                                                <FileText className="w-4 h-4 text-gray-300" />
                                                <span className="text-gray-500 font-bold">{e.description}</span>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-300 font-bold italic">لم يتم تسجيل أي مصروفات بعد</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Add Expense Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setError(null);
                }}
                title="تسجيل مصروف جديد"
            >
                <form onSubmit={handleAddExpense} className="p-4 space-y-4">
                    <div className="flex flex-col items-center justify-center text-center mb-4">
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-full flex items-center justify-center mb-2">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-gray-500">إضافة بند مصروف جديد خارج ورديات الكاشير.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">المبلغ (د.ل)</label>
                            <div className="relative group">
                                <Banknote className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-rose-600 transition-colors" />
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full h-12 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl pr-11 pl-4 font-black text-lg outline-none focus:ring-2 focus:ring-rose-600/10 transition-all tabular-nums"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">بيان المصروف</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full h-24 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-600/10 transition-all resize-none"
                                placeholder="مثلاً: شراء صيانة مكيف، فاتورة كهرباء..."
                                required
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-xl text-xs font-bold ring-1 ring-rose-100 dark:ring-rose-900/30">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-lg shadow-rose-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    تأكيد تسجيل المصروف
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
