'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './index';
import { treasuryService } from '@/services/treasuryService';
import { useAuthStore } from '@/store/authStore';
import { Wallet, Clock, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

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

    useEffect(() => {
        if (isOpen) {
            setBalance('');
            setError(null);
        }
    }, [isOpen]);

    const handleOpenShift = async () => {
        if (!balance || isNaN(parseFloat(balance))) {
            setError('يرجى إدخال مبلغ صحيح');
            return;
        }

        setIsLoading(true);
        try {
            const shift = await treasuryService.openShift(parseFloat(balance));
            setActiveShift(shift);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل فتح الوردية');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseShift = async () => {
        if (!balance || isNaN(parseFloat(balance))) {
            setError('يرجى إدخال مبلغ الرصيد الفعلي');
            return;
        }

        setIsLoading(true);
        try {
            const shift = await treasuryService.closeShift(parseFloat(balance));
            setActiveShift(null);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل إغلاق الوردية');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'open' ? 'فتح وردية جديدة' : 'إغلاق الوردية'}
        >
            <div className="p-4 space-y-6">
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${mode === 'open'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600'
                        }`}>
                        {mode === 'open' ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">
                            {mode === 'open' ? 'بداية يوم عمل جديد' : 'نهاية فترة العمل'}
                        </h3>
                        <p className="text-sm font-bold text-gray-500">
                            {mode === 'open'
                                ? 'يرجى إدخال مبلغ العهدة (الفكة) المتاح في الدرج حالياً.'
                                : 'يرجى عد المبلغ النقدي الموجود في الدرج وإدخاله.'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block mr-1">
                            {mode === 'open' ? 'الرصيد الافتتاحي (د.ل)' : 'الرصيد الفعلي عند الإغلاق (د.ل)'}
                        </label>
                        <div className="relative group">
                            <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                            <input
                                type="number"
                                step="0.01"
                                value={balance}
                                onChange={(e) => setBalance(e.target.value)}
                                placeholder="0.00"
                                className="w-full h-12 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl pr-11 pl-4 font-black text-lg focus:ring-2 focus:ring-emerald-600/10 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-xl text-xs font-bold ring-1 ring-rose-100 dark:ring-rose-900/30">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={mode === 'open' ? handleOpenShift : handleCloseShift}
                            disabled={isLoading}
                            className={`w-full h-12 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${mode === 'open'
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    {mode === 'open' ? 'تأكيد فتح الوردية' : 'تأكيد إغلاق الوردية'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
