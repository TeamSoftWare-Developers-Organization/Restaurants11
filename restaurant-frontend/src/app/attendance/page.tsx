'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, Modal } from '@/components';
import {
    Fingerprint,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Shield,
    ArrowRightLeft,
    RefreshCw,
    Calendar,
    Sparkles,
    Check,
    Smartphone,
    Usb,
    Printer,
    FileSpreadsheet,
    Plus,
    Filter,
    Trash2,
    Download,
    Users,
    FileText,
    TrendingUp,
    Search
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import { attendanceService, AttendanceRecord, CheckinResult } from '@/services/attendanceService';
import { employeeService, Employee } from '@/services/employeeService';
import { settingsService, RestaurantSettings } from '@/services/settingsService';
import { authenticateSmartphoneBiometrics, captureUsbHardwareFingerprint } from '@/lib/biometrics';
import { confirmDialog, alertDialog } from '@/store/modalStore';

export default function AttendancePage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn, user, hasPermission } = useAuthStore();
    const router = useRouter();

    const isManager = 
        user?.role?.toUpperCase() === 'ADMIN' || 
        user?.role?.toLowerCase() === 'admin' || 
        user?.role?.toLowerCase() === 'manager' || 
        (user as any)?.is_superuser ||
        (user as any)?.is_staff;

    const [isClient, setIsClient] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [punchType, setPunchType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<CheckinResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Employees & Settings Data
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null);

    // Attendance Log & Filter States
    const [logs, setLogs] = useState<AttendanceRecord[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
    const [selectedPunchType, setSelectedPunchType] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');

    // Manual Attendance Modal State
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualForm, setManualForm] = useState({
        employee_id: 0,
        punch_type: 'CHECK_IN' as 'CHECK_IN' | 'CHECK_OUT',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        notes: ''
    });
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }

        // Restrict attendance page access to Manager or users with attendance permission
        if (user && !isManager && !hasPermission('attendance')) {
            router.push('/');
            return;
        }

        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);

        fetchInitialData();

        return () => clearInterval(timer);
    }, [isLoggedIn, router]);

    const fetchInitialData = async () => {
        try {
            const [emps, sets] = await Promise.all([
                employeeService.getEmployees().catch(() => []),
                settingsService.getSettings().catch(() => null)
            ]);
            setEmployees(emps);
            setRestaurantSettings(sets);
            if (emps.length > 0) {
                setManualForm(prev => ({ ...prev, employee_id: emps[0].id }));
            }
        } catch (err) {
            console.error('Failed to load initial employees or settings:', err);
        }
        fetchFilteredLogs();
    };

    const fetchFilteredLogs = async () => {
        try {
            setIsLoadingLogs(true);
            const params: any = {};
            if (selectedEmployeeId !== 'all') {
                params.employee_id = parseInt(selectedEmployeeId);
            }
            if (selectedPunchType !== 'all') {
                params.punch_type = selectedPunchType;
            }
            if (startDate) {
                params.start_date = startDate;
            }
            if (endDate) {
                params.end_date = endDate;
            }
            const data = await attendanceService.getAttendanceLogs(params);
            setLogs(data);
        } catch (err) {
            console.error('Failed to fetch attendance logs:', err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    // Re-fetch when filters change
    useEffect(() => {
        if (isClient && isLoggedIn) {
            fetchFilteredLogs();
        }
    }, [selectedEmployeeId, selectedPunchType, startDate, endDate]);

    const handleSmartphoneBiometricPunch = async () => {
        if (!isManager) {
            setErrorMsg('عذراً، مسح بصمة الهاتف الذكي محصور بصلاحية المدير والمشرفين فقط.');
            return;
        }
        setScanning(true);
        setErrorMsg(null);
        setResult(null);

        try {
            const authData = await authenticateSmartphoneBiometrics();
            const res = await attendanceService.checkinBiometric(authData.credential_id, punchType, authData.device_info);
            setResult(res);
            fetchFilteredLogs();
        } catch (err: any) {
            console.error('Smartphone biometric checkin error:', err);
            setErrorMsg(err.message || 'فشلت مطابقة بصمة الهاتف، يرجى المحاولة مجدداً.');
        } finally {
            setScanning(false);
        }
    };

    const handleUsbHardwarePunch = async () => {
        setScanning(true);
        setErrorMsg(null);
        setResult(null);

        try {
            const hwData = await captureUsbHardwareFingerprint(0, 'Attendance Checkin');
            const res = await attendanceService.checkinBiometric(hwData.credential_id, punchType, hwData.device_info);
            setResult(res);
            fetchFilteredLogs();
        } catch (err: any) {
            console.error('USB hardware checkin error:', err);
            setErrorMsg(err.message || 'فشل الاتصال بجهاز البصمة USB.');
        } finally {
            setScanning(false);
        }
    };

    const handleOpenManualModal = () => {
        const now = new Date();
        setManualForm({
            employee_id: employees[0]?.id || 0,
            punch_type: 'CHECK_IN',
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().slice(0, 5),
            notes: ''
        });
        setIsManualModalOpen(true);
    };

    const handleSaveManualRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualForm.employee_id) {
            await alertDialog({
                title: 'خطأ',
                message: 'يرجى اختيار الموظف أولاً.',
                variant: 'warning'
            });
            return;
        }

        try {
            setIsSubmittingManual(true);
            const timestampIso = `${manualForm.date}T${manualForm.time}:00`;
            await attendanceService.addManualRecord({
                employee_id: manualForm.employee_id,
                punch_type: manualForm.punch_type,
                timestamp: timestampIso,
                notes: manualForm.notes || 'تسجيل يدوي بواسطة الإدارة'
            });
            setIsManualModalOpen(false);
            await alertDialog({
                title: 'تم بنجاح',
                message: 'تم إضافة حركة الحضور/الانصراف بالوقت المحدد بنجاح.',
                variant: 'success'
            });
            fetchFilteredLogs();
        } catch (err: any) {
            console.error('Failed to add manual attendance:', err);
            await alertDialog({
                title: 'خطأ',
                message: err?.response?.data?.message || 'فشل تسجيل الحركة، يرجى التحقق من صحة البيانات.',
                variant: 'error'
            });
        } finally {
            setIsSubmittingManual(false);
        }
    };

    const handleDeleteRecord = async (logId: number) => {
        const confirmed = await confirmDialog({
            title: 'حذف سجل الحضور',
            message: 'هل أنت متأكد من حذف حركة الحضور/الانصراف هذه نهائياً من الكشف؟',
            confirmText: 'نعم، حذف',
            cancelText: 'إلغاء',
            variant: 'danger'
        });

        if (!confirmed) return;

        try {
            await attendanceService.deleteAttendanceLog(logId);
            fetchFilteredLogs();
        } catch (err) {
            console.error('Failed to delete log', err);
            await alertDialog({
                title: 'خطأ',
                message: 'فشل حذف السجل.',
                variant: 'error'
            });
        }
    };

    // Filter displayed logs by search query (name or notes)
    const displayedLogs = logs.filter(log => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            log.employee_name?.toLowerCase().includes(q) ||
            log.role?.toLowerCase().includes(q) ||
            log.notes?.toLowerCase().includes(q)
        );
    });

    // Summary statistics for current filtered view
    const totalCheckIns = displayedLogs.filter(l => l.punch_type === 'CHECK_IN').length;
    const totalCheckOuts = displayedLogs.filter(l => l.punch_type === 'CHECK_OUT').length;
    const uniqueEmployeesCount = new Set(displayedLogs.map(l => l.employee_id)).size;

    const handlePrintReport = () => {
        window.print();
    };

    if (!isClient || !isLoggedIn) return null;

    const selectedEmployeeObj = employees.find(e => e.id.toString() === selectedEmployeeId);

    return (
        <div className="flex flex-col lg:flex-row bg-background dark:bg-background min-h-screen transition-colors duration-300 overflow-x-hidden min-w-0 w-full" dir="rtl">
            
            {/* Sidebar (Hidden on Print) */}
            <div className="print:hidden">
                <Sidebar />
            </div>

            <main className={`flex-1 min-w-0 w-full mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-3.5 sm:p-6 lg:p-8 transition-all duration-300 overflow-x-hidden print:mr-0 print:p-0`}>
                
                {/* 1. Header (Hidden on Print) */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8 print:hidden">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-600/10 border border-cyan-500/20">
                            <Fingerprint className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">
                                حضور وانصراف الموظفين وكشف الدوام
                            </h1>
                            <p className="text-gray-400 dark:text-gray-500 text-xs md:text-sm font-bold opacity-80">
                                توثيق الحضور الذكي بالبصمة، واستخراج وطباعة كشوفات الحضور والانصراف المخصصة
                            </p>
                        </div>
                    </div>

                    {/* Clock & Actions */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-2 bg-card dark:bg-card px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800/40 shadow-xs font-mono font-black text-sm text-gray-800 dark:text-gray-100">
                            <Clock className="w-4 h-4 text-cyan-500" />
                            <span>{currentTime || '00:00:00'}</span>
                        </div>

                        {isManager && (
                            <button
                                type="button"
                                onClick={handleOpenManualModal}
                                className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-cyan-600/20 active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span>تسجيل يدوي بتوقيت مخصص</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handlePrintReport}
                            className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            <span>طباعة الكشف</span>
                        </button>
                    </div>
                </header>

                {/* PRINT-ONLY HEADER */}
                <div className="hidden print:block mb-6 p-4 border-b-2 border-gray-900 text-right">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-2xl font-black text-black">
                                {restaurantSettings?.name || 'مطعمنا'}
                            </h1>
                            <h2 className="text-base font-bold text-gray-700">
                                كشف حضور وانصراف الموظفين
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                {selectedEmployeeId === 'all' 
                                    ? 'كشف شامل لجميع المستخدمين والموظفين'
                                    : `كشف الموظف: ${selectedEmployeeObj ? `${selectedEmployeeObj.first_name} ${selectedEmployeeObj.last_name}` : 'موظف محدد'}`
                                }
                            </p>
                        </div>
                        <div className="text-left text-xs text-gray-600">
                            <div>تاريخ استخراج التقرير: {new Date().toLocaleDateString('ar-LY')}</div>
                            <div>الفترة: من {startDate || 'البداية'} إلى {endDate || 'اليوم'}</div>
                            <div>إجمالي الحركات: {displayedLogs.length} حركة</div>
                        </div>
                    </div>
                </div>

                {/* TOP CARDS / STATS (Hidden on Print) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6 print:hidden">
                    <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center gap-2 text-cyan-600 mb-1">
                            <FileText className="w-4 h-4" />
                            <span className="text-[11px] font-black">إجمالي الحركات بالكشف</span>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                            {displayedLogs.length}
                        </div>
                    </div>

                    <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center gap-2 text-emerald-600 mb-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[11px] font-black">حركات الحضور (Check In)</span>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {totalCheckIns}
                        </div>
                    </div>

                    <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center gap-2 text-rose-600 mb-1">
                            <ArrowRightLeft className="w-4 h-4" />
                            <span className="text-[11px] font-black">حركات الانصراف (Check Out)</span>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400">
                            {totalCheckOuts}
                        </div>
                    </div>

                    <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-[11px] font-black">عدد الموظفين المسجلين</span>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400">
                            {uniqueEmployeesCount}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT / SCANNER SECTION (Hidden on Print) */}
                    <section className="lg:col-span-4 bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 p-5 flex flex-col items-center text-center relative overflow-hidden print:hidden">
                        
                        <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800/40">
                            <div className="flex items-center gap-2 text-xs font-black text-gray-800 dark:text-gray-100">
                                <Fingerprint className="w-4 h-4 text-cyan-600" />
                                <span>تسجيل البصمة الفوري</span>
                            </div>
                            <span className="text-[10px] bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded-full font-bold">
                                TensorFlow AI
                            </span>
                        </div>

                        {/* Punch Type Selector */}
                        <div className="w-full bg-gray-100 dark:bg-gray-900/60 p-1 rounded-xl flex items-center gap-1 border border-gray-200/50 dark:border-gray-800/40 mb-5">
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
                        <div className="relative my-2 group">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                                scanning 
                                    ? 'bg-cyan-500/20 animate-pulse scale-105 shadow-[0_0_30px_rgba(6,182,212,0.4)]'
                                    : result
                                    ? 'bg-emerald-500/15 border-2 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                                    : errorMsg
                                    ? 'bg-rose-500/15 border-2 border-rose-500/40'
                                    : 'bg-cyan-600/5 dark:bg-cyan-600/10 border-2 border-dashed border-cyan-500/30 group-hover:border-cyan-500 group-hover:scale-102'
                            }`}>
                                <Fingerprint className={`w-16 h-16 transition-all duration-300 ${
                                    scanning 
                                        ? 'text-cyan-500 animate-bounce' 
                                        : result 
                                        ? 'text-emerald-500' 
                                        : errorMsg 
                                        ? 'text-rose-500' 
                                        : 'text-cyan-600 dark:text-cyan-400 group-hover:scale-110'
                                }`} />
                            </div>

                            <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-gray-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-700 flex items-center gap-1 whitespace-nowrap shadow-sm">
                                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                                <span>الماسح البيومتري</span>
                            </div>
                        </div>

                        <h3 className="text-sm font-black text-gray-900 dark:text-white mt-4 mb-1">
                            {scanning ? 'جاري قراءة ومطابقة البصمة...' : 'الماسح البيومتري المباشر'}
                        </h3>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold max-w-xs mb-5">
                            {isManager 
                                ? 'مسح البصمة فورياً عبر مستشعر الهاتف أو قارئ البصمة المكتبي USB'
                                : 'مسح البصمة المعتمد عبر قارئ البصمة المكتبي USB الموصول بالنظام'
                            }
                        </p>

                        {/* Action Trigger Buttons */}
                        <div className="w-full space-y-2">
                            {isManager ? (
                                <button
                                    type="button"
                                    disabled={scanning}
                                    onClick={handleSmartphoneBiometricPunch}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl font-black text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {scanning ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>جاري التحقق من المستشعر...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Smartphone className="w-4 h-4" />
                                            <span>بصمة الهاتف / المستشعر الذكي</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-right">
                                    <p className="text-[10px] text-blue-800 dark:text-blue-300 font-bold flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                        <span>بصمة الهاتف محصورة بالمدير. استخدم قارئ USB المكتبي.</span>
                                    </p>
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={scanning}
                                onClick={handleUsbHardwarePunch}
                                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 disabled:opacity-50 text-gray-800 dark:text-gray-200 rounded-xl font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700"
                            >
                                <Usb className="w-4 h-4 text-cyan-500" />
                                <span>مسح عبر قارئ البصمة USB</span>
                            </button>
                        </div>

                        {/* SUCCESS FEEDBACK CARD */}
                        {result && (
                            <div className="w-full mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 text-right animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <div>
                                        <h4 className="font-black text-xs text-emerald-900 dark:text-emerald-200">
                                            {result.employee_name}
                                        </h4>
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                                            {result.punch_type_display} · {result.role}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 font-bold">
                                    <span>الوقت: {result.time}</span>
                                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                                        تطابق: {result.match_confidence}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ERROR FEEDBACK CARD */}
                        {errorMsg && (
                            <div className="w-full mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 text-right flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-start gap-2">
                                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                    <div className="text-xs font-bold text-rose-800 dark:text-rose-300 leading-relaxed">
                                        {errorMsg}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* RIGHT / ATTENDANCE REPORT & TABLE (Takes full width on print) */}
                    <section className="lg:col-span-8 bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden print:border-none print:shadow-none print:p-0">
                        
                        {/* Report Filter Controls (Hidden on Print) */}
                        <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/40 space-y-4 print:hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-cyan-600" />
                                    <div>
                                        <h3 className="font-black text-sm text-gray-900 dark:text-white">
                                            كشف الحضور والانصراف المخصص
                                        </h3>
                                        <p className="text-[11px] text-gray-400 font-bold">
                                            تصفية حسب مستخدم معين أو جميع المستخدمين، وتحديد الفترة والتوقيت
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchFilteredLogs}
                                    className="p-2 text-gray-400 hover:text-cyan-600 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 flex items-center gap-1.5 text-xs font-bold shrink-0 self-end sm:self-auto"
                                    title="تحديث الكشف"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                                    <span>تحديث</span>
                                </button>
                            </div>

                            {/* Filters Bar */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
                                {/* Employee Selector */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 block mb-1">
                                        المستخدم / الموظف
                                    </label>
                                    <select
                                        value={selectedEmployeeId}
                                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                                    >
                                        <option value="all">كل المستخدمين (الجميع)</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.first_name} {emp.last_name} ({emp.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Punch Type Selector */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 block mb-1">
                                        نوع الحركة
                                    </label>
                                    <select
                                        value={selectedPunchType}
                                        onChange={(e) => setSelectedPunchType(e.target.value)}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                                    >
                                        <option value="all">الكل (حضور وانصراف)</option>
                                        <option value="CHECK_IN">حضور فقط (Check In)</option>
                                        <option value="CHECK_OUT">انصراف فقط (Check Out)</option>
                                    </select>
                                </div>

                                {/* From Date */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 block mb-1">
                                        من تاريخ
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                                    />
                                </div>

                                {/* To Date */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 block mb-1">
                                        إلى تاريخ
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                                    />
                                </div>
                            </div>

                            {/* Search bar within filtered logs */}
                            <div className="relative pt-1">
                                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 mt-0.5" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="بحث سريع باسم الموظف أو الملاحظات..."
                                    className="w-full h-9 bg-gray-50/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl pr-9 pl-3 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                                />
                            </div>
                        </div>

                        {/* Table of Attendance Logs */}
                        <div className="overflow-x-auto text-xs scrollbar-thin">
                            <table className="w-full min-w-[600px] text-right" dir="rtl">
                                <thead>
                                    <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800/40 text-gray-600 dark:text-gray-300 print:bg-gray-100 print:text-black">
                                        <th className="p-3.5 font-black">الموظف / المستخدم</th>
                                        <th className="p-3.5 font-black">الدور الوظيفي</th>
                                        <th className="p-3.5 font-black">نوع الحركة</th>
                                        <th className="p-3.5 font-black">التاريخ</th>
                                        <th className="p-3.5 font-black">توقيت الحركة</th>
                                        <th className="p-3.5 font-black">الملاحظات والتوثيق</th>
                                        {isManager && <th className="p-3.5 font-black text-center print:hidden">إجراء</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30 print:divide-gray-300">
                                    {isLoadingLogs ? (
                                        <tr>
                                            <td colSpan={isManager ? 7 : 6} className="p-10 text-center text-gray-400 font-bold italic">
                                                جاري تحميل كشف الحضور...
                                            </td>
                                        </tr>
                                    ) : displayedLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={isManager ? 7 : 6} className="p-10 text-center text-gray-400 font-bold">
                                                لا توجد سجلات حضور وانصراف مطابقة لمعايير البحث في هذه الفترة.
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedLogs.map((log) => {
                                            const isCheckIn = log.punch_type === 'CHECK_IN';
                                            const dateObj = new Date(log.timestamp);
                                            const formattedDate = dateObj.toLocaleDateString('ar-LY', { year: 'numeric', month: 'numeric', day: 'numeric' });
                                            const formattedTime = dateObj.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                                            return (
                                                <tr key={log.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/20 transition-colors print:hover:bg-transparent">
                                                    <td className="p-3.5 font-black text-gray-900 dark:text-gray-100 print:text-black">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 print:hidden font-black text-[11px]">
                                                                {log.employee_name?.charAt(0) || 'م'}
                                                            </div>
                                                            <span>{log.employee_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3.5 font-bold text-gray-600 dark:text-gray-400 print:text-gray-700">
                                                        {log.role}
                                                    </td>
                                                    <td className="p-3.5 font-bold">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border print:border-none print:p-0 ${
                                                            isCheckIn
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 print:text-emerald-800'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40 print:text-rose-800'
                                                        }`}>
                                                            {isCheckIn ? <Check className="w-2.5 h-2.5 print:hidden" /> : <ArrowRightLeft className="w-2.5 h-2.5 print:hidden" />}
                                                            <span>{log.punch_type_display}</span>
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                                                        {formattedDate}
                                                    </td>
                                                    <td className="p-3.5 font-black text-gray-900 dark:text-white tabular-nums print:text-black">
                                                        {formattedTime}
                                                    </td>
                                                    <td className="p-3.5 font-medium text-gray-500 dark:text-gray-400 text-[11px]">
                                                        {log.notes || 'توثيق البصمة'}
                                                    </td>
                                                    {isManager && (
                                                        <td className="p-3.5 text-center print:hidden">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteRecord(log.id)}
                                                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                                                title="حذف هذا القيد"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Print Footer Summary */}
                        <div className="hidden print:block p-4 mt-6 border-t-2 border-gray-900 text-xs">
                            <div className="flex justify-between items-center font-bold">
                                <div>إجمالي حركات الحضور: {totalCheckIns}</div>
                                <div>إجمالي حركات الانصراف: {totalCheckOuts}</div>
                                <div>توقيع المسؤول / الإدارة: ..............................</div>
                            </div>
                        </div>

                    </section>

                </div>

            </main>

            {/* Modal: Manual Attendance Record */}
            <Modal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                title="تسجيل حضور أو انصراف يدوي بتوقيت مخصص"
            >
                <form onSubmit={handleSaveManualRecord} className="space-y-4 text-right" dir="rtl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        يتيح هذا النموذج للإدارة تسجيل أو تصحيح وقت حضور أو انصراف موظف بدقة عند نسيان البصمة أو وجود ظرف مسبق.
                    </p>

                    <div>
                        <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                            اختر الموظف <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={manualForm.employee_id}
                            onChange={(e) => setManualForm({ ...manualForm, employee_id: parseInt(e.target.value) })}
                            className="w-full h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                            required
                        >
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.first_name} {emp.last_name} ({emp.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                                نوع الحركة
                            </label>
                            <select
                                value={manualForm.punch_type}
                                onChange={(e) => setManualForm({ ...manualForm, punch_type: e.target.value as any })}
                                className="w-full h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                            >
                                <option value="CHECK_IN">تسجيل حضور</option>
                                <option value="CHECK_OUT">تسجيل انصراف</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                                التاريخ
                            </label>
                            <input
                                type="date"
                                value={manualForm.date}
                                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                                className="w-full h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                            توقيت الحضور / الانصراف الدقيق <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="time"
                            value={manualForm.time}
                            onChange={(e) => setManualForm({ ...manualForm, time: e.target.value })}
                            className="w-full h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                            ملاحظات أو سبب التسجيل اليدوي
                        </label>
                        <textarea
                            rows={2}
                            value={manualForm.notes}
                            onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                            placeholder="مثال: إذن تأخير مسبق، أو نسيان توثيق البصمة عند الخروج..."
                            className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-cyan-500/20"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => setIsManualModalOpen(false)}
                            className="px-4 py-2 text-xs font-black text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingManual}
                            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                        >
                            {isSubmittingManual ? 'جاري الحفظ...' : 'حفظ في الكشف'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
