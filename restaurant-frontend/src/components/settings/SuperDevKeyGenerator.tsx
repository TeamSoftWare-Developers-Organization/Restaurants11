'use client';

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Key,
    Cpu,
    Copy,
    Check,
    Sparkles,
    AlertTriangle,
    Terminal,
    Lock,
    Laptop,
    UserCheck
} from 'lucide-react';
import { licenseService, SuperDevGenerateKeyResponse } from '@/services/licenseService';

interface SuperDevKeyGeneratorProps {
    currentMachineId?: string;
    developerName?: string;
}

export default function SuperDevKeyGenerator({ currentMachineId, developerName }: SuperDevKeyGeneratorProps) {
    const [machineIdInput, setMachineIdInput] = useState('');
    const [clientNameInput, setClientNameInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState<SuperDevGenerateKeyResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Auto-fill or default helper
    const handleUseCurrentMachine = () => {
        if (currentMachineId) {
            setMachineIdInput(currentMachineId);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanId = machineIdInput.trim();
        if (!cleanId) {
            setError('يرجى إدخال معرّف الجهاز (Machine ID) للعميل.');
            return;
        }

        try {
            setIsGenerating(true);
            setError(null);
            setCopied(false);

            const result = await licenseService.generateKeyForMachine({
                machine_id: cleanId,
                client_name: clientNameInput.trim() || undefined
            });

            setGeneratedResult(result);
        } catch (err: any) {
            console.error('SuperDev key generation failed:', err);
            setError(err?.response?.data?.message || 'فشل في استخراج مفتاح التفعيل. تحقق من الصلاحيات.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyKey = () => {
        if (!generatedResult?.product_key) return;
        navigator.clipboard.writeText(generatedResult.product_key);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
            {/* Background glowing accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/30">
                        <Key className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                                مولد المفاتيح الفائق (SuperDev Master Key Generator)
                            </h3>
                            <span className="px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 rounded-full shadow-sm">
                                سري ومحمي
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                            خاصية حصرية للمطورين الفائقين: <strong className="text-amber-300">ظافر</strong> و <strong className="text-amber-300">أيوب</strong> فقط (محجوبة عن كافة المستخدمين حتى Admin)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">المطور النشط:</span>
                    <span className="font-bold text-amber-300">{developerName || 'ظافر / أيوب'}</span>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleGenerate} className="relative z-10 mt-6 space-y-5">
                {error && (
                    <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center gap-3 text-rose-300 text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Machine ID Input */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
                                <Cpu className="w-4 h-4 text-amber-400" />
                                معرّف جهاز العميل (Machine ID) <span className="text-rose-400">*</span>
                            </label>
                            {currentMachineId && (
                                <button
                                    type="button"
                                    onClick={handleUseCurrentMachine}
                                    className="text-[11px] text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1"
                                >
                                    <Laptop className="w-3 h-3" />
                                    استخدام جهاز الحالي ({currentMachineId})
                                </button>
                            )}
                        </div>
                        <input
                            type="text"
                            value={machineIdInput}
                            onChange={(e) => setMachineIdInput(e.target.value.toUpperCase())}
                            placeholder="مثال: E165-594A-81A8-FF6F"
                            className="w-full px-4 py-3 bg-slate-950/70 border border-white/20 rounded-xl font-mono text-amber-300 font-bold tracking-wider placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                            required
                        />
                    </div>

                    {/* Client Name Input */}
                    <div className="space-y-1.5">
                        <label className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
                            <Terminal className="w-4 h-4 text-indigo-400" />
                            اسم العميل / اسم المنشأة (اختياري)
                        </label>
                        <input
                            type="text"
                            value={clientNameInput}
                            onChange={(e) => setClientNameInput(e.target.value)}
                            placeholder="مثال: مطعم السلام - فرع طرابلس"
                            className="w-full px-4 py-3 bg-slate-950/70 border border-white/20 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end pt-2">
                    <button
                        type="submit"
                        disabled={isGenerating || !machineIdInput.trim()}
                        className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer text-sm sm:text-base"
                    >
                        {isGenerating ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                                جاري التوليد المشفر (HMAC-SHA256)...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                استخراج كود التفعيل للجهاز (Generate Key)
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Generated Key Result Box */}
            {generatedResult && (
                <div className="relative z-10 mt-8 p-6 bg-slate-950/90 border-2 border-emerald-500/50 rounded-2xl space-y-4 animate-in fade-in slide-in-from-bottom-3 shadow-2xl">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                            <Check className="w-5 h-5" />
                            {generatedResult.message}
                        </div>
                        <span className="text-xs text-slate-400">
                            معرّف الجهاز: <strong className="font-mono text-white">{generatedResult.machine_id}</strong>
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/60 p-4 rounded-xl border border-white/10">
                        <div className="space-y-1 text-center sm:text-right">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                مفتاح التفعيل الدائم الصالح (Product Key):
                            </span>
                            <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] select-all">
                                {generatedResult.product_key}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleCopyKey}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg ${
                                copied
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 text-slate-950" />
                                    تم النسخ بنجاح!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    نسخ المفتاح
                                </>
                            )}
                        </button>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                        <span>
                            نوع الترخيص: <span className="text-amber-400 font-bold">LIFETIME (دائم مدى الحياة)</span>
                        </span>
                        <span>
                            تم الإنشاء بواسطة المطور: <strong className="text-white">{generatedResult.generated_by}</strong>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
