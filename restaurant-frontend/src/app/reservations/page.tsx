'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Modal } from '@/components';
import {
    BadgeCheck,
    Plus,
    Search,
    Pencil,
    Trash2,
    Calendar,
    Clock,
    Save,
    User,
    Phone,
    Users,
    Utensils,
    CheckCircle2,
    ChevronDown,
    FileText,
    Home,
    TreePine,
    MapPin,
    ExternalLink,
    RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import { reservationService, Reservation, Table } from '@/services/reservationService';

export default function ReservationsPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn } = useAuthStore();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [reservationsData, setReservationsData] = useState<Reservation[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Search and Tab Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'confirmed' | 'pending' | 'completed'>('today');

    // Modal & Form State for Reservation
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Reservation | null>(null);
    const [reservationType, setReservationType] = useState<'internal' | 'external'>('internal');
    const [formData, setFormData] = useState<Partial<Reservation>>({
        customer_name: '',
        customer_phone: '',
        reservation_time: '',
        number_of_guests: 2,
        status: 'confirmed',
        table_id: undefined,
        notes: ''
    });

    // Quick Add Table Modal State
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [isCreatingTable, setIsCreatingTable] = useState(false);
    const [tableFormData, setTableFormData] = useState<Partial<Table>>({
        table_number: '',
        capacity: 4,
        status: 'available',
        location: ''
    });

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        } else {
            fetchData();
        }
    }, [isLoggedIn, router]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [resData, tablesData] = await Promise.all([
                reservationService.getReservations(),
                reservationService.getTables()
            ]);
            setReservationsData(resData);
            setTables(tablesData);
        } catch (err) {
            console.error('Fetch reservations failed', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (item?: Reservation) => {
        if (item) {
            setEditingItem(item);
            const date = new Date(item.reservation_time);
            const formattedTime = date.toISOString().slice(0, 16);
            const isExt = !item.table || (item.notes && item.notes.startsWith('[حجز خارجي]'));
            setReservationType(isExt ? 'external' : 'internal');

            setFormData({
                customer_name: item.customer_name,
                customer_phone: item.customer_phone,
                reservation_time: formattedTime,
                number_of_guests: item.number_of_guests,
                status: item.status,
                table_id: isExt ? undefined : item.table?.id,
                notes: item.notes || ''
            });
        } else {
            setEditingItem(null);
            setReservationType('internal');
            const defaultTime = new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16);
            setFormData({
                customer_name: '',
                customer_phone: '',
                reservation_time: defaultTime,
                number_of_guests: 2,
                status: 'confirmed',
                table_id: tables.length > 0 ? tables[0].id : undefined,
                notes: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const submitData = {
                ...formData,
                table_id: reservationType === 'internal' ? formData.table_id : null,
                notes: reservationType === 'external' 
                    ? (formData.notes?.includes('[حجز خارجي]') ? formData.notes : `[حجز خارجي] ${formData.notes || ''}`.trim())
                    : (formData.notes?.replace('[حجز خارجي]', '').trim() || '')
            };

            if (editingItem) {
                await reservationService.updateReservation(editingItem.id, submitData);
            } else {
                await reservationService.createReservation(submitData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error('Save failed', err);
            alert('حدث خطأ أثناء حفظ الحجز. يرجى التحقق من صحة المدخلات.');
        }
    };

    const handleRefreshTables = async () => {
        try {
            const data = await reservationService.getTables();
            setTables(data);
        } catch (err) {
            console.error('Failed to refresh tables', err);
        }
    };

    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tableFormData.table_number) return;
        try {
            setIsCreatingTable(true);
            const newTable = await reservationService.createTable(tableFormData);
            const updatedTables = await reservationService.getTables();
            setTables(updatedTables);
            setFormData(prev => ({ ...prev, table_id: newTable.id }));
            setIsTableModalOpen(false);
            setTableFormData({ table_number: '', capacity: 4, status: 'available', location: '' });
        } catch (err) {
            console.error('Failed to create table', err);
            alert('فشل إضافة الطاولة. قد يكون رقم الطاولة مكرراً.');
        } finally {
            setIsCreatingTable(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('هل أنت متأكد من حذف هذا الحجز؟')) {
            try {
                await reservationService.deleteReservation(id);
                setReservationsData(prev => prev.filter(r => r.id !== id));
            } catch (err) {
                console.error('Delete failed', err);
                alert('فشل حذف الحجز');
            }
        }
    };

    const handleQuickStatusChange = async (id: number, newStatus: string) => {
        try {
            await reservationService.updateReservation(id, { status: newStatus });
            setReservationsData(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } catch (err) {
            console.error('Failed to update status', err);
            alert('فشل تحديث حالة الحجز');
        }
    };

    const handleOpenInPOS = (res: Reservation) => {
        const tableParam = res.table?.id ? `tableId=${res.table.id}&` : '';
        router.push(`/pos?${tableParam}orderType=dine_in`);
    };

    // Date helpers
    const todayStr = new Date().toDateString();
    const isToday = (dateStr: string) => {
        try {
            return new Date(dateStr).toDateString() === todayStr;
        } catch {
            return false;
        }
    };

    const isUpcoming = (dateStr: string) => {
        try {
            return new Date(dateStr).getTime() >= new Date().setHours(0, 0, 0, 0);
        } catch {
            return false;
        }
    };

    // Calculate Summary Metrics
    const todayReservations = reservationsData.filter(r => isToday(r.reservation_time));
    const confirmedReservations = reservationsData.filter(r => r.status === 'confirmed');
    const todayGuestsCount = todayReservations
        .filter(r => r.status !== 'cancelled')
        .reduce((sum, r) => sum + (r.number_of_guests || 0), 0);

    const bookedTableIdsToday = new Set(
        todayReservations
            .filter(r => r.table && r.status !== 'cancelled')
            .map(r => r.table!.id)
    );

    // Filter list by tab & search query
    const filteredReservations = reservationsData.filter((res) => {
        if (activeTab === 'today' && !isToday(res.reservation_time)) return false;
        if (activeTab === 'upcoming' && !isUpcoming(res.reservation_time)) return false;
        if (activeTab === 'confirmed' && res.status !== 'confirmed') return false;
        if (activeTab === 'pending' && res.status !== 'pending') return false;
        if (activeTab === 'completed' && res.status !== 'completed') return false;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const nameMatch = res.customer_name?.toLowerCase().includes(q);
            const phoneMatch = res.customer_phone?.includes(q);
            const tableMatch = res.table?.table_number?.toLowerCase().includes(q);
            const notesMatch = res.notes?.toLowerCase().includes(q);
            if (!nameMatch && !phoneMatch && !tableMatch && !notesMatch) return false;
        }

        return true;
    });

    if (!isClient || !isLoggedIn) return null;

    return (
        <div className="flex bg-background dark:bg-background min-h-screen transition-colors duration-300" dir="rtl">
            <Sidebar />

            <main className={`flex-1 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-80'} min-h-screen p-6 lg:p-8 transition-all duration-300`}>
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-600/20">
                            <BadgeCheck className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">
                                الحجوزات وإدارة الطاولات
                            </h1>
                            <p className="text-gray-400 dark:text-gray-500 text-[13px] font-bold opacity-80">
                                متابعة حجوزات الضيوف وتسكينهم المباشر في نقطة البيع
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="group flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-sky-600/20 active:scale-95 transition-all font-black text-xs"
                    >
                        <Plus className="w-4 h-4" />
                        حجز طاولة جديد
                    </button>
                </header>

                {/* Practical Top Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-card dark:bg-card border border-gray-100 dark:border-gray-800/60 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-600 flex items-center justify-center shrink-0 border border-sky-200/40">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-gray-400 block mb-0.5">حجوزات اليوم</span>
                            <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                                {todayReservations.length}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card dark:bg-card border border-gray-100 dark:border-gray-800/60 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/40">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-gray-400 block mb-0.5">الحجوزات المؤكدة</span>
                            <span className="text-2xl font-black text-emerald-600 tabular-nums">
                                {confirmedReservations.length}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card dark:bg-card border border-gray-100 dark:border-gray-800/60 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/40">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-gray-400 block mb-0.5">ضيوف اليوم المتوقعين</span>
                            <span className="text-2xl font-black text-amber-600 tabular-nums">
                                {todayGuestsCount} <span className="text-xs font-bold text-gray-400">شخص</span>
                            </span>
                        </div>
                    </div>

                    <div className="bg-card dark:bg-card border border-gray-100 dark:border-gray-800/60 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-600 flex items-center justify-center shrink-0 border border-violet-200/40">
                            <Utensils className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-gray-400 block mb-0.5">طاولات محجوزة اليوم</span>
                            <span className="text-2xl font-black text-violet-600 tabular-nums">
                                {bookedTableIdsToday.size} <span className="text-xs font-bold text-gray-400">من {tables.length} طاولة</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <section className="bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                    {/* Filter Tabs & Search Bar */}
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800/40 flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Status Tabs */}
                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                            <button
                                onClick={() => setActiveTab('today')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    activeTab === 'today'
                                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                                        : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                                <span>📅</span>
                                <span>حجوزات اليوم ({todayReservations.length})</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                    activeTab === 'all'
                                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                                        : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                                الكل ({reservationsData.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('confirmed')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                    activeTab === 'confirmed'
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                        : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                                مؤكد ({confirmedReservations.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                    activeTab === 'pending'
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                                        : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                                قيد الانتظار ({reservationsData.filter(r => r.status === 'pending').length})
                            </button>
                            <button
                                onClick={() => setActiveTab('completed')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                    activeTab === 'completed'
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                                        : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                                مكتمل / جالس ({reservationsData.filter(r => r.status === 'completed').length})
                            </button>
                        </div>

                        {/* Real-time Search Input */}
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="بحث بالاسم، الهاتف، أو الطاولة..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100/50 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-sky-600/10 rounded-xl pr-10 pl-4 text-xs font-bold transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto text-sm">
                        <table className="w-full text-right" dir="rtl">
                            <thead>
                                <tr className="bg-gray-50/30 dark:bg-gray-900/20 border-b border-gray-50 dark:border-gray-800/40">
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">العميل ومعلومات الاتصال</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الطاولة والموقع</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">موعد الحجز</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none text-center">الضيوف</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">تغيير الحالة السريع</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none text-center">الإجراءات ونقطة البيع</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-gray-400 font-bold italic">جاري تحميل بيانات الحجوزات...</td></tr>
                                ) : filteredReservations.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center">
                                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 mb-1">لا توجد حجوزات مطابقة للفلتر أو البحث المحدد</p>
                                            <p className="text-xs text-gray-400">يمكنك إضافة حجز جديد أو اختيار تبويب فلترة آخر.</p>
                                        </td>
                                    </tr>
                                ) : filteredReservations.map((res) => {
                                    const reservationIsToday = isToday(res.reservation_time);
                                    return (
                                        <tr key={res.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/30 transition-colors group">
                                            {/* Customer Info */}
                                            <td className="px-6 py-4">
                                                <div className="font-black text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-sky-500" />
                                                    <span>{res.customer_name}</span>
                                                </div>
                                                <div className="mt-1 flex items-center gap-2 text-xs font-bold text-gray-400">
                                                    <a
                                                        href={`tel:${res.customer_phone}`}
                                                        className="hover:text-sky-600 transition-colors flex items-center gap-1"
                                                        title="اتصال بالعميل"
                                                    >
                                                        <Phone className="w-3 h-3 text-emerald-500" />
                                                        <span className="tabular-nums" dir="ltr">{res.customer_phone}</span>
                                                    </a>
                                                </div>
                                                {res.notes && (
                                                    <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200/40 inline-flex items-center gap-1 max-w-xs truncate">
                                                        <FileText className="w-2.5 h-2.5 shrink-0" />
                                                        <span className="truncate">{res.notes}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Table Info / Reservation Type */}
                                            <td className="px-6 py-4">
                                                {res.table ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 font-black text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-lg text-xs border border-sky-200/50 dark:border-sky-900/30">
                                                            <Utensils className="w-3 h-3" />
                                                            طاولة {res.table.table_number}
                                                        </span>
                                                        <div className="text-[10px] font-bold text-gray-400 mt-1 flex items-center gap-1.5">
                                                            <span>سعة: {res.table.capacity} أشخاص</span>
                                                            {res.table.location && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{res.table.location}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : res.notes?.includes('[حجز خارجي]') ? (
                                                    <span className="inline-flex items-center gap-1.5 font-black text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg text-xs border border-purple-200/50 dark:border-purple-900/30">
                                                        <TreePine className="w-3 h-3" />
                                                        حجز خارجي (سفري / مناسبة)
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">بدون طاولة محددة</span>
                                                )}
                                            </td>

                                            {/* Time & Date */}
                                            <td className="px-6 py-4 text-xs font-bold">
                                                <div className="flex items-center gap-1.5 text-gray-900 dark:text-gray-200">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>{new Date(res.reservation_time).toLocaleDateString('en-GB')}</span>
                                                    {reservationIsToday && (
                                                        <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                                                            اليوم
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-gray-400 mt-1">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="tabular-nums">
                                                        {new Date(res.reservation_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Guests */}
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg text-xs font-black">
                                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                                    {res.number_of_guests}
                                                </span>
                                            </td>

                                            {/* Status with Quick Dropdown */}
                                            <td className="px-6 py-4">
                                                <div className="relative inline-block">
                                                    <select
                                                        value={res.status}
                                                        onChange={(e) => handleQuickStatusChange(res.id, e.target.value)}
                                                        className={`text-xs font-black rounded-lg px-2.5 py-1.5 outline-none cursor-pointer border transition-all appearance-none pr-3 pl-6 ${
                                                            res.status === 'confirmed'
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/50'
                                                                : res.status === 'completed'
                                                                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800/50'
                                                                : res.status === 'cancelled'
                                                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800/50'
                                                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/50'
                                                        }`}
                                                    >
                                                        <option value="confirmed">مؤكد</option>
                                                        <option value="pending">قيد الانتظار</option>
                                                        <option value="completed">حاضر / جالس</option>
                                                        <option value="cancelled">ملغي</option>
                                                    </select>
                                                    <ChevronDown className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                                                </div>
                                            </td>

                                            {/* Actionable Buttons: Open in POS */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Open in POS Button */}
                                                    <button
                                                        onClick={() => handleOpenInPOS(res)}
                                                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-md shadow-emerald-600/15 active:scale-95 transition-all"
                                                        title="تسكين الضيوف وفتح الطاولة مباشرة في شاشة نقطة البيع"
                                                    >
                                                        <Utensils className="w-3.5 h-3.5" />
                                                        <span>فتح في نقطة البيع</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenModal(res)}
                                                        className="p-2 bg-sky-50/60 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-xl hover:scale-110 transition-all border border-sky-200/50 dark:border-sky-900/30"
                                                        title="تعديل تفاصيل الحجز"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(res.id)}
                                                        className="p-2 bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl hover:scale-110 transition-all border border-rose-200/50 dark:border-rose-900/30"
                                                        title="حذف الحجز"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* Create/Edit Reservation Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'تعديل بيانات الحجز' : 'إضافة حجز طاولة جديد'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">اسم العميل</label>
                        <input
                            type="text"
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10"
                            placeholder="مثال: محمد علي"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">رقم الهاتف</label>
                            <input
                                type="text"
                                value={formData.customer_phone}
                                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10"
                                placeholder="091XXXXXXX"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">عدد الأشخاص</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.number_of_guests}
                                onChange={(e) => setFormData({ ...formData, number_of_guests: parseInt(e.target.value) || 1 })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">موعد الحجز</label>
                        <input
                            type="datetime-local"
                            value={formData.reservation_time}
                            onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                            className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10"
                            required
                        />
                    </div>
                    {/* Reservation Type: Internal vs External */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">
                            نوع الحجز
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setReservationType('internal');
                                    if (!formData.table_id && tables.length > 0) {
                                        setFormData(prev => ({ ...prev, table_id: tables[0].id }));
                                    }
                                }}
                                className={`flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-black border transition-all ${
                                    reservationType === 'internal'
                                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-700 dark:text-sky-300 shadow-sm ring-2 ring-sky-500/20'
                                        : 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                <Home className="w-4 h-4" />
                                <span>حجز داخلي (طاولة)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setReservationType('external');
                                    setFormData(prev => ({ ...prev, table_id: undefined }));
                                }}
                                className={`flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-black border transition-all ${
                                    reservationType === 'external'
                                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm ring-2 ring-purple-500/20'
                                        : 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                <TreePine className="w-4 h-4" />
                                <span>حجز خارجي (بدون طاولة)</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Table Select - Only shown when reservationType is 'internal' */}
                        {reservationType === 'internal' ? (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الطاولة</label>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setIsTableModalOpen(true)}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-[10px] font-black border border-sky-200/60 dark:border-sky-800/60 transition-colors"
                                            title="إضافة طاولة جديدة مباشرة"
                                        >
                                            <Plus className="w-3 h-3" />
                                            <span>طاولة جديدة</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRefreshTables}
                                            className="p-1 rounded-lg text-gray-400 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            title="تحديث قائمة الطاولات"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => window.open('/tables', '_blank')}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-gray-500 hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400 text-[10px] font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            title="فتح صفحة الطاولات في تبويب جديد"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            <span>صفحة الطاولات</span>
                                        </button>
                                    </div>
                                </div>
                                <select
                                    value={formData.table_id || ''}
                                    onChange={(e) => setFormData({ ...formData, table_id: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10"
                                    required={reservationType === 'internal'}
                                >
                                    <option value="">اختر طاولة للزبون...</option>
                                    {tables.map(table => (
                                        <option key={table.id} value={table.id}>
                                            طاولة {table.table_number} (سعة: {table.capacity} أشخاص) {table.location ? `- ${table.location}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-1 flex flex-col justify-center bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30 rounded-xl px-3 py-2">
                                <span className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest">نوع الحجز</span>
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
                                    حجز خارجي — لا يتطلب حجز طاولة في الصالة
                                </span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الحالة</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10"
                                required
                            >
                                <option value="confirmed">مؤكد</option>
                                <option value="pending">قيد الانتظار</option>
                                <option value="completed">حاضر / جالس</option>
                                <option value="cancelled">ملغي</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">ملاحظات وطلبات خاصة</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="أي طلبات خاصة بالضيوف (تزيين، مكان هادئ، حساسية...)"
                            className="w-full h-20 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10 resize-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Save className="w-4 h-4" />
                        {editingItem ? 'حفظ تعديلات الحجز' : 'تأكيد وحفظ الحجز'}
                    </button>
                </form>
            </Modal>

            {/* Quick Add Table Modal */}
            <Modal
                isOpen={isTableModalOpen}
                onClose={() => setIsTableModalOpen(false)}
                title="إضافة طاولة جديدة"
            >
                <form onSubmit={handleCreateTable} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">رقم / اسم الطاولة</label>
                            <input
                                type="text"
                                required
                                value={tableFormData.table_number || ''}
                                onChange={(e) => setTableFormData({ ...tableFormData, table_number: e.target.value })}
                                placeholder="مثال: T12 أو VIP-2"
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">السعة (عدد الأشخاص)</label>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                required
                                value={tableFormData.capacity || 4}
                                onChange={(e) => setTableFormData({ ...tableFormData, capacity: parseInt(e.target.value) || 1 })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الموقع / القسم</label>
                            <input
                                type="text"
                                value={tableFormData.location || ''}
                                onChange={(e) => setTableFormData({ ...tableFormData, location: e.target.value })}
                                placeholder="مثال: الصالة الرئيسية، التراس، الطابق الثاني"
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الحالة</label>
                            <select
                                value={tableFormData.status || 'available'}
                                onChange={(e) => setTableFormData({ ...tableFormData, status: e.target.value })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-600/10"
                            >
                                <option value="available">متاحة</option>
                                <option value="reserved">محجوزة</option>
                                <option value="occupied">مشغولة</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => window.open('/tables', '_blank')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-sky-600 transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>فتح صفحة الطاولات الكاملة</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsTableModalOpen(false)}
                                className="px-4 h-10 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isCreatingTable}
                                className="px-5 h-10 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {isCreatingTable ? 'جاري الإضافة...' : 'إضافة واختيار الطاولة'}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
