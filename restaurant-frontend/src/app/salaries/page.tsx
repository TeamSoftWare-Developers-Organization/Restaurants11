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
    Calendar,
    ShieldCheck,
    Lock,
    Unlock,
    Clock,
    FileText,
    Printer,
    Check,
    AlertTriangle,
    BadgePercent,
    Sparkles,
    X
} from 'lucide-react';
import { employeeService, Employee } from '@/services/employeeService';
import { treasuryService, SalaryPayment, AbsenceCalculation } from '@/services/treasuryService';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

export default function SalariesPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { user } = useAuthStore();

    // Check if the currently logged in user has Manager/Admin rights
    const isCurrentUserAdmin =
        user?.role?.toUpperCase() === 'ADMIN' ||
        user?.role?.toLowerCase() === 'admin' ||
        user?.role?.toLowerCase() === 'manager' ||
        (user as any)?.is_superuser ||
        (user as any)?.is_staff;

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [salaryHistory, setSalaryHistory] = useState<SalaryPayment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    // Selected salary for voucher/slip printing
    const [selectedSalaryForSlip, setSelectedSalaryForSlip] = useState<SalaryPayment | null>(null);

    // Form state for Salary Payment & Absence Deduction
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [basicSalary, setBasicSalary] = useState<string>('0');
    const [absenceDays, setAbsenceDays] = useState<number>(0);
    const [dailyRate, setDailyRate] = useState<string>('0');
    const [absenceDeduction, setAbsenceDeduction] = useState<string>('0');
    const [bonusAmount, setBonusAmount] = useState<string>('0');
    const [netAmount, setNetAmount] = useState<string>('0');
    const [deductionReason, setDeductionReason] = useState<string>('');
    const [absenceDatesDetail, setAbsenceDatesDetail] = useState<string>('');
    const [shortageDeduction, setShortageDeduction] = useState<string>('0');
    const [shortageReason, setShortageReason] = useState<string>('');
    const [notes, setNotes] = useState('');

    // Absence detection details from backend
    const [isCalculatingAbsence, setIsCalculatingAbsence] = useState(false);
    const [absenceInfo, setAbsenceInfo] = useState<AbsenceCalculation | null>(null);

    // Admin Approval state (for non-admin users)
    const [showAdminAuthBox, setShowAdminAuthBox] = useState(false);
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
    const [verifiedAdminName, setVerifiedAdminName] = useState<string | null>(null);
    const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const getArabicDayName = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            return days[d.getDay()];
        } catch {
            return '';
        }
    };

    const todayArabicDayName = getArabicDayName(new Date().toISOString());


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

    // Triggered when an employee is selected to pay salary
    const handleSelectEmployeeForPayment = async (emp: Employee) => {
        setSelectedEmployee(emp);
        setError(null);
        setAdminAuthError(null);
        setShowAdminAuthBox(false);
        setVerifiedAdminName(null);
        setAdminUsername('');
        setAdminPassword('');
        setShowPayModal(true);

        const currentMonth = month || new Date().toISOString().slice(0, 7);
        await loadAbsenceCalculation(emp.id, currentMonth, emp.basic_salary || 0);
    };

    // Load absence calculation from API
    const loadAbsenceCalculation = async (empId: number, targetMonth: string, baseSalOverride?: number) => {
        setIsCalculatingAbsence(true);
        try {
            const calc = await treasuryService.calculateAbsence(empId, targetMonth);
            setAbsenceInfo(calc);

            const base = baseSalOverride && baseSalOverride > 0 ? baseSalOverride : (calc.basic_salary || 0);
            const rate = base > 0 ? Math.round((base / 30) * 100) / 100 : 0;
            const deduction = Math.round((calc.absence_days * rate) * 100) / 100;
            const detectedShortage = calc.total_uncovered_shortage || 0;
            const net = Math.max(0, Math.round((base - deduction - detectedShortage) * 100) / 100);

            setBasicSalary(base.toString());
            setAbsenceDays(calc.absence_days);
            setDailyRate(rate.toString());
            setAbsenceDeduction(deduction.toString());
            setShortageDeduction(detectedShortage.toString());
            setShortageReason(detectedShortage > 0 ? `خصم عجز مالي مرصود في الورديات لشهر ${targetMonth}` : '');
            setBonusAmount('0');
            setNetAmount(net.toString());
            setDeductionReason(calc.absence_days > 0 ? `خصم غياب ${calc.absence_days} أيام خلال شهر ${targetMonth}` : '');
            const datesText = calc.absence_dates_list?.map(d => `${d.day_name} ${d.date}`).join('، ') || '';
            setAbsenceDatesDetail(datesText);
        } catch (err) {
            console.error('Failed to calculate absence', err);
        } finally {
            setIsCalculatingAbsence(false);
        }
    };

    // Month change in modal
    const handleMonthChange = async (newMonth: string) => {
        setMonth(newMonth);
        if (selectedEmployee) {
            await loadAbsenceCalculation(selectedEmployee.id, newMonth, parseFloat(basicSalary) || 0);
        }
    };

    // Recalculate net salary when values change
    const updateCalculations = (
        newBase: number,
        newAbsDays: number,
        newDeduction: number,
        newBonus: number,
        manualDeduction: boolean = false,
        newShortage: number = parseFloat(shortageDeduction) || 0
    ) => {
        const rate = newBase > 0 ? Math.round((newBase / 30) * 100) / 100 : 0;
        setDailyRate(rate.toString());

        let finalDeduction = newDeduction;
        if (!manualDeduction) {
            finalDeduction = Math.round((newAbsDays * rate) * 100) / 100;
            setAbsenceDeduction(finalDeduction.toString());
        }

        const net = Math.max(0, Math.round((newBase - finalDeduction - newShortage + newBonus) * 100) / 100);
        setNetAmount(net.toString());
    };

    // Verify Admin credentials for non-admin users
    const handleVerifyAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminUsername || !adminPassword) {
            setAdminAuthError('يرجى إدخال اسم المستخدم وكلمة المرور للمدير.');
            return;
        }

        setIsVerifyingAdmin(true);
        setAdminAuthError(null);
        try {
            const res = await treasuryService.verifyAdminApproval({
                admin_username: adminUsername,
                admin_password: adminPassword
            });
            if (res.success) {
                setVerifiedAdminName(res.admin_name || adminUsername);
                setShowAdminAuthBox(false);
            } else {
                setAdminAuthError(res.message || 'فشل التحقق من صلاحية المدير.');
            }
        } catch (err: any) {
            setAdminAuthError(err.response?.data?.message || 'بيانات المدير غير صحيحة أو لا يملك صلاحية Admin.');
        } finally {
            setIsVerifyingAdmin(false);
        }
    };

    // Submit salary payment
    const handlePaySalary = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !netAmount || !month) {
            setError('يرجى إكمال جميع الحقول المطلوبة');
            return;
        }

        const deductionNum = parseFloat(absenceDeduction) || 0;
        const shortageNum = parseFloat(shortageDeduction) || 0;
        const totalDeductions = deductionNum + shortageNum;

        // Check Admin approval requirement
        if (totalDeductions > 0 && !isCurrentUserAdmin && !verifiedAdminName) {
            setError('تنبيه: تطبيق أو تحديد خصومات المرتبات (الغياب أو العجز) يتطلب إذن واعتماد المشرف أو المدير (Admin).');
            setShowAdminAuthBox(true);
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await treasuryService.recordSalaryPayment({
                employee_id: selectedEmployee.id,
                amount: parseFloat(netAmount),
                month_covered: month,
                basic_salary: parseFloat(basicSalary) || 0,
                absence_days: absenceDays,
                daily_rate: parseFloat(dailyRate) || 0,
                absence_deduction: deductionNum,
                shortage_deduction: shortageNum,
                shortage_reason: shortageReason || (shortageNum > 0 ? `خصم عجز مالي بالخزينة/الوردية` : undefined),
                bonus_amount: parseFloat(bonusAmount) || 0,
                deduction_reason: deductionReason || (deductionNum > 0 ? `خصم غياب ${absenceDays} أيام` : undefined),
                absence_dates_detail: absenceDatesDetail || undefined,
                payment_day_name: todayArabicDayName,
                admin_username: !isCurrentUserAdmin && verifiedAdminName ? adminUsername : undefined,
                admin_password: !isCurrentUserAdmin && verifiedAdminName ? adminPassword : undefined,
                notes: notes
            });

            setShowPayModal(false);
            fetchData();

            // Reset form
            setBasicSalary('0');
            setAbsenceDays(0);
            setDailyRate('0');
            setAbsenceDeduction('0');
            setShortageDeduction('0');
            setShortageReason('');
            setBonusAmount('0');
            setNetAmount('0');
            setDeductionReason('');
            setNotes('');
            setSelectedEmployee(null);
            setVerifiedAdminName(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل تسجيل صرف المرتب');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter employees
    const filteredEmployees = employees.filter(emp =>
        `${emp.first_name} ${emp.last_name} ${emp.username} ${emp.role}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Aggregate statistics
    const totalSalariesPaid = salaryHistory.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    const totalAbsenceDeductions = salaryHistory.reduce((sum, h) => sum + (Number(h.absence_deduction) || 0), 0);

    return (
        <div className="flex flex-col lg:flex-row bg-gray-50 dark:bg-background min-h-screen transition-colors duration-300 min-w-0 w-full" dir="rtl">
            <Sidebar />

            <main className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-3.5 sm:p-6 lg:p-8 min-w-0 w-full transition-all duration-300`}>
                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                    <div className="flex items-center gap-3.5 sm:gap-4">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
                            <DollarSign className="text-white w-5 sm:w-6 h-5 sm:h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">
                                إدارة المرتبات وخصم الغياب
                            </h1>
                            <p className="text-gray-400 text-xs sm:text-[13px] font-bold opacity-70 italic">
                                احتساب المرتبات، رصد أيام الغياب الذكي، وتحديد الخصومات بإذن واعتماد Admin
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                            isCurrentUserAdmin
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200 dark:border-amber-800'
                        }`}>
                            <ShieldCheck className="w-4 h-4" />
                            {isCurrentUserAdmin ? 'صلاحية المدير: معتمدة ومفعلة' : 'مستخدم: يتطلب إذن Admin للخصم'}
                        </span>
                    </div>
                </header>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-card rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">إجمالي المنصرف للمرتبات</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-2 font-mono tabular-nums">
                            {totalSalariesPaid.toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold">د.ل</span>
                        </p>
                    </div>

                    <div className="bg-white dark:bg-card rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">إجمالي خصومات الغياب المعتمدة</span>
                            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center">
                                <BadgePercent className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-rose-600 mt-2 font-mono tabular-nums">
                            {totalAbsenceDeductions.toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold">د.ل</span>
                        </p>
                    </div>

                    <div className="bg-white dark:bg-card rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800/40 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">عدد الموظفين في المنظومة</span>
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-blue-600 mt-2 font-mono tabular-nums">
                            {employees.length} <span className="text-xs font-bold">موظف</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Employees List */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white dark:bg-card rounded-2xl p-5 border border-gray-100 dark:border-gray-800/40 shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <Users className="w-4 h-4 text-emerald-600" />
                                    كادر الموظفين
                                </h3>
                                <span className="text-[10px] font-black text-gray-400">انقر لصرف المرتب</span>
                            </div>

                            {/* Search */}
                            <div className="relative mb-3">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="بحث بالاسم أو الدور..."
                                    className="w-full h-9 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl pr-9 pl-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-600/20"
                                />
                            </div>

                            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-0.5">
                                {filteredEmployees.map((emp) => (
                                    <div
                                        key={emp.id}
                                        onClick={() => handleSelectEmployeeForPayment(emp)}
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 font-black text-xs">
                                                {emp.first_name?.[0] || 'م'}{emp.last_name?.[0] || ''}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-800 dark:text-gray-200">
                                                    {emp.first_name} {emp.last_name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-gray-400">{emp.role}</span>
                                                    {emp.basic_salary && emp.basic_salary > 0 ? (
                                                        <span className="text-[10px] font-mono font-bold text-emerald-600">
                                                            {emp.basic_salary} د.ل
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] text-gray-400">غير محدد</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black transition-all flex items-center gap-1 shadow-sm"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>صرف</span>
                                        </button>
                                    </div>
                                ))}

                                {filteredEmployees.length === 0 && (
                                    <div className="text-center py-8 text-xs text-gray-400 font-bold">
                                        لا يوجد موظفون يطابقون البحث
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Salary History */}
                    <div className="lg:col-span-2 bg-white dark:bg-card rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-800/40 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/10">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-emerald-600" />
                                <h2 className="text-base font-black text-gray-900 dark:text-white">سجل صرف المرتبات والخصومات المعتمدة</h2>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-right text-sm">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-900/30 text-gray-400 font-black text-[11px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-5 py-4">الموظف</th>
                                        <th className="px-4 py-4">عن شهر</th>
                                        <th className="px-4 py-4">الأساسي</th>
                                        <th className="px-4 py-4">خصم الغياب</th>
                                        <th className="px-4 py-4">خصم العجز</th>
                                        <th className="px-4 py-4">إذن الاعتماد</th>
                                        <th className="px-4 py-4">الصافي المصروف</th>
                                        <th className="px-4 py-4">تاريخ الصرف</th>
                                        <th className="px-4 py-4 text-center">السند</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                                    {salaryHistory.length > 0 ? salaryHistory.map((h) => {
                                        const emp = employees.find(e => e.id === h.employee_id);
                                        const hasAbsenceDeduction = Number(h.absence_deduction || 0) > 0;
                                        const hasShortageDeduction = Number(h.shortage_deduction || 0) > 0;
                                        const hasAnyDeduction = hasAbsenceDeduction || hasShortageDeduction;
                                        return (
                                            <tr key={h.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <UserCircle className="w-4 h-4 text-emerald-600" />
                                                        <span className="font-black text-gray-800 dark:text-gray-200">
                                                            {h.employee_name || (emp ? `${emp.first_name} ${emp.last_name}` : `موظف #${h.employee_id}`)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 font-bold text-gray-500 tabular-nums text-xs">
                                                    {h.month_covered}
                                                </td>
                                                <td className="px-4 py-4 font-bold text-gray-700 dark:text-gray-300 font-mono text-xs">
                                                    {Number(h.basic_salary || h.amount).toLocaleString('ar-LY')} د.ل
                                                </td>
                                                <td className="px-4 py-4">
                                                    {hasAbsenceDeduction ? (
                                                        <div className="text-xs">
                                                            <span className="font-bold text-rose-600 font-mono">
                                                                -{Number(h.absence_deduction).toLocaleString('ar-LY')} د.ل
                                                            </span>
                                                            <span className="block text-[10px] text-gray-400 font-bold">
                                                                ({h.absence_days || 0} أيام غياب)
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] font-bold text-gray-400">بدون خصم</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {hasShortageDeduction ? (
                                                        <div className="text-xs">
                                                            <span className="font-bold text-amber-600 font-mono">
                                                                -{Number(h.shortage_deduction).toLocaleString('ar-LY')} د.ل
                                                            </span>
                                                            {h.shortage_reason && (
                                                                <span className="block text-[10px] text-gray-400 font-bold truncate max-w-[120px]" title={h.shortage_reason}>
                                                                    {h.shortage_reason}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] font-bold text-gray-400">لا يوجد عجز</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {hasAnyDeduction && h.deduction_approved_by_name ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                                                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                                            {h.deduction_approved_by_name}
                                                        </span>
                                                    ) : hasAnyDeduction ? (
                                                        <span className="text-[10px] font-bold text-gray-400">إدارة المطعم</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-emerald-600">صرف كامل</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 font-black text-emerald-600 font-mono text-sm tabular-nums">
                                                    {Number(h.amount).toLocaleString('ar-LY')} د.ل
                                                </td>
                                                <td className="px-4 py-4 text-xs font-bold">
                                                    <span className="text-emerald-700 dark:text-emerald-400 font-black block">
                                                        {h.payment_day_name || getArabicDayName(h.payment_date)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                        {new Date(h.payment_date).toLocaleDateString('ar-LY')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => setSelectedSalaryForSlip(h)}
                                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-emerald-600 transition-colors"
                                                        title="عرض وطباعة سند صرف المرتب"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-300 font-bold italic">
                                                لا يوجد سجل مدفوعات مسبقة
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Pay Salary & Absence Deduction Modal */}
            <Modal
                isOpen={showPayModal}
                onClose={() => {
                    setShowPayModal(false);
                    setError(null);
                    setAdminAuthError(null);
                }}
                title="صرف مرتب موظف واحتساب خصم الغياب"
            >
                <form onSubmit={handlePaySalary} className="p-4 sm:p-5 space-y-4 max-h-[85vh] overflow-y-auto">
                    {/* Employee & Month Header */}
                    <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-emerald-600/10 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-sm">
                                {selectedEmployee?.first_name?.[0] || 'م'}
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900 dark:text-white">
                                    {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                                </h4>
                                <p className="text-[11px] font-bold text-gray-400">{selectedEmployee?.role} • @{selectedEmployee?.username}</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-gray-400 block">يوم وتاريخ الصرف</span>
                                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                                    {todayArabicDayName}، {new Date().toLocaleDateString('ar-LY')}
                                </span>
                            </div>

                            <div className="w-full sm:w-auto">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">عن شهر</label>
                            <div className="relative">
                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => handleMonthChange(e.target.value)}
                                    className="h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pr-9 pl-3 font-black text-xs outline-none focus:ring-2 focus:ring-emerald-600/20"
                                    required
                                />
                            </div>
                        </div>
                        </div>
                    </div>

                    {/* Smart Absence Detection Card */}
                    <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <h5 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-amber-600" />
                                تقرير الحضور والغياب لشهر ({month})
                            </h5>
                            {isCalculatingAbsence ? (
                                <span className="text-[10px] font-bold text-amber-600 animate-pulse">جاري الفحص...</span>
                            ) : (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                                    {absenceInfo ? `${absenceInfo.absence_days} أيام غياب مرصودة` : 'فحص آلي'}
                                </span>
                            )}
                        </div>

                        {absenceInfo && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                                <div className="bg-white/80 dark:bg-gray-900/80 p-2 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                    <span className="text-[10px] font-bold text-gray-400 block">أيام العمل المعتمدة</span>
                                    <strong className="text-xs font-black text-gray-800 dark:text-gray-200 font-mono">
                                        {absenceInfo.effective_days} يوم
                                    </strong>
                                </div>
                                <div className="bg-white/80 dark:bg-gray-900/80 p-2 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                    <span className="text-[10px] font-bold text-gray-400 block">أيام الحضور (البصمة)</span>
                                    <strong className="text-xs font-black text-emerald-600 font-mono">
                                        {absenceInfo.attended_days} يوم
                                    </strong>
                                </div>
                                <div className="bg-white/80 dark:bg-gray-900/80 p-2 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                    <span className="text-[10px] font-bold text-gray-400 block">أيام الغياب</span>
                                    <strong className="text-xs font-black text-rose-600 font-mono">
                                        {absenceInfo.absence_days} يوم
                                    </strong>
                                </div>
                                <div className="bg-white/80 dark:bg-gray-900/80 p-2 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                    <span className="text-[10px] font-bold text-gray-400 block">أجر اليومية المحسوب</span>
                                    <strong className="text-xs font-black text-gray-800 dark:text-gray-200 font-mono">
                                        {absenceInfo.daily_rate} د.ل
                                    </strong>
                                </div>
                            </div>
                        )}

                        {absenceInfo?.absence_dates_list && absenceInfo.absence_dates_list.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                                <span className="text-[10px] font-black text-amber-900 dark:text-amber-200 block mb-1.5 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-amber-600" />
                                    أيام وتواريخ الغياب المرصودة ({absenceInfo.absence_dates_list.length} يوم):
                                </span>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white/70 dark:bg-gray-900/70 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                    {absenceInfo.absence_dates_list.map((d, idx) => (
                                        <span
                                            key={idx}
                                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg font-bold border ${
                                                d.is_friday
                                                    ? 'bg-amber-100/60 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/40'
                                                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40'
                                            }`}
                                        >
                                            <strong>{d.day_name}</strong>
                                            <span className="font-mono text-[9px] opacity-80">{d.date}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shortage / Deficit Detection Alert (if detected) */}
                    {absenceInfo?.detected_shortages && absenceInfo.detected_shortages.length > 0 && (
                        <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    تنبيه: تم رصد عجز مالي بالخزينة/الورديات لهذا الموظف
                                </h5>
                                <span className="text-[10px] font-black text-amber-700 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full font-mono">
                                    إجمالي العجز: {absenceInfo.total_uncovered_shortage} د.ل
                                </span>
                            </div>
                            <div className="space-y-1">
                                {absenceInfo.detected_shortages.map((s, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[11px] p-2 bg-white/80 dark:bg-gray-900/80 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">{s.shift_name} ({s.date})</span>
                                        <span className="font-mono font-black text-rose-600">عجز: -{s.deficit_amount} د.ل</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Salary Calculation Fields */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                                    المرتب الأساسي (د.ل)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={basicSalary}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setBasicSalary(e.target.value);
                                        updateCalculations(val, absenceDays, parseFloat(absenceDeduction) || 0, parseFloat(bonusAmount) || 0, true, parseFloat(shortageDeduction) || 0);
                                    }}
                                    className="w-full h-11 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 font-mono font-black text-sm outline-none focus:ring-2 focus:ring-emerald-600/20"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                                    أيام الغياب المعتمدة للخصم
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="31"
                                    value={absenceDays}
                                    onChange={(e) => {
                                        const days = parseInt(e.target.value) || 0;
                                        setAbsenceDays(days);
                                        const base = parseFloat(basicSalary) || 0;
                                        const rate = base > 0 ? base / 30 : 0;
                                        const deduction = Math.round((days * rate) * 100) / 100;
                                        setAbsenceDeduction(deduction.toString());
                                        updateCalculations(base, days, deduction, parseFloat(bonusAmount) || 0, true, parseFloat(shortageDeduction) || 0);
                                    }}
                                    className="w-full h-11 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 font-mono font-black text-sm outline-none focus:ring-2 focus:ring-emerald-600/20"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                                    معدل أجر اليوم (د.ل)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={dailyRate}
                                    readOnly
                                    className="w-full h-11 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl px-3 font-mono font-black text-sm text-gray-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Deductions & Bonus Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1">
                                        <BadgePercent className="w-3 h-3" />
                                        خصم الغياب (د.ل)
                                    </label>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={absenceDeduction}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setAbsenceDeduction(e.target.value);
                                        updateCalculations(parseFloat(basicSalary) || 0, absenceDays, val, parseFloat(bonusAmount) || 0, true, parseFloat(shortageDeduction) || 0);
                                    }}
                                    className="w-full h-11 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl px-3 font-mono font-black text-sm text-rose-600 outline-none focus:ring-2 focus:ring-rose-500/20"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        خصم العجز المالي (د.ل)
                                    </label>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={shortageDeduction}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setShortageDeduction(e.target.value);
                                        updateCalculations(parseFloat(basicSalary) || 0, absenceDays, parseFloat(absenceDeduction) || 0, parseFloat(bonusAmount) || 0, true, val);
                                    }}
                                    placeholder="0.00"
                                    className="w-full h-11 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900/40 rounded-xl px-3 font-mono font-black text-sm text-amber-700 dark:text-amber-300 outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block mb-1">
                                    مكافآت / إضافي (د.ل)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={bonusAmount}
                                    onChange={(e) => {
                                        const bonus = parseFloat(e.target.value) || 0;
                                        setBonusAmount(e.target.value);
                                        updateCalculations(parseFloat(basicSalary) || 0, absenceDays, parseFloat(absenceDeduction) || 0, bonus, true, parseFloat(shortageDeduction) || 0);
                                    }}
                                    className="w-full h-11 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 font-mono font-black text-sm outline-none focus:ring-2 focus:ring-emerald-600/20"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Deductions Reasons Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                                    سبب / مبرر خصم الغياب
                                </label>
                                <input
                                    type="text"
                                    value={deductionReason}
                                    onChange={(e) => setDeductionReason(e.target.value)}
                                    placeholder="مثال: غياب يومي الأحد والثلاثاء بدون إذن مسبق"
                                    className="w-full h-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-600/20"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                                    سبب / بيان خصم العجز المالي
                                </label>
                                <input
                                    type="text"
                                    value={shortageReason}
                                    onChange={(e) => setShortageReason(e.target.value)}
                                    placeholder="مثال: عجز في إغلاق الوردية النقدية بتاريخ 2026-10-15"
                                    className="w-full h-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-600/20"
                                />
                            </div>
                        </div>

                        {/* Admin Permission Status Section */}
                        {(parseFloat(absenceDeduction) > 0 || parseFloat(shortageDeduction) > 0) && (
                            <div className="p-3.5 rounded-2xl border transition-all">
                                {isCurrentUserAdmin ? (
                                    <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl">
                                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <div className="text-xs">
                                            <p className="font-black">معتمد بصلاحية المدير (Admin Verified)</p>
                                            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400 font-bold">
                                                أنت مسجل حالياً بحساب مدير/مشرف، وسيتم اعتماد الخصم باسمك رسمياً في النظام.
                                            </p>
                                        </div>
                                    </div>
                                ) : verifiedAdminName ? (
                                    <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl">
                                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <div className="text-xs">
                                            <p className="font-black">تم اعتماد إذن الخصم بواسطة: {verifiedAdminName}</p>
                                            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400 font-bold">
                                                تم التحقق من بيانات المدير بنجاح وسيتم إرفاقها مع سند الصرف.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-3.5 rounded-xl">
                                        <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-200 text-xs">
                                            <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-black">مطلوب إذن واعتماد المدير (Admin Permission Required)</p>
                                                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">
                                                    لا يمكنك صرف المرتب مع خصم غياب أو عجز مالي دون مصادقة حساب المدير أو المشرف.
                                                </p>
                                            </div>
                                        </div>

                                        {!showAdminAuthBox ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowAdminAuthBox(true)}
                                                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5"
                                            >
                                                <Unlock className="w-4 h-4" />
                                                إدخال إذن واعتماد المدير الآن
                                            </button>
                                        ) : (
                                            <div className="space-y-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        value={adminUsername}
                                                        onChange={(e) => setAdminUsername(e.target.value)}
                                                        placeholder="اسم مستخدم المدير (Admin)"
                                                        className="h-9 px-3 bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/30"
                                                    />
                                                    <input
                                                        type="password"
                                                        value={adminPassword}
                                                        onChange={(e) => setAdminPassword(e.target.value)}
                                                        placeholder="كلمة مرور المدير"
                                                        className="h-9 px-3 bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/30"
                                                    />
                                                </div>

                                                {adminAuthError && (
                                                    <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        {adminAuthError}
                                                    </p>
                                                )}

                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleVerifyAdmin}
                                                        disabled={isVerifyingAdmin}
                                                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1"
                                                    >
                                                        {isVerifyingAdmin ? 'جاري التحقق...' : 'تأكيد واعتماد الإذن'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAdminAuthBox(false)}
                                                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold"
                                                    >
                                                        إلغاء
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Final Net Calculation Box */}
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
                            <div>
                                <span className="text-xs font-black text-gray-500 block">صافي المرتب المستحق للصرف</span>
                                <span className="text-[11px] font-bold text-gray-400">
                                    الأساسي ({basicSalary}) - الغياب ({absenceDeduction}) {parseFloat(shortageDeduction || '0') > 0 ? `- العجز (${shortageDeduction})` : ''} + المكافأة ({bonusAmount})
                                </span>
                            </div>
                            <div className="text-left font-mono">
                                <span className="text-2xl font-black text-emerald-600 tabular-nums">
                                    {parseFloat(netAmount || '0').toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-xs font-black text-emerald-700 mr-1">د.ل</span>
                            </div>
                        </div>

                        {/* General Notes */}
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                                ملاحظات عامة إضافية (اختياري)
                            </label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="ملاحظات تظهر على كشف الحساب أو سند الصرف..."
                                className="w-full h-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-600/20"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/30">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    تأكيد صرف المرتب واعتماد الخصم في الخزينة
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Printable Salary Slip Modal */}
            {selectedSalaryForSlip && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-[500px] w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white">سند صرف مرتب رسمي</h3>
                                    <p className="text-[10px] text-gray-400 font-bold">إيصال مالي معتمد • سند صرف خزينة</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSalaryForSlip(null)}
                                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Slip Printable Body */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-950/60 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3 font-sans text-xs">
                            <div className="flex justify-between items-center text-[11px] border-b pb-2 border-dashed border-gray-300 dark:border-gray-700">
                                <div>
                                    <span className="text-gray-400 font-bold block">رقم السند:</span>
                                    <span className="font-mono font-black text-gray-800 dark:text-gray-200">#SAL-{selectedSalaryForSlip.id}</span>
                                </div>
                                <div className="text-left">
                                    <span className="text-gray-400 font-bold block">يوم وتاريخ الصرف:</span>
                                    <span className="font-black text-gray-800 dark:text-gray-200">
                                        {selectedSalaryForSlip.payment_day_name || getArabicDayName(selectedSalaryForSlip.payment_date)}،{' '}
                                        <span className="font-mono">{new Date(selectedSalaryForSlip.payment_date).toLocaleDateString('ar-LY')}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-500">اسم الموظف:</span>
                                <span className="font-black text-gray-900 dark:text-white text-sm">
                                    {selectedSalaryForSlip.employee_name || `موظف #${selectedSalaryForSlip.employee_id}`}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-500">عن شهر:</span>
                                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                                    {selectedSalaryForSlip.month_covered}
                                </span>
                            </div>

                            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-2 space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">المرتب الأساسي:</span>
                                    <span className="font-mono font-bold">
                                        {Number(selectedSalaryForSlip.basic_salary || selectedSalaryForSlip.amount).toLocaleString('ar-LY')} د.ل
                                    </span>
                                </div>

                                {Number(selectedSalaryForSlip.absence_deduction || 0) > 0 && (
                                    <div className="flex justify-between text-rose-600 font-bold">
                                        <span>خصم الغياب ({selectedSalaryForSlip.absence_days || 0} يوم):</span>
                                        <span className="font-mono">
                                            -{Number(selectedSalaryForSlip.absence_deduction).toLocaleString('ar-LY')} د.ل
                                        </span>
                                    </div>
                                )}

                                {Number(selectedSalaryForSlip.shortage_deduction || 0) > 0 && (
                                    <div className="flex justify-between text-amber-600 font-bold">
                                        <span>خصم عجز الخزينة / الوردية:</span>
                                        <span className="font-mono">
                                            -{Number(selectedSalaryForSlip.shortage_deduction).toLocaleString('ar-LY')} د.ل
                                        </span>
                                    </div>
                                )}

                                {Number(selectedSalaryForSlip.bonus_amount || 0) > 0 && (
                                    <div className="flex justify-between text-emerald-600 font-bold">
                                        <span>مكافآت وإضافي:</span>
                                        <span className="font-mono">
                                            +{Number(selectedSalaryForSlip.bonus_amount).toLocaleString('ar-LY')} د.ل
                                        </span>
                                    </div>
                                )}

                                <div className="border-t-2 border-black dark:border-white/20 pt-1.5 flex justify-between text-sm font-black text-emerald-600">
                                    <span>صافي المبلغ المصروف:</span>
                                    <span className="font-mono">{Number(selectedSalaryForSlip.amount).toLocaleString('ar-LY')} د.ل</span>
                                </div>
                            </div>

                            {selectedSalaryForSlip.shortage_reason && (
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-[10.5px] text-amber-800 dark:text-amber-200 font-bold">
                                    سبب / بيان عجز الوردية المخصوم: {selectedSalaryForSlip.shortage_reason}
                                </div>
                            )}

                            {selectedSalaryForSlip.deduction_reason && (
                                <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg text-[10.5px] text-rose-700 dark:text-rose-300 font-bold">
                                    سبب / مبرر خصم الغياب: {selectedSalaryForSlip.deduction_reason}
                                </div>
                            )}

                            {selectedSalaryForSlip.absence_dates_detail && (
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-[10.5px] text-amber-800 dark:text-amber-200 font-bold">
                                    بيان أيام الغياب المعتمدة: {selectedSalaryForSlip.absence_dates_detail}
                                </div>
                            )}

                            {selectedSalaryForSlip.deduction_approved_by_name && (
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-[10.5px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>معتمد بإذن المشرف / المدير: <strong>{selectedSalaryForSlip.deduction_approved_by_name}</strong></span>
                                </div>
                            )}

                            {selectedSalaryForSlip.notes && (
                                <div className="text-[10px] text-gray-500 font-bold italic">
                                    ملاحظات: {selectedSalaryForSlip.notes}
                                </div>
                            )}

                            <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[10px] text-gray-400 font-bold border-t border-gray-200 dark:border-gray-800">
                                <div>
                                    <p className="mb-6">توقيع المستلم (الموظف)</p>
                                    <div className="border-b border-gray-300 dark:border-gray-700 w-24 mx-auto" />
                                </div>
                                <div>
                                    <p className="mb-6">اعتماد الإدارة المالية / المدير</p>
                                    <div className="border-b border-gray-300 dark:border-gray-700 w-24 mx-auto" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <Printer className="w-4 h-4" />
                                طباعة السند
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
