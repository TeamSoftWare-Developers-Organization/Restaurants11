'use client';

import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    Calendar,
    Clock,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    DollarSign,
    Users,
    ChefHat,
    ShoppingBag,
    Utensils,
    RefreshCw,
    Check,
    ArrowUpRight,
    Award,
    Layers,
    Info,
    CalendarDays
} from 'lucide-react';
import {
    aiRosteringService,
    OptimizedRosterResponse,
    ShiftAllocationGroup,
    HourlyForecastItem
} from '@/services/aiRosteringService';
import { alertDialog } from '@/store/modalStore';

interface StaffRosteringViewProps {
    onRosterApplied?: () => void;
}

export default function StaffRosteringView({ onRosterApplied }: StaffRosteringViewProps) {
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [rosterData, setRosterData] = useState<OptimizedRosterResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isApplying, setIsApplying] = useState<boolean>(false);
    const [applySuccessMsg, setApplySuccessMsg] = useState<string | null>(null);

    const fetchRoster = async (targetDate: string) => {
        try {
            setIsLoading(true);
            setApplySuccessMsg(null);
            const data = await aiRosteringService.getPreview(targetDate);
            setRosterData(data);
        } catch (err) {
            console.error('Failed to fetch AI roster preview', err);
            await alertDialog({
                title: 'خطأ في جلب التوقعات',
                message: 'تعذر جلب بيانات التنبؤ بالطلب والجدولة الذكية للورديات.',
                variant: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoster(selectedDate);
    }, [selectedDate]);

    const handleApplyRoster = async () => {
        if (!rosterData) return;
        try {
            setIsApplying(true);
            const res = await aiRosteringService.applyRoster(selectedDate);
            setApplySuccessMsg(res.message);
            await alertDialog({
                title: 'تم اعتماد الجدول بنجاح',
                message: res.message,
                variant: 'success'
            });
            if (onRosterApplied) {
                onRosterApplied();
            }
        } catch (err: any) {
            console.error('Failed to apply roster', err);
            const errorMsg = err?.response?.data?.message || 'حدث خطأ أثناء حفظ واعتماد الورديات في النظام.';
            await alertDialog({
                title: 'خطأ في الاعتماد',
                message: errorMsg,
                variant: 'error'
            });
        } finally {
            setIsApplying(false);
        }
    };

    const handleQuickDateChange = (daysAhead: number) => {
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    // حساب أقصى قيمة للطلبات في المخطط لضبط ارتفاع الأعمدة
    const maxPredictedOrders = rosterData
        ? Math.max(...rosterData.hourly_timeline.map(t => t.predicted_orders), 1)
        : 1;

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-card dark:bg-card rounded-2xl p-5 border border-gray-100 dark:border-gray-800/40 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <h2 className="text-base font-black text-gray-900 dark:text-white">
                            محرك الجدولة الذكية وتكلفة العمالة (AI Predictive Rostering)
                        </h2>
                    </div>
                    <p className="text-xs text-gray-500 font-bold pr-10">
                        التنبؤ بحجم المبيعات الساعي وتوزيع الطهاة والكاشيرات تلقائياً لمنع التكدس وتخفيض الهدر المالي.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* Quick Date Pills */}
                    <div className="flex items-center gap-1 bg-gray-100/70 dark:bg-gray-900/40 p-1 rounded-xl border border-gray-200/50 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => handleQuickDateChange(0)}
                            className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                                selectedDate === todayStr
                                    ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-xs'
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                        >
                            اليوم
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickDateChange(1)}
                            className="px-2.5 py-1 text-xs font-black rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-all"
                        >
                            غداً
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickDateChange(2)}
                            className="px-2.5 py-1 text-xs font-black rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-all"
                        >
                            بعد يومين
                        </button>
                    </div>

                    {/* Date Picker */}
                    <div className="relative flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 absolute right-3 pointer-events-none" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="h-9 pr-9 pl-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-black text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchRoster(selectedDate)}
                        disabled={isLoading}
                        className="h-9 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all disabled:opacity-50"
                        title="إعادة احتساب التنبؤ"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
                        <span>تحديث</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleApplyRoster}
                        disabled={isLoading || isApplying || !rosterData}
                        className="h-9 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Check className="w-4 h-4" />
                        <span>{isApplying ? 'جاري الاعتماد...' : 'اعتماد وحفظ جدول الورديات'}</span>
                    </button>
                </div>
            </div>

            {applySuccessMsg && (
                <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{applySuccessMsg}</span>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="py-20 text-center space-y-3 bg-card dark:bg-card rounded-2xl border border-gray-100 dark:border-gray-800/40">
                    <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-black text-gray-600 dark:text-gray-300">
                        جاري تحليل سجل المبيعات وحساب منحنى الطلب الساعي وتوزيع الورديات...
                    </p>
                </div>
            )}

            {/* Main Content */}
            {!isLoading && rosterData && (
                <>
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                        {/* KPI 1: Predicted Orders */}
                        <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                                <span className="text-[11px] font-black">الطلبات المتوقعة</span>
                                <ShoppingBag className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                                    {rosterData.total_predicted_orders}
                                </span>
                                <span className="text-xs font-bold text-gray-400">طلب</span>
                            </div>
                            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                <span>يوم {rosterData.weekday_name} (المعامل: {rosterData.demand_multiplier ?? 1.0}x)</span>
                            </div>
                        </div>

                        {/* KPI 2: Peak Hours */}
                        <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                                <span className="text-[11px] font-black">ساعات الذروة</span>
                                <TrendingUp className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-amber-600 tabular-nums">
                                    {rosterData.peak_hours_count}
                                </span>
                                <span className="text-xs font-bold text-gray-400">ساعات مكثفة</span>
                            </div>
                            <div className="text-[10px] font-bold text-amber-600/80">
                                تتطلب تدعيماً في المطبخ والكاشير
                            </div>
                        </div>

                        {/* KPI 3: Labor Cost */}
                        <div className="bg-card dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                                <span className="text-[11px] font-black">تكلفة العمالة المحسنة</span>
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-emerald-600 tabular-nums">
                                    {rosterData.financial_optimization.optimized_labor_cost}
                                </span>
                                <span className="text-xs font-bold text-gray-400">د.ل / يوم</span>
                            </div>
                            <div className="text-[10px] font-bold text-gray-400">
                                مقابل <span className="line-through text-rose-500 font-bold">{rosterData.financial_optimization.traditional_labor_cost} د.ل</span> تقليدياً
                            </div>
                        </div>

                        {/* KPI 4: Financial Savings */}
                        <div className="bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent p-4 rounded-2xl border border-purple-500/20 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-purple-700 dark:text-purple-300">
                                <span className="text-[11px] font-black">الوفر المالي التقديري</span>
                                <Award className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                                    {rosterData.financial_optimization.daily_savings}
                                </span>
                                <span className="text-xs font-bold text-purple-600/70">د.ل / يومياً</span>
                            </div>
                            <div className="text-[10px] font-black text-purple-700 dark:text-purple-300 flex items-center justify-between">
                                <span>وفر {rosterData.financial_optimization.savings_percentage}%</span>
                                <span>(~{rosterData.financial_optimization.monthly_projected_savings} د.ل شهرياً)</span>
                            </div>
                        </div>
                    </div>

                    {/* Hourly Demand & Staffing Chart */}
                    <div className="bg-card dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-600" />
                                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                    منحنى الطلبات الساعي واحتياج الكادر الموصى به
                                </h3>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                    <span>عادي</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                                    <span>ذروة متوسطة</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                                    <span>ذروة قصوى</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Visual Bar Chart */}
                        <div className="pt-4 overflow-x-auto">
                            <div className="min-w-[650px] flex items-end justify-between gap-2 h-44 pb-6 border-b border-gray-200/60 dark:border-gray-800">
                                {rosterData.hourly_timeline.map((item) => {
                                    const heightPercentage = Math.max(12, Math.round((item.predicted_orders / maxPredictedOrders) * 100));
                                    const barColor = item.is_super_peak
                                        ? 'bg-rose-500 hover:bg-rose-600'
                                        : item.is_peak
                                        ? 'bg-amber-500 hover:bg-amber-600'
                                        : 'bg-emerald-500 hover:bg-emerald-600';

                                    return (
                                        <div key={item.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                                            {/* Tooltip on hover */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] font-bold rounded-lg px-2.5 py-1.5 shadow-xl pointer-events-none z-20 whitespace-nowrap text-center space-y-0.5">
                                                <div className="font-black text-purple-300">الساعة {item.hour}</div>
                                                <div>الطلبات: {item.predicted_orders} طلب</div>
                                                <div className="text-gray-300 border-t border-gray-700/80 pt-0.5 mt-0.5">
                                                    طهاة: {item.recommended_chefs} | كاشيرات: {item.recommended_cashiers}
                                                </div>
                                            </div>

                                            {/* Order Count Label */}
                                            <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 tabular-nums">
                                                {item.predicted_orders}
                                            </span>

                                            {/* Bar Element */}
                                            <div className="w-full max-w-[28px] bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden flex items-end h-32">
                                                <div
                                                    className={`w-full ${barColor} transition-all rounded-t-lg`}
                                                    style={{ height: `${heightPercentage}%` }}
                                                />
                                            </div>

                                            {/* Hour Label */}
                                            <span className="text-[10px] font-black text-gray-500 mt-1">
                                                {item.hour.split(':')[0]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Shift Guidance Note */}
                        <div className="flex items-center gap-2 p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/40 dark:border-purple-900/30 rounded-xl text-xs font-bold text-purple-800 dark:text-purple-300">
                            <Info className="w-4 h-4 text-purple-600 shrink-0" />
                            <span>
                                يتم احتساب طاقة التحمل بمعدل <strong>1 طاهٍ لكل 12 طلباً/ساعة</strong> و<strong>1 كاشير لكل 22 طلباً/ساعة</strong> لضمان سرعة إنجاز الخدمة وتقليل وقت الانتظار.
                            </span>
                        </div>
                    </div>

                    {/* Shift Cards Breakdown */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-600" />
                                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                    جدول الورديات المولد وتوزيع الطاقم الفعلي ({rosterData.target_date})
                                </h3>
                            </div>
                            <span className="text-xs font-bold text-gray-500">
                                إجمالي الكادر المعين: <strong className="text-blue-600">{rosterData.total_assigned_staff_count} موظف</strong>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {rosterData.shifts.map((shiftGroup, idx) => {
                                const info = shiftGroup.shift_info;
                                const isEvening = idx === 1;

                                return (
                                    <div
                                        key={info.name}
                                        className="bg-card dark:bg-card rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs overflow-hidden flex flex-col"
                                    >
                                        {/* Shift Card Header */}
                                        <div className={`p-4 border-b ${
                                            isEvening
                                                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/40 dark:border-amber-900/40'
                                                : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/40 dark:border-blue-900/40'
                                        } flex items-center justify-between`}>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                                                        isEvening ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                                                    }`}>
                                                        {info.start_time} - {info.end_time}
                                                    </span>
                                                    <h4 className="text-xs font-black text-gray-900 dark:text-white">
                                                        {info.name}
                                                    </h4>
                                                </div>
                                                <p className="text-[11px] font-bold text-gray-500">
                                                    الطلبات المقدرة: <strong className="text-gray-800 dark:text-gray-200">{info.total_predicted_orders}</strong> | ساعات الذروة: <strong>{info.peak_hours}</strong>
                                                </p>
                                            </div>

                                            {/* Staff requirements badges */}
                                            <div className="flex items-center gap-1.5 text-[10px] font-black">
                                                <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-1" title="طهاة مطلوبون">
                                                    <ChefHat className="w-3 h-3 text-rose-500" />
                                                    <span>{info.required_chefs}</span>
                                                </span>
                                                <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-1" title="كاشيرات مطلوبون">
                                                    <ShoppingBag className="w-3 h-3 text-emerald-500" />
                                                    <span>{info.required_cashiers}</span>
                                                </span>
                                                <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-1" title="نادل / خدمة">
                                                    <Utensils className="w-3 h-3 text-blue-500" />
                                                    <span>{info.required_waiters}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Assigned Staff Members */}
                                        <div className="p-4 space-y-2.5 flex-1">
                                            <div className="text-[11px] font-black text-gray-400">الكادر المعين للوردية:</div>

                                            {shiftGroup.assigned_members.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-gray-400 font-bold bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                                                    لم يتم العثور على موظفين متاحين لهذا الدور
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {shiftGroup.assigned_members.map((member) => (
                                                        <div
                                                            key={`${member.employee_id}-${member.station}`}
                                                            className="p-2.5 bg-gray-50/70 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs"
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-black text-gray-700 dark:text-gray-300">
                                                                    {member.role_key === 'chef' ? (
                                                                        <ChefHat className="w-3.5 h-3.5 text-rose-500" />
                                                                    ) : member.role_key === 'cashier' ? (
                                                                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
                                                                    ) : (
                                                                        <Utensils className="w-3.5 h-3.5 text-blue-500" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-gray-900 dark:text-white">
                                                                        {member.employee_name}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-gray-400">
                                                                        {member.station}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="text-left">
                                                                <span className="font-black text-gray-700 dark:text-gray-300 tabular-nums">
                                                                    {member.estimated_shift_cost} د.ل
                                                                </span>
                                                                <span className="text-[9px] text-gray-400 block font-bold">
                                                                    (8 ساعات)
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Coverage Gap Alert */}
                                            {shiftGroup.coverage_gap > 0 && (
                                                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                    <span>
                                                        يوجد عجز بمقدار <strong>{shiftGroup.coverage_gap} موظف</strong> لتغطية الاحتياج الأمثل. يُوصى بجدولة عمل إضافي (Overtime).
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Financial Optimization Comparison */}
                    <div className="bg-gradient-to-r from-gray-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-purple-400" />
                                <h3 className="text-sm font-black text-white">
                                    مقارنة كفاءة الجدولة وتحليل ترشيد تكلفة العمالة
                                </h3>
                            </div>
                            <span className="text-xs font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-xl">
                                تقييم الكفاءة: {rosterData.financial_optimization.efficiency_rating}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-1">
                                <div className="text-gray-400 text-[11px]">الجدولة التقليدية الثابتة (Flat)</div>
                                <div className="text-lg font-black text-rose-300 tabular-nums">
                                    {rosterData.financial_optimization.traditional_labor_cost} د.ل / يوم
                                </div>
                                <div className="text-[10px] text-gray-400">
                                    تعيين كادر موحد طوال اليوم يسبب فائضاً عمالياً وتكاليف غير مبررة خلال الفترات الهادئة.
                                </div>
                            </div>

                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-1">
                                <div className="text-gray-400 text-[11px]">الجدولة بالذكاء الاصطناعي (Optimized)</div>
                                <div className="text-lg font-black text-emerald-300 tabular-nums">
                                    {rosterData.financial_optimization.optimized_labor_cost} د.ل / يوم
                                </div>
                                <div className="text-[10px] text-gray-400">
                                    توزيع الطهاة والكاشيرات حسب الطلب الدقيق يمنع الهدر ويغطي أوقات الذروة باحترافية.
                                </div>
                            </div>

                            <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30 space-y-1">
                                <div className="text-emerald-300 text-[11px]">الوفر الشهري المتوقع</div>
                                <div className="text-xl font-black text-emerald-400 tabular-nums">
                                    {rosterData.financial_optimization.monthly_projected_savings} د.ل
                                </div>
                                <div className="text-[10px] text-emerald-200/70">
                                    نسبة تكلفة العمالة من إجمالي المبيعات التقديرية: <strong>{rosterData.financial_optimization.labor_cost_ratio_percentage}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
