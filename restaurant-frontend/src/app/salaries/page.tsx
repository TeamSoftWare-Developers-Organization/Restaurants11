'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Modal } from '@/components';
import {
    Users,
    DollarSign,
    History,
    Plus,
    Search,
    UserCircle,
    CheckCircle,
    AlertCircle,
    Calendar
} from 'lucide-react';
import { employeeService, Employee } from '@/services/employeeService';
import { treasuryService } from '@/services/treasuryService';
import { useUIStore } from '@/store/uiStore';

export default function SalariesPage() {
    const { isSidebarCollapsed } = useUIStore();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    // Form state
    const [amount, setAmount] = useState('');
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [emps, hist] = await Promise.all([
                employeeService.getEmployees(),
                treasuryService.getSalaries()
            ]);
            setEmployees(emps);
            setSalaryHistory(hist);
        } catch (error) {
            console.error('Failed to fetch salary data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaySalary = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !amount || !month) {
            setError('يرجى إكمال جميع الحقول المطلوبة');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await treasuryService.recordSalaryPayment({
                employee_id: selectedEmployee.id,
                amount: parseFloat(amount),
                month_covered: month,
                notes: notes
            });
            setShowPayModal(false);
            fetchData();
            // Reset form
            setAmount('');
            setNotes('');
            setSelectedEmployee(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل تسجيل صرف المرتب');
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
                        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                            <DollarSign className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">مرتبات الموظفين</h1>
                            <p className="text-gray-400 text-[13px] font-bold opacity-70 italic">إدارة مستحقات الموظفين وسجل المدفوعات</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Employees List */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white dark:bg-card rounded-2xl p-5 border border-gray-100 dark:border-gray-800/40 shadow-sm">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600" />
                                كادر الموظفين
                            </h3>
                            <div className="space-y-2">
                                {employees.map((emp) => (
                                    <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/40 border border-transparent hover:border-gray-100 dark:hover:border-gray-800 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 font-black">
                                                {emp.first_name[0]}{emp.last_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-800 dark:text-gray-200">{emp.first_name} {emp.last_name}</p>
                                                <p className="text-[10px] font-bold text-gray-400">{emp.role}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedEmployee(emp);
                                                setShowPayModal(true);
                                            }}
                                            className="p-2 bg-emerald-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-600/10"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Salary History */}
                    <div className="lg:col-span-2 bg-white dark:bg-card rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-800/40 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/10">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-emerald-600" />
                                <h2 className="text-base font-black text-gray-900 dark:text-white">سجل صرف المرتبات</h2>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead>
                                    <tr className="bg-gray-50/30 dark:bg-gray-900/20 text-gray-400 font-black text-[11px] uppercase tracking-widest">
                                        <th className="px-6 py-4">الموظف</th>
                                        <th className="px-6 py-4">الشهر</th>
                                        <th className="px-6 py-4">المبلغ</th>
                                        <th className="px-6 py-4">تاريخ الصرف</th>
                                        <th className="px-6 py-4">ملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                                    {salaryHistory.length > 0 ? salaryHistory.map((h) => {
                                        const emp = employees.find(e => e.id === h.employee_id);
                                        return (
                                            <tr key={h.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <UserCircle className="w-4 h-4 text-gray-300" />
                                                        <span className="font-black text-gray-800 dark:text-gray-200">
                                                            {emp ? `${emp.first_name} ${emp.last_name}` : `موظف #${h.employee_id}`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-500 tabular-nums">{h.month_covered}</td>
                                                <td className="px-6 py-4 font-black text-emerald-600 tabular-nums">{h.amount.toLocaleString()} د.ل</td>
                                                <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                                    {new Date(h.payment_date).toLocaleDateString('ar-EG')}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-400 font-bold max-w-[150px] truncate">{h.notes || '--'}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-300 font-bold italic">لا يوجد سجل مدفوعات مسبقة</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Pay Salary Modal */}
            <Modal
                isOpen={showPayModal}
                onClose={() => {
                    setShowPayModal(false);
                    setError(null);
                }}
                title="صرف مرتب موظف"
            >
                <form onSubmit={handlePaySalary} className="p-4 space-y-4">
                    <div className="flex flex-col items-center justify-center text-center mb-4">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">موظف: {selectedEmployee?.first_name} {selectedEmployee?.last_name}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">المبلغ (د.ل)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full h-11 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 font-black outline-none focus:ring-2 focus:ring-emerald-600/10 transition-all font-mono"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">عن شهر</label>
                                <div className="relative">
                                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="month"
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        className="w-full h-11 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl pr-10 pl-4 font-black text-xs outline-none focus:ring-2 focus:ring-emerald-600/10 transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">ملاحظات إضافية (اختياري)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-20 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-600/10 transition-all resize-none"
                                placeholder="مكافآت، خصومات، سلفة..."
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
                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    تأكيد صرف المرتب
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
