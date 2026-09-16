'use client';

import React, { useState } from 'react';
import { Modal } from './index';
import { treasuryService } from '@/services/treasuryService';
import { Banknote, AlertCircle, CheckCircle } from 'lucide-react';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ExpenseModal({ isOpen, onClose, onSuccess }: ExpenseModalProps) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(parseFloat(amount))) {
            setError('يرجى إدخال مبلغ صحيح');
            return;
        }
        if (!description.trim()) {
            setError('يرجى إدخال سبب المصروف');
            return;
        }

        setIsLoading(true);
        try {
            await treasuryService.recordExpense({
                amount: parseFloat(amount),
                description: description,
                reference_type: 'expense'
            });
            onSuccess?.();
            onClose();
            setAmount('');
            setDescription('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل تسجيل المصروف');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="تسجيل مصروفات"
        >
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="flex flex-col items-center justify-center text-center mb-4">
                    <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-full flex items-center justify-center mb-2">
                        <Banknote className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-gray-500">سحب مبلغ من الدرج لتغطية مصروفات طارئة.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">المبلغ (د.ل)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full h-11 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 font-black outline-none focus:ring-2 focus:ring-rose-600/10 transition-all"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">السبب / الوصف</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full h-24 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-600/10 transition-all resize-none"
                            placeholder="مثلاً: شراء منظفات، دفع فاتورة..."
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
                        disabled={isLoading}
                        className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-lg shadow-rose-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                تأكيد السحب
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
