'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components';
import {
    Fingerprint,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Shield,
    ArrowRightLeft,
    RefreshCw,
    Upload,
    Calendar,
    Sparkles,
    Check
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import { attendanceService, AttendanceRecord, CheckinResult } from '@/services/attendanceService';

export default function AttendancePage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn } = useAuthStore();
    const router = useRouter();

    const [isClient, setIsClient] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [punchType, setPunchType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<CheckinResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [logs, setLogs] = useState<AttendanceRecord[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }

        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);

        fetchLogs();

        return () => clearInterval(timer);
    }, [isLoggedIn, router]);

    const fetchLogs = async () => {
        try {
            setIsLoadingLogs(true);
            const data = await attendanceService.getAttendanceLogs(20);
            setLogs(data);
        } catch (err) {
            console.error('Failed to fetch attendance logs:', err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanning(true);
        setErrorMsg(null);
        setResult(null);

        try {
            const res = await attendanceService.checkinWithFingerprint(file, punchType);
            setResult(res);
            fetchLogs();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'فشلت مطابقة البصمة، يرجى المحاولة مجدداً.';
            setErrorMsg(msg);
        } finally {
            setScanning(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (!isClient || !isLoggedIn) return null;

    return (
        <div className="flex bg-background dark:bg-background min-h-screen transition-colors duration-300 overflow-x-hidden min-w-0 w-full" dir="rtl">
            <Sidebar />

            <main className={`flex-1 min-w-0 w-full mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-4 md:p-6 lg:p-8 transition-all duration-300 overflow-x-hidden`}>
                
                {/* 1. Header */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-600/10 border border-cyan-500/20">
                            <Fingerprint className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">
                                حضور وانصراف الموظفين
                            </h1>
                            <p className="text-gray-400 dark:text-gray-500 text-xs md:text-sm font-bold opacity-80">
                                توثيق الحضور الذكي بالبصمة عبر شبكة عصبية التفافية (TensorFlow CNN)
                            </p>
                        </div>
                    </div>

                    {/* Clock & Status */}
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2 bg-card dark:bg-card px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800/40 shadow-xs font-mono font-black text-sm text-gray-800 dark:text-gray-100">
                            <Clock className="w-4 h-4 text-cyan-500" />
                            <span>{currentTime || '00:00:00'}</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT / SCANNER SECTION (col 12 on mobile, col 5 on desktop) */}
                    <section className="lg:col-span-5 bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 p-6 flex flex-col items-center text-center relative overflow-hidden">
                        
                        {/* Punch Type Selector */}
                        <div className="w-full bg-gray-100 dark:bg-gray-900/60 p-1 rounded-xl flex items-center gap-1 border border-gray-200/50 dark:border-gray-800/40 mb-6">
                            <button
                                type="button"
                                onClick={() => { setPunchType('CHECK_IN'); setResult(null); setErrorMsg(null); }}
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    punchType === 'CHECK_IN'
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>تسجيل حضور</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setPunchType('CHECK_OUT'); setResult(null); setErrorMsg(null); }}
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    punchType === 'CHECK_OUT'
                                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>تسجيل انصراف</span>
                            </button>
                        </div>

                        {/* Interactive Fingerprint Scanner Pad */}
                        <div className="relative my-4 group">
                            {/* Outer animated ring */}
                            <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 ${
                                scanning 
                                    ? 'bg-cyan-500/20 animate-pulse scale-105 shadow-[0_0_30px_rgba(6,182,212,0.4)]'
                                    : result
                                    ? 'bg-emerald-500/15 border-2 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                                    : errorMsg
                                    ? 'bg-rose-500/15 border-2 border-rose-500/40'
                                    : 'bg-cyan-600/5 dark:bg-cyan-600/10 border-2 border-dashed border-cyan-500/30 group-hover:border-cyan-500 group-hover:scale-102'
                            }`}>
                                <Fingerprint className={`w-20 h-20 transition-all duration-300 ${
                                    scanning 
                                        ? 'text-cyan-500 animate-bounce' 
                                        : result 
                                        ? 'text-emerald-500' 
                                        : errorMsg 
                                        ? 'text-rose-500' 
                                        : 'text-cyan-600 dark:text-cyan-400 group-hover:scale-110'
                                }`} />
                            </div>

                            {/* Floating AI badge */}
                            <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-gray-900/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-gray-700 flex items-center gap-1 whitespace-nowrap shadow-sm">
                                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                                <span>TensorFlow AI</span>
                            </div>
                        </div>

                        <h3 className="text-base font-black text-gray-900 dark:text-white mt-4 mb-1">
                            {scanning ? 'جاري فحص ومطابقة البصمة...' : 'الماسح الضوئي للبصمة'}
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold max-w-xs mb-6">
                            ضع إصبع الموظف على الماسح أو قم برفع عينة البصمة للتعرف الفوري
                        </p>

                        {/* Hidden file input for USB/file capture */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={scanning}
                        />

                        {/* Action Trigger Button */}
                        <button
                            type="button"
                            disabled={scanning}
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl font-black text-xs shadow-lg shadow-cyan-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {scanning ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>جاري استخراج الميزات والمطابقة...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    <span>مسح البصمة الآن (ماسح USB / ملف)</span>
                                </>
                            )}
                        </button>

                        {/* SUCCESS FEEDBACK CARD */}
                        {result && (
                            <div className="w-full mt-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 text-right animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <div>
                                        <h4 className="font-black text-sm text-emerald-900 dark:text-emerald-200">
                                            {result.employee_name}
                                        </h4>
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                                            {result.punch_type_display} · {result.role}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 font-bold">
                                    <span>الوقت: {result.time}</span>
                                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                                        تطابق: {result.match_confidence}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ERROR FEEDBACK CARD */}
                        {errorMsg && (
                            <div className="w-full mt-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 text-right flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <div className="text-xs font-bold text-rose-800 dark:text-rose-300">
                                    {errorMsg}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* RIGHT / ATTENDANCE LOGS TABLE (col 12 on mobile, col 7 on desktop) */}
                    <section className="lg:col-span-7 bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                        
                        <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-cyan-600" />
                                <h3 className="font-black text-sm text-gray-900 dark:text-white">سجلات الحضور الأخيرة</h3>
                            </div>
                            <button
                                type="button"
                                onClick={fetchLogs}
                                className="p-1.5 text-gray-400 hover:text-cyan-600 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                title="تحديث السجلات"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="overflow-x-auto text-xs scrollbar-thin">
                            <table className="w-full text-right" dir="rtl">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800/40">
                                        <th className="p-3.5 font-black text-gray-500 dark:text-gray-400">الموظف</th>
                                        <th className="p-3.5 font-black text-gray-500 dark:text-gray-400">الحركة</th>
                                        <th className="p-3.5 font-black text-gray-500 dark:text-gray-400">الوقت والتاريخ</th>
                                        <th className="p-3.5 font-black text-gray-500 dark:text-gray-400 text-center">دقة الذكاء الاصطناعي</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                                    {isLoadingLogs ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-400 font-bold italic">جاري تحميل السجلات...</td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-400 font-bold">لا توجد حركات حضور مسجلة اليوم.</td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => {
                                            const isCheckIn = log.punch_type === 'CHECK_IN';
                                            const dateObj = new Date(log.timestamp);
                                            const formattedDate = dateObj.toLocaleDateString('ar-LY', { month: 'short', day: 'numeric' });
                                            const formattedTime = dateObj.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });

                                            return (
                                                <tr key={log.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/20 transition-colors">
                                                    <td className="p-3.5 font-bold">
                                                        <div className="text-gray-900 dark:text-gray-100 font-black">{log.employee_name}</div>
                                                        <div className="text-[10px] text-gray-400">{log.role}</div>
                                                    </td>
                                                    <td className="p-3.5 font-bold">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                                            isCheckIn
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
                                                        }`}>
                                                            {isCheckIn ? <Check className="w-2.5 h-2.5" /> : <ArrowRightLeft className="w-2.5 h-2.5" />}
                                                            <span>{log.punch_type_display}</span>
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 font-bold text-gray-600 dark:text-gray-300 tabular-nums">
                                                        <div>{formattedTime}</div>
                                                        <div className="text-[10px] text-gray-400">{formattedDate}</div>
                                                    </td>
                                                    <td className="p-3.5 text-center font-black">
                                                        <span className="bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40 px-2 py-0.5 rounded-md text-[10px] font-mono">
                                                            {log.confidence_percentage}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                </div>

            </main>
        </div>
    );
}
