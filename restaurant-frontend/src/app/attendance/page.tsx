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
    Network,
    Cable,
    Wifi,
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
import { authenticateSmartphoneBiometrics, captureEthernetTerminalFingerprint, ETHERNET_PORTS, DEFAULT_ETHERNET_IP, DEFAULT_ETHERNET_PORT, BACKUP_ETHERNET_PORT } from '@/lib/biometrics';
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

    // Active View Tab: 'overview' (متابعة مجمل الحالات اليومية) | 'logs' (كشف الحركات التفصيلية)
    const [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview');
    const [overviewDate, setOverviewDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [overviewData, setOverviewData] = useState<any>(null);
    const [isLoadingOverview, setIsLoadingOverview] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'CHECKED_OUT' | 'ABSENT'>('ALL');

    // إعدادات جهاز البصمة الشبكي عبر كابل الإيثرنت (Cable EtherNet)
    const [ethernetIp, setEthernetIp] = useState(DEFAULT_ETHERNET_IP);
    const [ethernetPort, setEthernetPort] = useState<number>(DEFAULT_ETHERNET_PORT);
    const [isSyncingEthernet, setIsSyncingEthernet] = useState(false);
    const [showEthernetConfig, setShowEthernetConfig] = useState(false);
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
        fetchOverviewData();
    };

    const fetchOverviewData = async () => {
        try {
            setIsLoadingOverview(true);
            const data = await attendanceService.getAttendanceOverview(overviewDate);
            setOverviewData(data);
        } catch (err) {
            console.error('Failed to load attendance overview:', err);
        } finally {
            setIsLoadingOverview(false);
        }
    };

    useEffect(() => {
        if (isClient && isLoggedIn) {
            fetchOverviewData();
        }
    }, [overviewDate]);

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

    const handleEthernetBiometricPunch = async () => {
        setScanning(true);
        setErrorMsg(null);
        setResult(null);

        try {
            const res = await attendanceService.checkinEthernetTerminal(ethernetIp, ethernetPort, punchType);
            setResult(res);
            fetchFilteredLogs();
        } catch (err: any) {
            console.error('Ethernet terminal checkin error:', err);
            const msg = err.response?.data?.message || err.message || 'فشل الاتصال بجهاز البصمة الشبكي عبر كابل الإيثرنت (Cable EtherNet). تم فحص المنافذ 4370، 4444، 8888، والمنفذ الاحتياطي 5003.';
            setErrorMsg(msg);
        } finally {
            setScanning(false);
        }
    };

    const handleSyncEthernetLogs = async () => {
        setIsSyncingEthernet(true);
        setErrorMsg(null);
        try {
            const res = await attendanceService.syncEthernetAttendance(ethernetIp, ethernetPort);
            await alertDialog({
                title: 'مزامنة جهاز البصمة الشبكي',
                message: res.message || `تمت مزامنة الحركات بنجاح عبر كابل الإيثرنت (منفذ ${res.port_used || ethernetPort}).`,
                variant: 'success'
            });
            fetchFilteredLogs();
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'تعذر مزامنة حركات البصمة عبر كابل الإيثرنت.';
            setErrorMsg(msg);
        } finally {
            setIsSyncingEthernet(false);
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

                {/* TOP VIEW TABS (Hidden on Print) */}
                <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-3 print:hidden">
                    <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                            activeTab === 'overview'
                                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                                : 'bg-card dark:bg-card text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-100 dark:border-gray-800/40'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>متابعة الحضور والانصراف (مجمل الحالات اليومية)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                            activeTab === 'logs'
                                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                                : 'bg-card dark:bg-card text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-100 dark:border-gray-800/40'
                        }`}
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>كشف الحركات والتسجيلات التفصيلية</span>
                    </button>
                </div>

                {/* TOP CARDS / STATS (Hidden on Print) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6 print:hidden">
                    <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center gap-2 text-cyan-600 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-[11px] font-black">إجمالي قوة العمل / الموظفين</span>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                            {overviewData?.total_employees || employees.length}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold mt-1">
                            نسبة الحضور: {overviewData?.attendance_rate || '0%'}
                        </div>
                    </div>

                    <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center gap-2 text-emerald-600 mb-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[11px] font-black">حاضرون حالياً (على رأس العمل)</span>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {overviewData?.present_count || 0}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                            سجلوا حضور ولم ينصرفوا
                        </div>
                    </div>

                    <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <ArrowRightLeft className="w-4 h-4" />
                            <span className="text-[11px] font-black">أتموا الوردية (انصرفوا)</span>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400">
                            {overviewData?.checked_out_count || 0}
                        </div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1">
                            سجلوا انصراف اليوم
                        </div>
                    </div>

                    <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center gap-2 text-rose-600 mb-1">
                            <XCircle className="w-4 h-4" />
                            <span className="text-[11px] font-black">غائبون / لم يسجلوا حضور</span>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400">
                            {overviewData?.absent_count || 0}
                        </div>
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1">
                            لا توجد أي بصمة اليوم
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
                                ? 'مسح البصمة فورياً عبر مستشعر الهاتف أو جهاز البصمة الشبكي (Cable EtherNet)'
                                : 'مسح البصمة المعتمد عبر جهاز البصمة الشبكي الموصول بكابل الإيثرنت (Cable EtherNet)'
                            }
                        </p>

                        {/* Action Trigger Buttons */}
                        <div className="w-full space-y-2">
                            {isManager ? (
                                <button
                                    type="button"
                                    disabled={scanning || isSyncingEthernet}
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
                                            <span>بصمة الهاتف / المستشعر الذكي (صلاحية المدير)</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-right">
                                    <p className="text-[10px] text-blue-800 dark:text-blue-300 font-bold flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                        <span>بصمة الهاتف مخصصة للمدير. الحضور معتمد عبر جهاز البصمة الشبكي (Cable EtherNet) أدناه.</span>
                                    </p>
                                </div>
                            )}

                            {/* زر تسجيل البصمة عبر كابل الإيثرنت الشبكي */}
                            <button
                                type="button"
                                disabled={scanning || isSyncingEthernet}
                                onClick={handleEthernetBiometricPunch}
                                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm shadow-cyan-600/20 cursor-pointer"
                            >
                                <Network className="w-4 h-4 text-white" />
                                <span>تسجيل الحضور عبر كابل الإيثرنت (Cable EtherNet)</span>
                            </button>

                            {/* أزرار الإعدادات السريعة والمزامنة لجهاز كابل الإيثرنت */}
                            <div className="flex items-center justify-between gap-1.5 pt-1">
                                <button
                                    type="button"
                                    disabled={isSyncingEthernet || scanning}
                                    onClick={handleSyncEthernetLogs}
                                    className="flex-1 py-1.5 px-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-[10px] font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    title="سحب ومزامنة الحركات المسجلة في جهاز البصمة عبر كابل الإيثرنت"
                                >
                                    <RefreshCw className={`w-3 h-3 text-cyan-600 ${isSyncingEthernet ? 'animate-spin' : ''}`} />
                                    <span>{isSyncingEthernet ? 'جاري المزامنة...' : 'مزامنة سجلات الإيثرنت'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowEthernetConfig(!showEthernetConfig)}
                                    className={`py-1.5 px-2.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                                        showEthernetConfig 
                                            ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 text-cyan-700 dark:text-cyan-300' 
                                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    <Cable className="w-3 h-3 text-cyan-600" />
                                    <span>منفذ {ethernetPort} {ethernetPort === 5003 ? '(احتياطي)' : ''}</span>
                                </button>
                            </div>

                            {/* شاشة إعدادات المنافذ المدعومة لكابل الإيثرنت */}
                            {showEthernetConfig && (
                                <div className="p-2.5 mt-1 bg-gray-50 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl text-right space-y-2 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between text-[10px] font-black text-gray-700 dark:text-gray-300">
                                        <span>إعدادات كابل الإيثرنت (Cable EtherNet)</span>
                                        <span className="text-[9px] text-cyan-600 font-mono">RJ45 LAN</span>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-400 font-bold block">عنوان IP لجهاز البصمة:</label>
                                        <input
                                            type="text"
                                            value={ethernetIp}
                                            onChange={(e) => setEthernetIp(e.target.value)}
                                            placeholder="192.168.1.201"
                                            className="w-full px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-center text-xs text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-gray-400 font-bold block">اختر منفذ الشبكة المعتمد:</span>
                                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                                            {[
                                                { p: 4370, label: '4370 (ZKTeco)' },
                                                { p: 4444, label: '4444 (الجسر)' },
                                                { p: 8888, label: '8888 (Push SDK)' },
                                                { p: 5003, label: '5003 (منفذ احتياطي)', backup: true },
                                            ].map(({ p, label, backup }) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setEthernetPort(p)}
                                                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                                        ethernetPort === p
                                                            ? backup
                                                                ? 'bg-amber-600 text-white shadow-xs'
                                                                : 'bg-cyan-600 text-white shadow-xs'
                                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-cyan-400'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* زر فحص الاتصال الحقيقي الفوري بجهاز البصمة */}
                                    <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            type="button"
                                            disabled={scanning}
                                            onClick={async () => {
                                                setScanning(true);
                                                setErrorMsg(null);
                                                try {
                                                    const res = await attendanceService.testEthernetDevice(ethernetIp, ethernetPort);
                                                    await alertDialog({
                                                        title: 'اتصال جهاز البصمة متصل ✅',
                                                        message: res.message || `جهاز البصمة متصل بنجاح على العنوان ${ethernetIp}:${res.port}`,
                                                        variant: 'success'
                                                    });
                                                } catch (err: any) {
                                                    const msg = err.response?.data?.message || err.message || 'تعذر الاتصال بجهاز البصمة.';
                                                    setErrorMsg(msg);
                                                    await alertDialog({
                                                        title: 'جهاز البصمة غير متصل ❌',
                                                        message: msg,
                                                        variant: 'error'
                                                    });
                                                } finally {
                                                    setScanning(false);
                                                }
                                            }}
                                            className="w-full py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <Wifi className="w-3 h-3 text-cyan-600" />
                                            <span>فحص اتصال جهاز البصمة الآن (Ping / Test)</span>
                                        </button>
                                    </div>
                                </div>
                            )}
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
                        
                        {/* 1. OVERVIEW VIEW: متابعة الحضور والانصراف في مجمل الحالات */}
                        {activeTab === 'overview' && (
                            <div>
                                <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/40 space-y-4 print:hidden">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-5 h-5 text-cyan-600" />
                                            <div>
                                                <h3 className="font-black text-sm text-gray-900 dark:text-white">
                                                    متابعة حضور وانصراف الموظفين في مجمل الحالات
                                                </h3>
                                                <p className="text-[11px] text-gray-400 font-bold">
                                                    حالة كل موظف، توقيت أول حضور، توقيت آخر انصراف، وإجمالي ساعات العمل
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={overviewDate}
                                                onChange={(e) => setOverviewDate(e.target.value)}
                                                className="h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={fetchOverviewData}
                                                className="p-2 text-gray-400 hover:text-cyan-600 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 flex items-center gap-1.5 text-xs font-bold shrink-0"
                                                title="تحديث البيانات"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOverview ? 'animate-spin' : ''}`} />
                                                <span>تحديث</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Filter Buttons for Employee Status */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setStatusFilter('ALL')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                                statusFilter === 'ALL'
                                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                            }`}
                                        >
                                            الجميع ({overviewData?.employees_summary?.length || 0})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setStatusFilter('PRESENT')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                                                statusFilter === 'PRESENT'
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                                            }`}
                                        >
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            حاضرون حالياً ({overviewData?.present_count || 0})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setStatusFilter('CHECKED_OUT')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                                                statusFilter === 'CHECKED_OUT'
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40'
                                            }`}
                                        >
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            أتموا الوردية ({overviewData?.checked_out_count || 0})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setStatusFilter('ABSENT')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                                                statusFilter === 'ABSENT'
                                                    ? 'bg-rose-600 text-white shadow-sm'
                                                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40'
                                            }`}
                                        >
                                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                            غائبون ({overviewData?.absent_count || 0})
                                        </button>
                                    </div>
                                </div>

                                {/* Overview Table */}
                                <div className="overflow-x-auto text-xs scrollbar-thin">
                                    <table className="w-full min-w-[650px] text-right" dir="rtl">
                                        <thead>
                                            <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800/40 text-gray-600 dark:text-gray-300 print:bg-gray-100 print:text-black">
                                                <th className="p-3.5 font-black">الموظف</th>
                                                <th className="p-3.5 font-black">الدور الوظيفي</th>
                                                <th className="p-3.5 font-black">الحالة العامة</th>
                                                <th className="p-3.5 font-black">أول حضور</th>
                                                <th className="p-3.5 font-black">آخر انصراف</th>
                                                <th className="p-3.5 font-black">مدة الدوام المحسوبة</th>
                                                <th className="p-3.5 font-black text-center print:hidden">إجراء</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30 print:divide-gray-300">
                                            {isLoadingOverview ? (
                                                <tr>
                                                    <td colSpan={7} className="p-10 text-center text-gray-400 font-bold italic">
                                                        جاري تحميل مجمل حالات الحضور...
                                                    </td>
                                                </tr>
                                            ) : !overviewData?.employees_summary || overviewData.employees_summary.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="p-10 text-center text-gray-400 font-bold">
                                                        لا يوجد موظفون مسجلون في النظام.
                                                    </td>
                                                </tr>
                                            ) : (
                                                overviewData.employees_summary
                                                    .filter((emp: any) => statusFilter === 'ALL' || emp.status === statusFilter)
                                                    .map((emp: any) => {
                                                        const isPresent = emp.status === 'PRESENT';
                                                        const isCheckedOut = emp.status === 'CHECKED_OUT';
                                                        const isAbsent = emp.status === 'ABSENT';

                                                        return (
                                                            <tr key={emp.employee_id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/20 transition-colors print:hover:bg-transparent">
                                                                <td className="p-3.5 font-black text-gray-900 dark:text-gray-100 print:text-black">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 print:hidden font-black text-[11px]">
                                                                            {emp.employee_name?.charAt(0) || 'م'}
                                                                        </div>
                                                                        <div>
                                                                            <div>{emp.employee_name}</div>
                                                                            {emp.phone_number && (
                                                                                <div className="text-[10px] text-gray-400 font-normal">
                                                                                    {emp.phone_number}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-3.5 font-bold text-gray-600 dark:text-gray-400 print:text-gray-700">
                                                                    {emp.role}
                                                                </td>
                                                                <td className="p-3.5 font-bold">
                                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border print:border-none print:p-0 ${
                                                                        isPresent
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 print:text-emerald-800'
                                                                            : isCheckedOut
                                                                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 print:text-blue-800'
                                                                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40 print:text-rose-800'
                                                                    }`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                                                            isPresent ? 'bg-emerald-500 animate-pulse' : isCheckedOut ? 'bg-blue-500' : 'bg-rose-500'
                                                                        }`}></span>
                                                                        <span>{emp.status_display}</span>
                                                                    </span>
                                                                </td>
                                                                <td className="p-3.5 font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                                                                    {emp.first_check_in || '—'}
                                                                </td>
                                                                <td className="p-3.5 font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                                                                    {emp.last_check_out || '—'}
                                                                </td>
                                                                <td className="p-3.5 font-black text-gray-900 dark:text-white tabular-nums print:text-black">
                                                                    <span className={`px-2 py-0.5 rounded-md ${
                                                                        emp.work_duration_minutes > 0
                                                                            ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold'
                                                                            : 'text-gray-400'
                                                                    }`}>
                                                                        {emp.work_duration_formatted}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3.5 text-center print:hidden">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedEmployeeId(emp.employee_id.toString());
                                                                            setActiveTab('logs');
                                                                        }}
                                                                        className="px-2.5 py-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-lg transition-colors border border-cyan-200/50 dark:border-cyan-800/40"
                                                                    >
                                                                        عرض الكشف
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
                        )}

                        {/* 2. LOGS VIEW: كشف الحركات والتسجيلات التفصيلية */}
                        {activeTab === 'logs' && (
                            <div>
                                {/* Report Filter Controls (Hidden on Print) */}
                                <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/40 space-y-4 print:hidden">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="w-5 h-5 text-cyan-600" />
                                            <div>
                                                <h3 className="font-black text-sm text-gray-900 dark:text-white">
                                                    كشف الحركات والتسجيلات التفصيلية
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
                            </div>
                        )}

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
