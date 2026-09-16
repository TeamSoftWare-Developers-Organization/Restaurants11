'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Modal } from '@/components';
import {
    Table as TableIcon,
    Plus,
    Search,
    Pencil,
    Trash2,
    Users,
    Save,
    MapPin,
    AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import { reservationService, Table } from '@/services/reservationService';

export default function TablesPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn } = useAuthStore();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [tables, setTables] = useState<Table[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Table | null>(null);
    const [formData, setFormData] = useState<Partial<Table>>({
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
            fetchTables();
        }
    }, [isLoggedIn, router]);

    const fetchTables = async () => {
        try {
            setIsLoading(true);
            const data = await reservationService.getTables();
            setTables(data);
        } catch (err) {
            console.error('Fetch tables failed', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (item?: Table) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                table_number: item.table_number,
                capacity: item.capacity,
                status: item.status,
                location: item.location || ''
            });
        } else {
            setEditingItem(null);
            setFormData({
                table_number: '',
                capacity: 4,
                status: 'available',
                location: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await reservationService.updateTable(editingItem.id, formData);
            } else {
                await reservationService.createTable(formData);
            }
            setIsModalOpen(false);
            fetchTables();
        } catch (err) {
            console.error('Save failed', err);
        }
    };

    if (!isClient || !isLoggedIn) return null;

    return (
        <div className="flex bg-background dark:bg-background min-h-screen transition-colors duration-300" dir="rtl">
            <Sidebar />

            <main className={`flex-1 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-80'} min-h-screen p-6 lg:p-8 transition-all duration-300`}>
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-600/20">
                            <TableIcon className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">إدارة الطاولات</h1>
                            <p className="text-gray-400 dark:text-gray-500 text-[13px] font-bold opacity-70">تنظيم وتوزيع طاولات المطعم</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="group flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-xl shadow-lg shadow-cyan-600/15 active:scale-95 transition-all font-black text-xs"
                    >
                        <Plus className="w-4 h-4" />
                        طاولة جديدة
                    </button>
                </header>

                <section className="bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 dark:border-gray-800/30">
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-cyan-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="بحث عن طاولة..."
                                className="w-full h-10 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100/50 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-cyan-600/10 rounded-xl pr-10 pl-4 text-sm font-bold transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto text-sm">
                        <table className="w-full text-right" dir="rtl">
                            <thead>
                                <tr className="bg-gray-50/30 dark:bg-gray-900/20 border-b border-gray-50 dark:border-gray-800/40">
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">رقم الطاولة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الموقع</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">السعة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الحالة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold italic">جاري التحميل...</td></tr>
                                ) : tables.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold italic">لا توجد طاولات مسجلة</td></tr>
                                ) : tables.map((table) => (
                                    <tr key={table.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-colors group">
                                        <td className="px-6 py-4 font-black text-gray-900 dark:text-gray-200">طاولة {table.table_number}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-500 font-semibold text-xs">
                                                <MapPin className="w-3.5 h-3.5 opacity-40" />
                                                {table.location || 'غير محدد'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-400 font-black tabular-nums">
                                                <Users className="w-3.5 h-3.5 opacity-40" />
                                                {table.capacity} أشخاص
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-black ${table.status === 'available' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                                                table.status === 'occupied' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' :
                                                    table.status === 'reserved' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' :
                                                        'bg-gray-50 dark:bg-gray-900 text-gray-500'
                                                }`}>
                                                {table.status === 'available' ? 'شاغرة' :
                                                    table.status === 'occupied' ? 'مشغولة' :
                                                        table.status === 'reserved' ? 'محجوزة' : 'تحت التنظيف'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    onClick={() => handleOpenModal(table)}
                                                    className="p-2 bg-cyan-50/50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 rounded-xl hover:scale-110 transition-all border border-cyan-100 dark:border-cyan-900/30"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(table.id)}
                                                    className="p-2 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl hover:scale-110 transition-all border border-rose-100 dark:border-rose-900/30"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'تعديل بيانات الطاولة' : 'إضافة طاولة جديدة'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">رقم الطاولة</label>
                        <input
                            type="text"
                            value={formData.table_number}
                            onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                            className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-600/10"
                            required
                            placeholder="مثال: A1, 5"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">السعة (أشخاص)</label>
                            <input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-600/10"
                                required
                                min="1"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الموقع</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-600/10"
                                placeholder="داخلي، خارجي..."
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الحالة</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-600/10 appearance-none"
                            required
                        >
                            <option value="available">شاغرة</option>
                            <option value="occupied">مشغولة</option>
                            <option value="reserved">محجوزة</option>
                            <option value="cleaning">تحتاج تنظيف</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 mt-4"
                    >
                        <Save className="w-4 h-4" />
                        {editingItem ? 'حفظ التعديلات' : 'إضافة الطاولة'}
                    </button>
                </form>
            </Modal>
        </div>
    );

    async function handleDelete(id: number) {
        if (confirm('هل أنت متأكد من حذف هذه الطاولة؟')) {
            try {
                await reservationService.deleteTable(id);
                fetchTables();
            } catch (err) {
                console.error('Delete failed', err);
            }
        }
    }
}
