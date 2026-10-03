'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    Clock,
    UserCheck,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Check,
    X,
    TrendingUp,
    Briefcase,
    DollarSign,
    Layers,
    Monitor,
    Sparkles,
    Flame,
    Coffee,
    Moon,
    Sun,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    RefreshCw,
    BadgePercent,
    Tag,
    Receipt
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import {
    shiftService,
    ShiftAllocation,
    ShiftTemplate,
    ShiftSummary,
    CreateAllocationPayload,
    OvertimePayload,
    StandaloneOvertimePayload
} from '@/services/shiftService';
import { employeeService, Employee } from '@/services/employeeService';
import { Sidebar, Modal, DeleteConfirmModal } from '@/components';

// قائمة المهام والأعمال الإضافية الشائعة للاختيار السريع
const PRESET_DUTIES = [
    'تجهيز صالة الحفلات والمناسبات',
    'جرد المخزون الاستثنائي',
    'تغطية وردية زميل (نقص كادر)',
    'تنظيف وصيانة عميقة للمعدات',
    'تجهيز طلبيات خارجية وبوفيه',
    'مساعدة قسم التحضير بالمطبخ'
];

export default function ShiftsPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn, user } = useAuthStore();
    const router = useRouter();

    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [viewTab, setViewTab] = useState<'allocations' | 'overtime' | 'templates'>('allocations');

    // Filter & Date State
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().slice(0, 10);
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'active' | 'completed' | 'overtime'>('all');

    // Data State
    const [allocations, setAllocations] = useState<ShiftAllocation[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [summary, setSummary] = useState<ShiftSummary>({
        total_shifts_today: 0,
        active_pos_shifts: 0,
        total_overtime_hours: 0,
        total_overtime_cost: 0,
        scheduled_count: 0,
        completed_count: 0
    });

    // Modals
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
    const [isStandaloneOvertimeModalOpen, setIsStandaloneOvertimeModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [selectedAllocation, setSelectedAllocation] = useState<ShiftAllocation | null>(null);

    // Notifications & Confirmation State (No browser alert/confirm popups)
    const [toast, setToast] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
        id: number;
    } | null>(null);

    const [modalError, setModalError] = useState<string | null>(null);

    const [deleteConfirmState, setDeleteConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: async () => {},
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Date.now();
        setToast({ message, type, id });
        setTimeout(() => {
            setToast((current) => (current?.id === id ? null : current));
        }, 3500);
    };

    // Form state: New Allocation (with integrated overtime option)
    const [allocationForm, setAllocationForm] = useState<CreateAllocationPayload>({
        employee_id: 0,
        shift_template_id: undefined,
        shift_name: 'الوردية الصباحية',
        date: new Date().toISOString().slice(0, 10),
        start_time: '08:00',
        end_time: '16:00',
        pos_station: 'نقطة البيع الرئيسية (POS 1)',
        overtime_hourly_rate: 15.0,
        notes: '',
        has_overtime: false,
        overtime_hours: 1.0,
        extra_duties: '',
        overtime_status: 'pending'
    });

    // Form state: Standalone Overtime
    const [standaloneOvertimeForm, setStandaloneOvertimeForm] = useState<StandaloneOvertimePayload>({
        employee_id: 0,
        date: new Date().toISOString().slice(0, 10),
        overtime_hours: 1.5,
        overtime_hourly_rate: 15.0,
        extra_duties: '',
        overtime_status: 'pending',
        notes: ''
    });

    // Form state: Overtime Edit
    const [overtimeForm, setOvertimeForm] = useState<OvertimePayload>({
        has_overtime: true,
        overtime_hours: 1.0,
        overtime_hourly_rate: 15.0,
        extra_duties: '',
        overtime_status: 'pending'
    });

    // Form state: New Template
    const [templateForm, setTemplateForm] = useState({
        name: '',
        start_time: '08:00',
        end_time: '16:00',
        overtime_hourly_rate: 15.0,
        color: '#3b82f6',
        description: ''
    });

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        }
    }, [isLoggedIn, router]);

    // Fetch All Data
    const loadAllData = async () => {
        try {
            setIsLoading(true);
            const [allocData, templateData, empData, sumData] = await Promise.all([
                shiftService.getAllocations(selectedDate),
                shiftService.getTemplates(),
                employeeService.getEmployees(),
                shiftService.getSummary(selectedDate)
            ]);
            setAllocations(allocData);
            setTemplates(templateData);
            setEmployees(empData);
            setSummary(sumData);
            if (empData.length > 0) {
                if (allocationForm.employee_id === 0) {
                    setAllocationForm((prev) => ({ ...prev, employee_id: empData[0].id }));
                }
                if (standaloneOvertimeForm.employee_id === 0) {
                    setStandaloneOvertimeForm((prev) => ({ ...prev, employee_id: empData[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to load shift data', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isClient && isLoggedIn) {
            loadAllData();
        }
    }, [isClient, isLoggedIn, selectedDate]);

    // Handle Template Change in Allocation Form
    const handleTemplateSelection = (templateId: number | '') => {
        if (!templateId) {
            setAllocationForm((prev) => ({
                ...prev,
                shift_template_id: undefined,
                shift_name: 'وردية مخصصة'
            }));
            return;
        }
        const tmpl = templates.find((t) => t.id === Number(templateId));
        if (tmpl) {
            setAllocationForm((prev) => ({
                ...prev,
                shift_template_id: tmpl.id,
                shift_name: tmpl.name,
                start_time: tmpl.start_time,
                end_time: tmpl.end_time,
                overtime_hourly_rate: tmpl.overtime_hourly_rate
            }));
        }
    };

    // Submit Allocation
    const handleSaveAllocation = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);
        try {
            await shiftService.createAllocation(allocationForm);
            setIsAllocationModalOpen(false);
            setAllocationForm({
                employee_id: employees[0]?.id || 0,
                shift_template_id: undefined,
                shift_name: 'الوردية الصباحية',
                date: selectedDate,
                start_time: '08:00',
                end_time: '16:00',
                pos_station: 'نقطة البيع الرئيسية (POS 1)',
                overtime_hourly_rate: 15.0,
                notes: '',
                has_overtime: false,
                overtime_hours: 1.0,
                extra_duties: '',
                overtime_status: 'pending'
            });
            showToast('تم تخصيص الوردية بنجاح', 'success');
            loadAllData();
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.response?.data?.detail?.[0]?.msg || 'فشل تخصيص الوردية';
            setModalError(errorMsg);
            showToast(errorMsg, 'error');
        }
    };

    // Submit Standalone Overtime
    const handleSaveStandaloneOvertime = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);
        try {
            await shiftService.createStandaloneOvertime(standaloneOvertimeForm);
            setIsStandaloneOvertimeModalOpen(false);
            setStandaloneOvertimeForm({
                employee_id: employees[0]?.id || 0,
                date: selectedDate,
                overtime_hours: 1.5,
                overtime_hourly_rate: 15.0,
                extra_duties: '',
                overtime_status: 'pending',
                notes: ''
            });
            showToast('تم تسجيل العمل الإضافي بنجاح', 'success');
            loadAllData();
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.response?.data?.detail?.[0]?.msg || 'فشل تسجيل العمل الإضافي';
            setModalError(errorMsg);
            showToast(errorMsg, 'error');
        }
    };

    // Open Overtime Edit Modal
    const handleOpenOvertime = (allocation: ShiftAllocation) => {
        setModalError(null);
        setSelectedAllocation(allocation);
        setOvertimeForm({
            has_overtime: true,
            overtime_hours: allocation.overtime_hours > 0 ? allocation.overtime_hours : 1.0,
            overtime_hourly_rate: allocation.overtime_hourly_rate || 15.0,
            extra_duties: allocation.extra_duties || '',
            overtime_status: allocation.overtime_status !== 'none' ? allocation.overtime_status : 'pending'
        });
        setIsOvertimeModalOpen(true);
    };

    // Submit Overtime Edit
    const handleSaveOvertime = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAllocation) return;
        setModalError(null);
        try {
            await shiftService.recordOvertime(selectedAllocation.id, overtimeForm);
            setIsOvertimeModalOpen(false);
            showToast('تم حفظ تفاصيل العمل الإضافي بنجاح', 'success');
            loadAllData();
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.response?.data?.detail?.[0]?.msg || 'فشل حفظ العمل الإضافي';
            setModalError(errorMsg);
            showToast(errorMsg, 'error');
        }
    };

    // Update Overtime Status (Approve / Pay)
    const handleUpdateOvertimeStatus = async (alloc: ShiftAllocation, newStatus: 'approved' | 'paid') => {
        try {
            await shiftService.recordOvertime(alloc.id, {
                has_overtime: alloc.has_overtime,
                overtime_hours: alloc.overtime_hours,
                overtime_hourly_rate: alloc.overtime_hourly_rate,
                extra_duties: alloc.extra_duties || 'عمل إضافي معتمد',
                overtime_status: newStatus
            });
            showToast(newStatus === 'approved' ? 'تم اعتماد العمل الإضافي بنجاح' : 'تم تأكيد صرف مستحق العمل الإضافي', 'success');
            loadAllData();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'فشل تحديث حالة العمل الإضافي', 'error');
        }
    };

    // Delete Allocation
    const handleDeleteAllocation = (id: number) => {
        setDeleteConfirmState({
            isOpen: true,
            title: 'إلغاء تخصيص الوردية',
            message: 'هل أنت متأكد من إلغاء تخصيص هذه الوردية للموظف؟ لا يمكن التراجع عن هذا الإجراء.',
            onConfirm: async () => {
                try {
                    await shiftService.deleteAllocation(id);
                    showToast('تم إلغاء تخصيص الوردية بنجاح', 'success');
                    loadAllData();
                } catch (err: any) {
                    showToast(err.response?.data?.message || 'فشل إلغاء التخصيص', 'error');
                }
            }
        });
    };

    // Create Template
    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);
        try {
            await shiftService.createTemplate(templateForm);
            setIsTemplateModalOpen(false);
            setTemplateForm({
                name: '',
                start_time: '08:00',
                end_time: '16:00',
                overtime_hourly_rate: 15.0,
                color: '#3b82f6',
                description: ''
            });
            showToast('تم إنشاء قالب الوردية بنجاح', 'success');
            loadAllData();
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || 'فشل حفظ قالب الوردية';
            setModalError(errorMsg);
            showToast(errorMsg, 'error');
        }
    };

    // Delete Template
    const handleDeleteTemplate = (id: number) => {
        setDeleteConfirmState({
            isOpen: true,
            title: 'حذف قالب الوردية',
            message: 'هل أنت متأكد من حذف هذا القالب؟ سيتم الاحتفاظ بسجلات الورديات السابقة.',
            onConfirm: async () => {
                try {
                    await shiftService.deleteTemplate(id);
                    showToast('تم حذف قالب الوردية بنجاح', 'success');
                    loadAllData();
                } catch (err: any) {
                    showToast(err.response?.data?.message || 'فشل حذف القالب', 'error');
                }
            }
        });
    };

    // Quick Date Shifters
    const handleShiftDate = (days: number) => {
        const current = new Date(selectedDate);
        current.setDate(current.getDate() + days);
        setSelectedDate(current.toISOString().slice(0, 10));
    };

    // Filtered Allocations
    const filteredAllocations = useMemo(() => {
        return allocations.filter((a) => {
            const matchesSearch =
                a.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.shift_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.pos_station.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (a.extra_duties && a.extra_duties.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            if (statusFilter === 'all') return true;
            if (statusFilter === 'overtime') return a.has_overtime && a.overtime_hours > 0;
            return a.status === statusFilter;
        });
    }, [allocations, searchQuery, statusFilter]);

    // Overtime-only records
    const overtimeRecords = useMemo(() => {
        return allocations.filter((a) => a.has_overtime && a.overtime_hours > 0);
    }, [allocations]);

    if (!isClient) return null;

    return (
        <div className="flex flex-col lg:flex-row bg-background dark:bg-background min-h-screen transition-colors duration-300 overflow-x-hidden min-w-0 w-full" dir="rtl">
            <Sidebar />

            <main className={`flex-1 min-w-0 w-full mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-3.5 sm:p-6 lg:p-8 transition-all duration-300 overflow-x-hidden`}>
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                                    <Clock className="w-6 h-6" />
                                </span>
                                <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                                    تخصيص الورديات والعمل الإضافي
                                </h1>
                            </div>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                                تحديد توقيت الورديات للموظفين، والربط المباشر مع جلسات نقطة البيع، واحتساب تكاليف الأعمال والمهام الإضافية بالدينار الليبي
                            </p>
                        </div>

                        {/* Actions and View Switcher */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Tab Switcher */}
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl text-xs font-black">
                                <button
                                    onClick={() => setViewTab('allocations')}
                                    className={`px-3 sm:px-4 py-2 rounded-xl transition-all ${
                                        viewTab === 'allocations'
                                            ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                                    }`}
                                >
                                    جدول الورديات ({allocations.length})
                                </button>
                                <button
                                    onClick={() => setViewTab('overtime')}
                                    className={`px-3 sm:px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                                        viewTab === 'overtime'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                                    }`}
                                >
                                    <Briefcase className="w-3.5 h-3.5" />
                                    <span>سجل الأعمال الإضافية ({overtimeRecords.length})</span>
                                </button>
                                <button
                                    onClick={() => setViewTab('templates')}
                                    className={`px-3 sm:px-4 py-2 rounded-xl transition-all ${
                                        viewTab === 'templates'
                                            ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                                    }`}
                                >
                                    قوالب الورديات ({templates.length})
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <button
                                onClick={() => {
                                    setModalError(null);
                                    setIsStandaloneOvertimeModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-black transition-all active:scale-95"
                                title="تسجيل عمل أو مهمة إضافية جديدة لموظف"
                            >
                                <Briefcase className="w-4 h-4 text-amber-600" />
                                <span>+ تسجيل عمل إضافي</span>
                            </button>

                            <button
                                onClick={() => {
                                    setModalError(null);
                                    setIsAllocationModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black shadow-xs shadow-amber-600/20 transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span>تخصيص وردية لموظف</span>
                            </button>
                        </div>
                    </div>

                    {/* 4 Summary Cards (KPIs) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card 1: Total Shifts */}
                        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                                <span className="text-xs font-black">إجمالي ورديات اليوم</span>
                                <Calendar className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                                {summary.total_shifts_today}
                            </div>
                            <div className="text-[11px] text-gray-400 font-medium">
                                {summary.scheduled_count} مجدولة • {summary.completed_count} مكتملة
                            </div>
                        </div>

                        {/* Card 2: Active in POS */}
                        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-950/40 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                <span className="text-xs font-black">نشطة حالياً بنقطة البيع</span>
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                            </div>
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {summary.active_pos_shifts}
                            </div>
                            <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                                جلسات كاشير مفتوحة الآن
                            </div>
                        </div>

                        {/* Card 3: Total Overtime Hours */}
                        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-amber-100 dark:border-amber-950/40 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                                <span className="text-xs font-black">ساعات العمل الإضافي</span>
                                <Briefcase className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                                {summary.total_overtime_hours} <span className="text-xs font-bold text-gray-400">ساعة</span>
                            </div>
                            <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                                أعمال ومهام إضافية مسجلة
                            </div>
                        </div>

                        {/* Card 4: Total Overtime Cost */}
                        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-rose-100 dark:border-rose-950/40 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                                <span className="text-xs font-black">إجمالي تكلفة الإضافي</span>
                                <span className="text-xs font-bold">د.ل</span>
                            </div>
                            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                                {summary.total_overtime_cost.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-rose-700/80 dark:text-rose-400/80 font-medium">
                                مستحقات العمل الإضافي بالدينار
                            </div>
                        </div>
                    </div>

                    {/* VIEW 1: Allocations View */}
                    {viewTab === 'allocations' && (
                        <div className="space-y-4">
                            {/* Date Navigation & Search Controls */}
                            <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold">
                                {/* Date Picker with previous/next buttons */}
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <button
                                        onClick={() => handleShiftDate(-1)}
                                        className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-95"
                                        title="اليوم السابق"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <div className="relative flex items-center">
                                        <Calendar className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" />
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="h-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pr-9 pl-3 font-black text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleShiftDate(1)}
                                        className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-95"
                                        title="اليوم التالي"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                                        className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-black text-[11px] transition-all"
                                    >
                                        اليوم
                                    </button>
                                </div>

                                {/* Status Filter Pills */}
                                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                                    <button
                                        onClick={() => setStatusFilter('all')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                            statusFilter === 'all'
                                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        الكل ({allocations.length})
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('active')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                            statusFilter === 'active'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-emerald-600'
                                        }`}
                                    >
                                        نشطة الآن ({allocations.filter(a => a.is_pos_active).length})
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('scheduled')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                            statusFilter === 'scheduled'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-blue-600'
                                        }`}
                                    >
                                        مجدولة ({allocations.filter(a => a.status === 'scheduled').length})
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('overtime')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                            statusFilter === 'overtime'
                                                ? 'bg-amber-600 text-white shadow-xs'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-amber-600'
                                        }`}
                                    >
                                        بها إضافي ({allocations.filter(a => a.has_overtime).length})
                                    </button>
                                </div>

                                {/* Search input */}
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="بحث باسم الموظف أو المهمة..."
                                        className="w-full h-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pr-9 pl-4 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>
                            </div>

                            {/* Allocations Table */}
                            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
                                {isLoading ? (
                                    <div className="p-16 text-center text-gray-400 font-bold">
                                        جاري تحميل جدول الورديات...
                                    </div>
                                ) : filteredAllocations.length === 0 ? (
                                    <div className="p-16 text-center space-y-3">
                                        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center mx-auto">
                                            <Clock className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 dark:text-white">
                                            لا توجد ورديات مخصصة لهذا التاريخ
                                        </h3>
                                        <p className="text-xs text-gray-400 font-medium max-w-sm mx-auto">
                                            يمكنك البدء بتخصيص وردية عمل للموظف أو الكاشير وتحديد توقيت الوردية وساعات الإضافي.
                                        </p>
                                        <button
                                            onClick={() => setIsAllocationModalOpen(true)}
                                            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black hover:bg-amber-700 transition-all shadow-xs"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>تخصيص وردية الآن</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto text-sm">
                                        <table className="w-full text-right" dir="rtl">
                                            <thead>
                                                <tr className="bg-gray-50/60 dark:bg-gray-800/30 text-gray-400 font-black text-[11px] uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                                    <th className="px-5 py-4">الموظف / الدور</th>
                                                    <th className="px-5 py-4">الوردية والتوقيت</th>
                                                    <th className="px-5 py-4">نقطة البيع (POS)</th>
                                                    <th className="px-4 py-4 text-center">حالة الجلسة</th>
                                                    <th className="px-6 py-4 bg-amber-50/40 dark:bg-amber-950/10 text-amber-800 dark:text-amber-200">
                                                        الأعمال الإضافية والتكلفة
                                                    </th>
                                                    <th className="px-4 py-4 text-center">الإجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40 text-xs">
                                                {filteredAllocations.map((alloc) => (
                                                    <tr key={alloc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                                        {/* Employee Info */}
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-sm shrink-0">
                                                                    {alloc.employee_name.slice(0, 1)}
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-gray-900 dark:text-white text-xs">
                                                                        {alloc.employee_name}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                                        {alloc.employee_role}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Shift Timing */}
                                                        <td className="px-5 py-4">
                                                            <div>
                                                                <div className="font-black text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
                                                                    <span>{alloc.shift_name}</span>
                                                                </div>
                                                                <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black text-[11px] tabular-nums">
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{alloc.start_time} - {alloc.end_time}</span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* POS Station */}
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-bold text-xs">
                                                                <Monitor className="w-3.5 h-3.5 text-gray-400" />
                                                                <span>{alloc.pos_station}</span>
                                                            </div>
                                                        </td>

                                                        {/* Session / POS Status */}
                                                        <td className="px-4 py-4 text-center">
                                                            {alloc.is_pos_active ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-black text-[10px]">
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                    <span>نشط في نقطة البيع</span>
                                                                </span>
                                                            ) : alloc.status === 'completed' ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    <span>مكتملة</span>
                                                                </span>
                                                            ) : alloc.status === 'cancelled' ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                                                                    <span>ملغاة</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold text-[10px]">
                                                                    <span>مجدولة</span>
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Overtime Details & Cost */}
                                                        <td className="px-6 py-4 bg-amber-50/20 dark:bg-amber-950/5">
                                                            {alloc.has_overtime && alloc.overtime_hours > 0 ? (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="font-black text-amber-900 dark:text-amber-200 flex items-center gap-1">
                                                                            <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                                                                            <span>{alloc.overtime_hours} ساعة إضافية</span>
                                                                        </span>
                                                                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-100 font-black text-xs tabular-nums">
                                                                            {alloc.overtime_total_cost.toFixed(2)} د.ل
                                                                        </span>
                                                                    </div>
                                                                    {alloc.extra_duties && (
                                                                        <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium line-clamp-1">
                                                                            {alloc.extra_duties}
                                                                        </p>
                                                                    )}
                                                                    <div className="flex items-center gap-2 pt-0.5">
                                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                                                            alloc.overtime_status === 'approved'
                                                                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                                                                : alloc.overtime_status === 'paid'
                                                                                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                                                                : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                                                        }`}>
                                                                            {alloc.overtime_status_display}
                                                                        </span>
                                                                        {alloc.overtime_status === 'pending' && (
                                                                            <button
                                                                                onClick={() => handleUpdateOvertimeStatus(alloc, 'approved')}
                                                                                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 underline"
                                                                            >
                                                                                اعتماد فوري
                                                                            </button>
                                                                        )}
                                                                        {alloc.overtime_status === 'approved' && (
                                                                            <button
                                                                                onClick={() => handleUpdateOvertimeStatus(alloc, 'paid')}
                                                                                className="text-[10px] font-black text-blue-600 hover:text-blue-700 underline"
                                                                            >
                                                                                تم الصرف
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenOvertime(alloc)}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-900/40 transition-colors"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                    <span>تسجيل عمل إضافي</span>
                                                                </button>
                                                            )}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="px-4 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    onClick={() => handleOpenOvertime(alloc)}
                                                                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 transition-colors"
                                                                    title="تعديل أو تسجيل العمل الإضافي"
                                                                >
                                                                    <Briefcase className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteAllocation(alloc.id)}
                                                                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                                                                    title="إلغاء التخصيص"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VIEW 2: Overtime Dedicated Records View */}
                    {viewTab === 'overtime' && (
                        <div className="space-y-4">
                            {/* Overtime Top Action & Summary */}
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                        <Briefcase className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-900 dark:text-white text-base">
                                            سجل متابعة واعتماد الأعمال الإضافية
                                        </h3>
                                        <p className="text-xs text-gray-400 font-medium">
                                            استعراض كافة المهام وساعات العمل الإضافي وتكاليفها بالدينار الليبي واعتماد صرف المستحقات
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsStandaloneOvertimeModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black shadow-xs shadow-amber-600/20 transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>تسجيل مهمة إضافية جديدة</span>
                                </button>
                            </div>

                            {/* Overtime Records Table */}
                            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
                                {overtimeRecords.length === 0 ? (
                                    <div className="p-16 text-center space-y-3">
                                        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center mx-auto">
                                            <Briefcase className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 dark:text-white">
                                            لا توجد أعمال إضافية مسجلة لتاريخ {selectedDate}
                                        </h3>
                                        <p className="text-xs text-gray-400 font-medium max-w-sm mx-auto">
                                            يمكنك تسجيل مهمة أو ساعات عمل إضافية لأي موظف مع احتساب تكلفتها واعتمادها مباشرة.
                                        </p>
                                        <button
                                            onClick={() => setIsStandaloneOvertimeModalOpen(true)}
                                            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black hover:bg-amber-700 transition-all shadow-xs"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>تسجيل عمل إضافي الآن</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto text-sm">
                                        <table className="w-full text-right" dir="rtl">
                                            <thead>
                                                <tr className="bg-gray-50/60 dark:bg-gray-800/30 text-gray-400 font-black text-[11px] uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                                    <th className="px-5 py-4">الموظف / الدور</th>
                                                    <th className="px-5 py-4">الوردية المرتبطة</th>
                                                    <th className="px-4 py-4 text-center">ساعات الإضافي</th>
                                                    <th className="px-4 py-4 text-center">تكلفة الساعة</th>
                                                    <th className="px-5 py-4 text-center bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                                                        إجمالي المستحق
                                                    </th>
                                                    <th className="px-6 py-4">بيان وتفاصيل الأعمال الإضافية</th>
                                                    <th className="px-4 py-4 text-center">حالة الاعتماد</th>
                                                    <th className="px-4 py-4 text-center">إجراء الاعتماد والصرف</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40 text-xs">
                                                {overtimeRecords.map((item) => (
                                                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                                        <td className="px-5 py-4">
                                                            <div className="font-black text-gray-900 dark:text-white">
                                                                {item.employee_name}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 font-bold">
                                                                {item.employee_role}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <span className="font-bold text-gray-700 dark:text-gray-300">
                                                                {item.shift_name}
                                                            </span>
                                                            <div className="text-[10px] text-gray-400">
                                                                {item.start_time} - {item.end_time}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center font-black tabular-nums text-amber-600 dark:text-amber-400">
                                                            {item.overtime_hours} ساعة
                                                        </td>
                                                        <td className="px-4 py-4 text-center font-bold tabular-nums text-gray-600 dark:text-gray-300">
                                                            {item.overtime_hourly_rate.toFixed(2)} د.ل
                                                        </td>
                                                        <td className="px-5 py-4 text-center font-black tabular-nums text-amber-900 dark:text-amber-100 bg-amber-50/30 dark:bg-amber-950/10 text-sm">
                                                            {item.overtime_total_cost.toFixed(2)} د.ل
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                                                {item.extra_duties || 'عمل إضافي غير محدد'}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                                                item.overtime_status === 'approved'
                                                                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                                                    : item.overtime_status === 'paid'
                                                                    ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                                                    : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                                            }`}>
                                                                {item.overtime_status_display}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                {item.overtime_status === 'pending' && (
                                                                    <button
                                                                        onClick={() => handleUpdateOvertimeStatus(item, 'approved')}
                                                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-[10px] hover:bg-emerald-700 transition-all active:scale-95"
                                                                    >
                                                                        اعتماد
                                                                    </button>
                                                                )}
                                                                {item.overtime_status === 'approved' && (
                                                                    <button
                                                                        onClick={() => handleUpdateOvertimeStatus(item, 'paid')}
                                                                        className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-[10px] hover:bg-blue-700 transition-all active:scale-95"
                                                                    >
                                                                        صرف المستحق
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleOpenOvertime(item)}
                                                                    className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-amber-600 transition-colors"
                                                                    title="تعديل الساعات أو البيان"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VIEW 3: Shift Templates & Timings View */}
                    {viewTab === 'templates' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">
                                    قوالب وتوقيتات الورديات المعتمدة ({templates.length})
                                </h3>
                                <button
                                    onClick={() => {
                                        setModalError(null);
                                        setIsTemplateModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-xs"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ إضافة قالب جديد</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {templates.map((tmpl) => (
                                    <div
                                        key={tmpl.id}
                                        className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-4 relative group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-3.5 h-3.5 rounded-full"
                                                    style={{ backgroundColor: tmpl.color }}
                                                />
                                                <h3 className="text-base font-black text-gray-900 dark:text-white">
                                                    {tmpl.name}
                                                </h3>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteTemplate(tmpl.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-all"
                                                title="حذف القالب"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Timing Block */}
                                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-2">
                                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                                توقيت فترة العمل
                                            </div>
                                            <div className="flex items-center justify-between font-black text-sm text-gray-800 dark:text-gray-100 tabular-nums">
                                                <span>من: {tmpl.start_time}</span>
                                                <span>إلى: {tmpl.end_time}</span>
                                            </div>
                                        </div>

                                        {/* Default Overtime Rate */}
                                        <div className="flex items-center justify-between text-xs font-bold pt-1">
                                            <span className="text-gray-500">تكلفة ساعة الإضافي:</span>
                                            <span className="font-black text-amber-600 dark:text-amber-400 text-sm tabular-nums">
                                                {tmpl.overtime_hourly_rate.toFixed(2)} د.ل / ساعة
                                            </span>
                                        </div>

                                        {tmpl.description && (
                                            <p className="text-xs text-gray-400 font-medium">
                                                {tmpl.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MODAL 1: Create Shift Allocation with Overtime */}
                    <Modal
                        isOpen={isAllocationModalOpen}
                        onClose={() => setIsAllocationModalOpen(false)}
                        title="تخصيص وردية لموظف"
                        size="lg"
                    >
                        <form onSubmit={handleSaveAllocation} className="space-y-3.5 text-xs font-bold">
                            {modalError && (
                                <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold ring-1 ring-rose-200 dark:ring-rose-900/50 animate-in fade-in duration-200">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{modalError}</span>
                                </div>
                            )}
                            {/* Employee Selector */}
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 block mb-1">الموظف / الكاشير المستهدف:</label>
                                <select
                                    value={allocationForm.employee_id}
                                    onChange={(e) => setAllocationForm({ ...allocationForm, employee_id: Number(e.target.value) })}
                                    className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 outline-none text-xs"
                                    required
                                >
                                    <option value="">اختر موظفاً</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.first_name} {emp.last_name} ({emp.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Shift Template Selector */}
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 block mb-1">قالب الوردية والتوقيت:</label>
                                <select
                                    value={allocationForm.shift_template_id || ''}
                                    onChange={(e) => handleTemplateSelection(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 outline-none text-xs"
                                >
                                    <option value="">وردية مخصصة يدوياً</option>
                                    {templates.map((tmpl) => (
                                        <option key={tmpl.id} value={tmpl.id}>
                                            {tmpl.name} ({tmpl.start_time} - {tmpl.end_time})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date & Timings */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">تاريخ الوردية:</label>
                                    <input
                                        type="date"
                                        value={allocationForm.date}
                                        onChange={(e) => setAllocationForm({ ...allocationForm, date: e.target.value })}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 text-xs font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">وقت البدء:</label>
                                    <input
                                        type="time"
                                        value={allocationForm.start_time}
                                        onChange={(e) => setAllocationForm({ ...allocationForm, start_time: e.target.value })}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 text-xs font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">وقت الانتهاء:</label>
                                    <input
                                        type="time"
                                        value={allocationForm.end_time}
                                        onChange={(e) => setAllocationForm({ ...allocationForm, end_time: e.target.value })}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 text-xs font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            {/* POS Station & Overtime Rate */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">نقطة البيع (المحطة):</label>
                                    <input
                                        type="text"
                                        value={allocationForm.pos_station}
                                        onChange={(e) => setAllocationForm({ ...allocationForm, pos_station: e.target.value })}
                                        placeholder="نقطة البيع 1"
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">تكلفة ساعة الإضافي (د.ل):</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={allocationForm.overtime_hourly_rate}
                                        onChange={(e) => setAllocationForm({ ...allocationForm, overtime_hourly_rate: Number(e.target.value) })}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Overtime Toggle Section */}
                            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2.5">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={allocationForm.has_overtime || false}
                                        onChange={(e) => setAllocationForm({ ...allocationForm, has_overtime: e.target.checked })}
                                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                                    />
                                    <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                                        تضمين أعمال أو ساعات عمل إضافية لهذه الوردية (Overtime)
                                    </span>
                                </label>

                                {allocationForm.has_overtime && (
                                    <div className="space-y-2.5 pt-2 border-t border-amber-200/50 dark:border-amber-900/30 text-xs">
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 block mb-1">
                                                    عدد الساعات الإضافية:
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0.5"
                                                    value={allocationForm.overtime_hours || 1.0}
                                                    onChange={(e) => setAllocationForm({ ...allocationForm, overtime_hours: Number(e.target.value) })}
                                                    className="w-full h-8 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg px-2 font-black text-xs outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 block mb-1">
                                                    تكلفة الساعة (د.ل):
                                                </label>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    value={allocationForm.overtime_hourly_rate || 15.0}
                                                    onChange={(e) => setAllocationForm({ ...allocationForm, overtime_hourly_rate: Number(e.target.value) })}
                                                    className="w-full h-8 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg px-2 font-black text-xs outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Cost preview */}
                                        <div className="flex items-center justify-between bg-amber-100/70 dark:bg-amber-900/40 px-3 py-2 rounded-lg font-bold">
                                            <span className="text-[11px] text-amber-900 dark:text-amber-200">إجمالي مستحق العمل الإضافي:</span>
                                            <span className="font-black text-amber-800 dark:text-amber-100 text-xs tabular-nums">
                                                {((allocationForm.overtime_hours || 0) * (allocationForm.overtime_hourly_rate || 0)).toFixed(2)} د.ل
                                            </span>
                                        </div>

                                        {/* Preset duty tags */}
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1">
                                                أعمال ومهام إضافية شائعة (اختر سريعاً):
                                            </label>
                                            <div className="flex flex-wrap gap-1 mb-1.5">
                                                {PRESET_DUTIES.map((tag) => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = allocationForm.extra_duties || '';
                                                            setAllocationForm({
                                                                ...allocationForm,
                                                                extra_duties: current ? `${current}، ${tag}` : tag
                                                            });
                                                        }}
                                                        className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 text-amber-800 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                                                    >
                                                        + {tag}
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea
                                                rows={2}
                                                value={allocationForm.extra_duties || ''}
                                                onChange={(e) => setAllocationForm({ ...allocationForm, extra_duties: e.target.value })}
                                                placeholder="اكتب بيان المهام والأعمال الإضافية المنجزة..."
                                                className="w-full bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg p-2 text-xs font-medium outline-none resize-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1">حالة اعتماد الإضافي:</label>
                                            <select
                                                value={allocationForm.overtime_status || 'pending'}
                                                onChange={(e) => setAllocationForm({ ...allocationForm, overtime_status: e.target.value as any })}
                                                className="w-full h-8 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg px-2 text-xs font-bold outline-none"
                                            >
                                                <option value="pending">قيد المراجعة</option>
                                                <option value="approved">معتمد فورياً</option>
                                                <option value="paid">تم الصرف</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 block mb-1">ملاحظات عامة:</label>
                                <textarea
                                    rows={2}
                                    value={allocationForm.notes || ''}
                                    onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })}
                                    placeholder="أي تعليمات أو ملاحظات إضافية..."
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-xs outline-none resize-none"
                                />
                            </div>

                            {/* Modal Sticky / Fixed Footer Buttons */}
                            <div className="sticky bottom-0 bg-white/95 dark:bg-card/95 backdrop-blur-xs pt-3 pb-1 border-t border-gray-100 dark:border-gray-800/40 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAllocationModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-bold hover:bg-gray-200 text-xs transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition-all active:scale-95"
                                >
                                    حفظ التخصيص
                                </button>
                            </div>
                        </form>
                    </Modal>

                    {/* MODAL 2: Record / Edit Overtime & Costs */}
                    {selectedAllocation && (
                        <Modal
                            isOpen={isOvertimeModalOpen}
                            onClose={() => setIsOvertimeModalOpen(false)}
                            title={`تسجيل وتكلفة العمل الإضافي - ${selectedAllocation.employee_name}`}
                            size="md"
                        >
                            <form onSubmit={handleSaveOvertime} className="space-y-3.5 text-xs font-bold">
                                {modalError && (
                                    <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold ring-1 ring-rose-200 dark:ring-rose-900/50 animate-in fade-in duration-200">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{modalError}</span>
                                    </div>
                                )}
                                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-medium">الوردية المخصصة:</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{selectedAllocation.shift_name}</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 block mb-1">عدد ساعات الإضافي:</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0.5"
                                            value={overtimeForm.overtime_hours}
                                            onChange={(e) => setOvertimeForm({ ...overtimeForm, overtime_hours: Number(e.target.value) })}
                                            className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 block mb-1">تكلفة الساعة (د.ل):</label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={overtimeForm.overtime_hourly_rate}
                                            onChange={(e) => setOvertimeForm({ ...overtimeForm, overtime_hourly_rate: Number(e.target.value) })}
                                            className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Live Cost Calculation Badge */}
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between">
                                    <span className="text-amber-900 dark:text-amber-200 font-bold text-xs">
                                        إجمالي مستحق العمل الإضافي:
                                    </span>
                                    <span className="text-base font-black text-amber-800 dark:text-amber-100 tabular-nums">
                                        {(overtimeForm.overtime_hours * (overtimeForm.overtime_hourly_rate || 0)).toFixed(2)} د.ل
                                    </span>
                                </div>

                                {/* Preset Duty Tags */}
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">أعمال إضافية مقترحة (انقر للإضافة):</label>
                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                        {PRESET_DUTIES.map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => {
                                                    const current = overtimeForm.extra_duties;
                                                    setOvertimeForm({
                                                        ...overtimeForm,
                                                        extra_duties: current ? `${current}، ${tag}` : tag
                                                    });
                                                }}
                                                className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-100 transition-colors"
                                            >
                                                + {tag}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        rows={2.5}
                                        value={overtimeForm.extra_duties}
                                        onChange={(e) => setOvertimeForm({ ...overtimeForm, extra_duties: e.target.value })}
                                        placeholder="مثال: تغطية وردية كاشير متأخرة، تجهيز بوفيه خارجي، جرد نهاية اليوم..."
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none resize-none font-medium text-xs"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">حالة الاعتماد:</label>
                                    <select
                                        value={overtimeForm.overtime_status}
                                        onChange={(e) => setOvertimeForm({ ...overtimeForm, overtime_status: e.target.value as any })}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                    >
                                        <option value="pending">قيد المراجعة</option>
                                        <option value="approved">معتمد رسمياً</option>
                                        <option value="paid">تم الصرف</option>
                                    </select>
                                </div>

                                <div className="sticky bottom-0 bg-white/95 dark:bg-card/95 backdrop-blur-xs pt-3 pb-1 border-t border-gray-100 dark:border-gray-800/40 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsOvertimeModalOpen(false)}
                                        className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-bold hover:bg-gray-200 text-xs transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition-all active:scale-95"
                                    >
                                        حفظ وتحديث الإضافي
                                    </button>
                                </div>
                            </form>
                        </Modal>
                    )}

                    {/* MODAL 3: Standalone Overtime Modal (تسجيل عمل إضافي مستقل) */}
                    <Modal
                        isOpen={isStandaloneOvertimeModalOpen}
                        onClose={() => setIsStandaloneOvertimeModalOpen(false)}
                        title="تسجيل عمل / مهمة إضافية جديدة"
                        size="md"
                    >
                        <form onSubmit={handleSaveStandaloneOvertime} className="space-y-3.5 text-xs font-bold">
                            {modalError && (
                                <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold ring-1 ring-rose-200 dark:ring-rose-900/50 animate-in fade-in duration-200">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{modalError}</span>
                                </div>
                            )}
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 block mb-1">الموظف المعني بالمهمة:</label>
                                <select
                                    value={standaloneOvertimeForm.employee_id}
                                    onChange={(e) => setStandaloneOvertimeForm({ ...standaloneOvertimeForm, employee_id: Number(e.target.value) })}
                                    className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 outline-none text-xs"
                                    required
                                >
                                    <option value="">اختر موظفاً</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.first_name} {emp.last_name} ({emp.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 block mb-1">التاريخ:</label>
                                <input
                                    type="date"
                                    value={standaloneOvertimeForm.date}
                                    onChange={(e) => setStandaloneOvertimeForm({ ...standaloneOvertimeForm, date: e.target.value })}
                                    className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">عدد ساعات الإضافي:</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        value={standaloneOvertimeForm.overtime_hours}
                                        onChange={(e) => setStandaloneOvertimeForm({ ...standaloneOvertimeForm, overtime_hours: Number(e.target.value) })}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">تكلفة الساعة (د.ل):</label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={standaloneOvertimeForm.overtime_hourly_rate}
                                        onChange={(e) => setStandaloneOvertimeForm({ ...standaloneOvertimeForm, overtime_hourly_rate: Number(e.target.value) })}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Cost preview */}
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between">
                                <span className="text-amber-900 dark:text-amber-200 font-bold text-xs">
                                    إجمالي مستحق العمل الإضافي:
                                </span>
                                <span className="text-base font-black text-amber-800 dark:text-amber-100 tabular-nums">
                                    {(standaloneOvertimeForm.overtime_hours * (standaloneOvertimeForm.overtime_hourly_rate || 0)).toFixed(2)} د.ل
                                </span>
                            </div>

                            {/* Quick tags */}
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 block mb-1">بيان الأعمال الإضافية (اختر أو اكتب):</label>
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                    {PRESET_DUTIES.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => {
                                                const current = standaloneOvertimeForm.extra_duties;
                                                setStandaloneOvertimeForm({
                                                    ...standaloneOvertimeForm,
                                                    extra_duties: current ? `${current}، ${tag}` : tag
                                                });
                                            }}
                                            className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-100 transition-colors"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    rows={2.5}
                                    value={standaloneOvertimeForm.extra_duties}
                                    onChange={(e) => setStandaloneOvertimeForm({ ...standaloneOvertimeForm, extra_duties: e.target.value })}
                                    placeholder="اكتب بيان وتفاصيل المهمة أو الأعمال الإضافية..."
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none resize-none font-medium text-xs"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 block mb-1">حالة الاعتماد:</label>
                                <select
                                    value={standaloneOvertimeForm.overtime_status}
                                    onChange={(e) => setStandaloneOvertimeForm({ ...standaloneOvertimeForm, overtime_status: e.target.value as any })}
                                    className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                >
                                    <option value="pending">قيد المراجعة</option>
                                    <option value="approved">معتمد فورياً</option>
                                    <option value="paid">تم الصرف</option>
                                </select>
                            </div>

                            <div className="sticky bottom-0 bg-white/95 dark:bg-card/95 backdrop-blur-xs pt-3 pb-1 border-t border-gray-100 dark:border-gray-800/40 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsStandaloneOvertimeModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-bold hover:bg-gray-200 text-xs transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition-all active:scale-95"
                                >
                                    تسجيل العمل الإضافي
                                </button>
                            </div>
                        </form>
                    </Modal>

                    {/* MODAL 4: New Template Modal */}
                    <Modal
                        isOpen={isTemplateModalOpen}
                        onClose={() => setIsTemplateModalOpen(false)}
                        title="إضافة قالب وردية جديد"
                        size="md"
                    >
                        <form onSubmit={handleSaveTemplate} className="space-y-3.5 text-xs font-bold">
                            {modalError && (
                                <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold ring-1 ring-rose-200 dark:ring-rose-900/50 animate-in fade-in duration-200">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{modalError}</span>
                                </div>
                            )}
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 block mb-1">اسم الوردية:</label>
                                <input
                                    type="text"
                                    value={templateForm.name}
                                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                                    placeholder="مثال: وردية نهاية الأسبوع، وردية التجهيز"
                                    className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 text-xs"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">وقت البدء:</label>
                                    <input
                                        type="time"
                                        value={templateForm.start_time}
                                        onChange={(e) => setTemplateForm({ ...templateForm, start_time: e.target.value })}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">وقت الانتهاء:</label>
                                    <input
                                        type="time"
                                        value={templateForm.end_time}
                                        onChange={(e) => setTemplateForm({ ...templateForm, end_time: e.target.value })}
                                        className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 block mb-1">تكلفة ساعة العمل الإضافي الافتراضية (د.ل):</label>
                                <input
                                    type="number"
                                    step="1"
                                    value={templateForm.overtime_hourly_rate}
                                    onChange={(e) => setTemplateForm({ ...templateForm, overtime_hourly_rate: Number(e.target.value) })}
                                    className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-bold text-xs"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 block mb-1">الوصف:</label>
                                <input
                                    type="text"
                                    value={templateForm.description}
                                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                                    placeholder="وصف مختصر للوردية..."
                                    className="w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 font-medium text-xs"
                                />
                            </div>

                            <div className="sticky bottom-0 bg-white/95 dark:bg-card/95 backdrop-blur-xs pt-3 pb-1 border-t border-gray-100 dark:border-gray-800/40 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsTemplateModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-bold hover:bg-gray-200 text-xs transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition-all active:scale-95"
                                >
                                    إنشاء القالب
                                </button>
                            </div>
                        </form>
                    </Modal>

                    {/* Floating Toast Notification (Modern replacement for browser alert popups) */}
                    {toast && (
                        <div
                            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
                                toast.type === 'success'
                                    ? 'bg-emerald-600/95 text-white border-emerald-500 shadow-emerald-600/30'
                                    : toast.type === 'error'
                                    ? 'bg-rose-600/95 text-white border-rose-500 shadow-rose-600/30'
                                    : 'bg-gray-900/95 text-white border-gray-700 shadow-black/30'
                            }`}
                            role="alert"
                        >
                            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-white" />}
                            {toast.type === 'info' && <Sparkles className="w-5 h-5 shrink-0 text-white" />}
                            <span className="text-xs sm:text-sm font-black tracking-wide">{toast.message}</span>
                            <button
                                type="button"
                                onClick={() => setToast(null)}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors mr-1 text-white/80 hover:text-white"
                                aria-label="إغلاق"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Delete Confirmation Modal (Modern replacement for browser confirm popup) */}
                    <DeleteConfirmModal
                        isOpen={deleteConfirmState.isOpen}
                        onClose={() => setDeleteConfirmState((prev) => ({ ...prev, isOpen: false }))}
                        onConfirm={async () => {
                            await deleteConfirmState.onConfirm();
                            setDeleteConfirmState((prev) => ({ ...prev, isOpen: false }));
                        }}
                        title={deleteConfirmState.title}
                        message={deleteConfirmState.message}
                    />
                </div>
            </main>
        </div>
    );
}
