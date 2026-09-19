'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Modal, DeleteConfirmModal } from '@/components';
import {
    Plus,
    Search,
    Filter,
    Pencil,
    Trash2,
    Package,
    Activity,
    AlertTriangle,
    Save,
    Image as ImageIcon
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import { inventoryService, Ingredient } from '@/services/inventoryService';

export default function InventoryPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn } = useAuthStore();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [inventoryData, setInventoryData] = useState<Ingredient[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
    const [formData, setFormData] = useState<Partial<Ingredient>>({
        name: '',
        current_stock: 0,
        unit: 'KG',
        cost_per_unit: 0,
        reorder_level: 0
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        item: Ingredient | null;
        isLoading: boolean;
    }>({
        isOpen: false,
        item: null,
        isLoading: false
    });

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        } else {
            fetchInventory();
        }
    }, [isLoggedIn, router]);

    const fetchInventory = async () => {
        try {
            setIsLoading(true);
            const data = await inventoryService.getIngredients();
            setInventoryData(data);
        } catch (err) {
            console.error('Fetch inventory failed', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (item?: Ingredient) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                current_stock: item.current_stock,
                unit: item.unit,
                cost_per_unit: item.cost_per_unit,
                reorder_level: item.reorder_level
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                current_stock: 0,
                unit: 'KG',
                cost_per_unit: 0,
                reorder_level: 5
            });
        }
        setImageFile(null);
        setPreviewUrl(item?.image ? (item.image.startsWith('http') ? item.image : `http://localhost:8000${item.image}`) : null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = new FormData();
            const submitData = { ...formData };
            
            // إذا كان الصنف جديداً ولا يوجد رصيد أول مدة، يُثبت سعر التكلفة على 0 ليُحسب آلياً من الفواتير
            if (!editingItem && (!submitData.current_stock || submitData.current_stock <= 0)) {
                submitData.current_stock = 0;
                submitData.cost_per_unit = 0;
            }

            Object.entries(submitData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    data.append(key, value.toString());
                }
            });
            if (imageFile) {
                data.append('image', imageFile);
            }

            if (editingItem) {
                await inventoryService.updateIngredient(editingItem.id, data);
            } else {
                await inventoryService.createIngredient(data);
            }
            setIsModalOpen(false);
            fetchInventory();
        } catch (err) {
            console.error('Save failed', err);
        }
    };

    const handleOpenDelete = (item: Ingredient) => {
        setDeleteModal({
            isOpen: true,
            item,
            isLoading: false
        });
    };

    const handleConfirmDelete = async () => {
        if (!deleteModal.item) return;
        setDeleteModal(prev => ({ ...prev, isLoading: true }));
        try {
            await inventoryService.deleteIngredient(deleteModal.item.id);
            setDeleteModal({ isOpen: false, item: null, isLoading: false });
            fetchInventory();
        } catch (err) {
            console.error('Delete failed', err);
            setDeleteModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    if (!isClient || !isLoggedIn) return null;

    return (
        <div className="flex bg-background dark:bg-background min-h-screen transition-colors duration-300" dir="rtl">
            <Sidebar />

            <main className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-6 lg:p-8 transition-all duration-300`}>
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-600/20">
                            <Package className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">المخزون</h1>
                            <p className="text-gray-400 dark:text-gray-500 text-[13px] font-bold opacity-70">الموارد والخامات</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="group flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl shadow-lg shadow-amber-600/15 active:scale-95 transition-all font-black text-xs"
                    >
                        <Plus className="w-4 h-4" />
                        صنف جديد
                    </button>
                </header>

                <section className="bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 dark:border-gray-800/30 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-amber-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="بحث في المخزون..."
                                className="w-full h-10 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100/50 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-amber-600/10 rounded-xl pr-10 pl-4 text-sm font-bold transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto text-sm">
                        <table className="w-full text-right" dir="rtl">
                            <thead>
                                <tr className="bg-gray-50/30 dark:bg-gray-900/20 border-b border-gray-50 dark:border-gray-800/40">
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">المادة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الكمية</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">سعر تكلفة الوحدة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الوحدة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">التنبيه</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الحالة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-bold italic">جاري التحميل...</td></tr>
                                ) : inventoryData.map((item) => {
                                    const isLowStock = item.current_stock <= item.reorder_level;
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-colors group">
                                            <td className="px-6 py-4 font-black text-gray-900 dark:text-gray-200">
                                                <div className="flex items-center gap-3">
                                                    {item.image ? (
                                                        <img
                                                            src={item.image.startsWith('http') ? item.image : `http://localhost:8000${item.image}`}
                                                            alt={item.name}
                                                            className="w-10 h-10 rounded-xl object-cover shadow-sm group-hover:scale-110 transition-transform"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                            <Package className="w-5 h-5 text-gray-400 opacity-50" />
                                                        </div>
                                                    )}
                                                    {item.name}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 font-black tabular-nums transition-colors text-base ${isLowStock ? 'text-rose-500' : 'text-gray-900 dark:text-white'}`}>
                                                {item.current_stock}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 font-bold tabular-nums">
                                                {item.cost_per_unit} د.ل
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-tighter">{item.unit}</td>
                                            <td className="px-6 py-4 text-gray-400 font-bold text-xs tabular-nums">{item.reorder_level}</td>
                                            <td className="px-6 py-4">
                                                {isLowStock ? (
                                                    <span className="inline-flex items-center gap-1.5 text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        منخفض
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                                                        <Activity className="w-3.5 h-3.5" />
                                                        جيد
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-3">
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="p-2 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl hover:scale-110 transition-all border border-amber-100 dark:border-amber-900/30"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDelete(item)}
                                                        className="p-2 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl hover:scale-110 transition-all border border-rose-100 dark:border-rose-900/30"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'تعديل مادة' : 'إضافة مادة جديدة'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">اسم المادة</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-600/10"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">
                                {editingItem ? 'الكمية الحالية في المخزن' : 'الرصيد الافتتاحي (أول المدة)'}
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={formData.current_stock !== undefined && !isNaN(formData.current_stock) ? formData.current_stock : ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const newStock = isNaN(val) ? 0 : val;
                                    setFormData(prev => ({
                                        ...prev,
                                        current_stock: newStock,
                                        cost_per_unit: !editingItem && newStock <= 0 ? 0 : prev.cost_per_unit
                                    }));
                                }}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-600/10"
                                placeholder="0 (اتركه 0 إذا لم يكن هناك رصيد مسبق)"
                                required
                            />
                            {!editingItem && (
                                <p className="text-[9px] text-gray-400 font-medium">اتركه 0 إذا كان الصنف جديداً وسيتم توريده بالفواتير.</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">وحدة القياس</label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-600/10"
                                required
                            >
                                <option value="KG">كيلوجرام (KG)</option>
                                <option value="Liter">لتر (Liter)</option>
                                <option value="Piece">قطعة (Piece)</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            {!editingItem ? (
                                (formData.current_stock || 0) > 0 ? (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mr-1">
                                                سعر أول المدة (للوحدة) *
                                            </label>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                                                رصيد افتتاحي
                                            </span>
                                        </div>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={formData.cost_per_unit !== undefined && !isNaN(formData.cost_per_unit) ? formData.cost_per_unit : ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setFormData({ ...formData, cost_per_unit: isNaN(val) ? 0 : val });
                                            }}
                                            className="w-full h-10 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-600/20"
                                            placeholder="أدخل تكلفة الوحدة للرصيد السابق"
                                            required
                                        />
                                        <p className="text-[9px] text-amber-600/80 dark:text-amber-400/80 font-medium">
                                            يُحدد هذا السعر لتقييم رصيد أول المدة المتوفر قبل بدء استخدام فواتير النظام.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">
                                                سعر التكلفة (محسوب آلياً)
                                            </label>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                                                آلي من الفواتير
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value="0.00 (يحدد تلقائياً مع أول فاتورة)"
                                            readOnly
                                            disabled
                                            className="w-full h-10 bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-4 text-xs font-bold text-gray-400 cursor-not-allowed select-none"
                                        />
                                        <p className="text-[9px] text-gray-400 font-medium">
                                            محسوب آلياً بدون تدخل بشري؛ سيتم تحديد السعر فور تسجيل أول فاتورة توريد.
                                        </p>
                                    </>
                                )
                            ) : (
                                <>
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">
                                            سعر التكلفة الحالي للوحدة
                                        </label>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                            محسوب آلياً
                                        </span>
                                    </div>
                                    <input
                                        type="number"
                                        value={formData.cost_per_unit ?? 0}
                                        readOnly
                                        disabled
                                        className="w-full h-10 bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-4 text-sm font-bold text-gray-500 cursor-not-allowed select-none"
                                    />
                                    <p className="text-[9px] text-gray-400 font-medium">
                                        يتم احتسابه وتحديثه تلقائياً بنظام المتوسط المرجح عبر فواتير المشتريات.
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">مستوى إعادة الطلب</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={formData.reorder_level !== undefined && !isNaN(formData.reorder_level) ? formData.reorder_level : ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setFormData({ ...formData, reorder_level: isNaN(val) ? 0 : val });
                                }}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-600/10"
                                required
                            />
                            <p className="text-[9px] text-gray-400 font-medium">سيظهر تنبيه عندما تصل الكمية إلى هذا المستوى أو أقل.</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">صورة المادة</label>
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setImageFile(file);
                                            setPreviewUrl(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-gray-950/40 border-2 border-dashed border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center group-hover:border-amber-600/30 transition-all overflow-hidden">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <ImageIcon className="w-6 h-6 text-gray-400" />
                                            <span className="text-[8px] font-black text-gray-400 mt-1 uppercase">اختر</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                    يمكنك رفع صورة تعبيرية للمادة لتسهيل التعرف عليها بصرياً في المخزون.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Save className="w-4 h-4" />
                        {editingItem ? 'حفظ التعديلات' : 'إضافة للمخزون'}
                    </button>
                </form>
            </Modal>

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null, isLoading: false })}
                onConfirm={handleConfirmDelete}
                itemName={deleteModal.item?.name}
                isLoading={deleteModal.isLoading}
            />
        </div>
    );
}
