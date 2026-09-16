'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Modal } from '@/components';
import {
    Plus,
    Search,
    Filter,
    Pencil,
    Trash2,
    Utensils,
    Image as ImageIcon,
    Save,
    ChevronDown
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import { menuService, MenuItem, Category, isLiquidOrDrink } from '@/services/menuService';
import { inventoryService, Ingredient, RecipeIngredient } from '@/services/inventoryService';
import { ChefHat } from 'lucide-react';
import { getFullUrl } from '@/lib/api';

export default function MenuPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn } = useAuthStore();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [menuData, setMenuData] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [menuTypeFilter, setMenuTypeFilter] = useState<'all' | 'food' | 'drinks'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState<Partial<MenuItem>>({
        name: '',
        price: 0,
        description: '',
        category_id: undefined,
        is_available: true
    });
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');

    // Recipe State
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const [selectedItemForRecipe, setSelectedItemForRecipe] = useState<MenuItem | null>(null);
    const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
    const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
    const [allRecipes, setAllRecipes] = useState<RecipeIngredient[]>([]);
    const [quickPrice, setQuickPrice] = useState<number>(0);
    const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
    const [newRecipeData, setNewRecipeData] = useState({
        ingredient_id: 0,
        quantity_needed: 0
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
            const [items, cats, recipes] = await Promise.all([
                menuService.getMenuItems(),
                menuService.getCategories(),
                inventoryService.getAllRecipes().catch(() => [])
            ]);
            setMenuData(items);
            setCategories(cats);
            setAllRecipes(recipes);
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getItemPrepCost = (itemId: number) => {
        const itemRecipes = allRecipes.filter(r => (r.menu_item as any)?.id === itemId || (r.menu_item as any) === itemId);
        return itemRecipes.reduce((sum, r) => sum + ((r.ingredient?.cost_per_unit || 0) * (r.quantity_needed || 0)), 0);
    };

    const handleOpenModal = (item?: MenuItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                price: item.price,
                description: item.description,
                category_id: (item.category as any)?.id,
                is_available: item.is_available,
                image_url: item.image_url
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                price: 0,
                description: '',
                category_id: categories[0]?.id,
                is_available: true,
                image_url: ''
            });
        }
        setImageFile(null);
        setImagePreview('');
        if (categories.length === 0) {
            setIsAddingCategory(true);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsUploading(true);
            let finalImageUrl = formData.image_url;

            if (imageFile) {
                const uploadRes = await menuService.uploadImage(imageFile);
                finalImageUrl = uploadRes.image_url;
            }

            const payload = { ...formData, image_url: finalImageUrl };

            if (editingItem) {
                await menuService.updateMenuItem(editingItem.id, payload);
            } else {
                await menuService.createMenuItem(payload);
            }
            setIsModalOpen(false);
            setImageFile(null);
            setImagePreview('');
            fetchData();
        } catch (err) {
            console.error('Save failed', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const newCat = await menuService.createCategory(newCategoryName);
            setCategories([...categories, newCat]);
            setFormData({ ...formData, category_id: newCat.id });
            setNewCategoryName('');
            setIsAddingCategory(false);
        } catch (err) {
            console.error('Failed to add category', err);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
            try {
                await menuService.deleteMenuItem(id);
                fetchData();
            } catch (err) {
                console.error('Delete failed', err);
            }
        }
    };

    const handleOpenRecipeModal = async (item: MenuItem) => {
        setSelectedItemForRecipe(item);
        try {
            const [recipe, ingredients] = await Promise.all([
                inventoryService.getRecipeForItem(item.id),
                inventoryService.getIngredients()
            ]);
            setRecipeIngredients(recipe);
            setAvailableIngredients(ingredients);
            setNewRecipeData({
                ingredient_id: ingredients[0]?.id || 0,
                quantity_needed: 0
            });
            setQuickPrice(item.price || 0);
            setIsRecipeModalOpen(true);
        } catch (err) {
            console.error('Failed to load recipe data', err);
        }
    };

    const handleUpdateItemPrice = async (newPriceVal: number) => {
        if (!selectedItemForRecipe || isNaN(newPriceVal) || newPriceVal <= 0) return;
        try {
            setIsUpdatingPrice(true);
            const updated = await menuService.updateMenuItem(selectedItemForRecipe.id, {
                ...selectedItemForRecipe,
                price: newPriceVal,
                category_id: (selectedItemForRecipe.category as any)?.id
            });
            setSelectedItemForRecipe(updated);
            setQuickPrice(updated.price);
            setMenuData(prev => prev.map(m => m.id === updated.id ? updated : m));
        } catch (err) {
            console.error('Failed to update price', err);
        } finally {
            setIsUpdatingPrice(false);
        }
    };

    const handleAddIngredientToRecipe = async () => {
        if (!selectedItemForRecipe || !newRecipeData.ingredient_id || newRecipeData.quantity_needed <= 0) return;
        try {
            await inventoryService.addIngredientToRecipe(selectedItemForRecipe.id, newRecipeData);
            const [recipe, all] = await Promise.all([
                inventoryService.getRecipeForItem(selectedItemForRecipe.id),
                inventoryService.getAllRecipes().catch(() => [])
            ]);
            setRecipeIngredients(recipe);
            setAllRecipes(all);
            setNewRecipeData({ ...newRecipeData, quantity_needed: 0 });
        } catch (err) {
            console.error('Failed to add ingredient to recipe', err);
        }
    };

    const handleRemoveIngredientFromRecipe = async (id: number) => {
        try {
            await inventoryService.removeIngredientFromRecipe(id);
            if (selectedItemForRecipe) {
                const [recipe, all] = await Promise.all([
                    inventoryService.getRecipeForItem(selectedItemForRecipe.id),
                    inventoryService.getAllRecipes().catch(() => [])
                ]);
                setRecipeIngredients(recipe);
                setAllRecipes(all);
            }
        } catch (err) {
            console.error('Failed to remove ingredient', err);
        }
    };

    const foodCount = menuData.filter(item => !isLiquidOrDrink(item)).length;
    const drinksCount = menuData.filter(item => isLiquidOrDrink(item)).length;

    const filteredMenu = menuData.filter(item => {
        const isDrink = isLiquidOrDrink(item);
        if (menuTypeFilter === 'food' && isDrink) return false;
        if (menuTypeFilter === 'drinks' && !isDrink) return false;
        if (selectedCategory !== 'all' && item.category?.name !== selectedCategory) return false;
        if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    if (!isClient || !isLoggedIn) return null;

    return (
        <div className="flex bg-background dark:bg-background min-h-screen transition-colors duration-300" dir="rtl">
            <Sidebar />

            <main className={`flex-1 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-80'} min-h-screen p-6 lg:p-8 transition-all duration-300`}>
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/20">
                            <ChefHat className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">قائمة الطعام</h1>
                            <p className="text-gray-400 dark:text-gray-500 text-[13px] font-bold opacity-70">إدارة الأصناف والأسعار</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="group flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-xl shadow-lg shadow-violet-600/15 active:scale-95 transition-all font-black text-xs"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة صنف
                    </button>
                </header>

                <section className="bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                    {/* Filter and Search Bar */}
                    <div className="p-6 border-b border-gray-50 dark:border-gray-800/30 flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Type Tabs: All / Food / Drinks */}
                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                            <button
                                onClick={() => setMenuTypeFilter('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                    menuTypeFilter === 'all'
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                                        : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                                الكل ({menuData.length})
                            </button>
                            <button
                                onClick={() => setMenuTypeFilter('food')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                    menuTypeFilter === 'food'
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                                        : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                                <span>🍽️</span>
                                <span>أطباق الطعام ({foodCount})</span>
                            </button>
                            <button
                                onClick={() => setMenuTypeFilter('drinks')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                    menuTypeFilter === 'drinks'
                                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                                        : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                                <span>🥤</span>
                                <span>المشروبات والسوائل ({drinksCount})</span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-violet-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="بحث في المنيو..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100/50 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-violet-600/10 rounded-xl pr-10 pl-4 text-sm font-bold transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto text-sm">
                        <table className="w-full text-right" dir="rtl">
                            <thead>
                                <tr className="bg-gray-50/30 dark:bg-gray-900/20 border-b border-gray-50 dark:border-gray-800/40">
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الصنف والنوع</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الفئة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">السعر</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الحالة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold italic">جاري التحميل...</td></tr>
                                ) : filteredMenu.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold italic">لا توجد أصناف مطابقة للبحث أو الفلتر</td></tr>
                                ) : filteredMenu.map((item) => {
                                    const isDrink = isLiquidOrDrink(item);
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 dark:border-gray-800">
                                                        {item.image_url ? (
                                                            <img src={getFullUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Utensils className="w-5 h-5 text-gray-300" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-gray-900 dark:text-gray-200">{item.name}</div>
                                                        <div className="mt-1">
                                                            {isDrink ? (
                                                                <span className="inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200/40 dark:border-sky-800/30 px-2 py-0.5 rounded text-[10px] font-bold">
                                                                    <span>🥤</span> مشروبات وسوائل
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-200/40 dark:border-violet-800/30 px-2 py-0.5 rounded text-[10px] font-bold">
                                                                    <span>🍽️</span> طبق طعام
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                                                    {item.category?.name || 'عام'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-black text-violet-600 tabular-nums text-sm">
                                                    {item.price} <span className="text-[10px] opacity-70">د.ل</span>
                                                </div>
                                                {!isDrink && (
                                                    <div className="mt-1">
                                                        {(() => {
                                                            const prepCost = getItemPrepCost(item.id);
                                                            if (prepCost > 0) {
                                                                const profit = item.price - prepCost;
                                                                const margin = item.price > 0 ? ((profit / item.price) * 100).toFixed(0) : '0';
                                                                return (
                                                                    <div className="space-y-0.5 text-[10px]">
                                                                        <div className="text-gray-400 font-bold">
                                                                            التكلفة: <span className="text-amber-600 font-black">{prepCost.toFixed(2)} د.ل</span>
                                                                        </div>
                                                                        <div className="text-emerald-600 dark:text-emerald-400 font-black">
                                                                            الربح: {profit.toFixed(2)} د.ل ({margin}%)
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <span className="text-[10px] text-gray-400 font-medium">
                                                                    بدون وصفة تكلفة
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black ${item.is_available ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'}`}>
                                                    {item.is_available ? 'متاح' : 'غير متاح'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center items-center gap-2">
                                                    {!isDrink ? (
                                                        <button
                                                            onClick={() => handleOpenRecipeModal(item)}
                                                            className="p-2 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl hover:scale-110 transition-all border border-amber-100 dark:border-amber-900/30"
                                                            title="إدارة وصفة ومكونات الوجبة"
                                                        >
                                                            <ChefHat className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className="p-2 bg-gray-50 dark:bg-gray-900/40 text-gray-300 dark:text-gray-600 rounded-xl cursor-not-allowed text-[10px] font-bold border border-gray-100 dark:border-gray-800"
                                                            title="المشروبات والسوائل منتجات جاهزة لا تتطلب وصفات طهي"
                                                        >
                                                            منتج جاهز
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="p-2 bg-violet-50/50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 rounded-xl hover:scale-110 transition-all border border-violet-100 dark:border-violet-900/30"
                                                        title="تعديل الصنف"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl hover:scale-110 transition-all border border-rose-100 dark:border-rose-900/30"
                                                        title="حذف الصنف"
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
                title={editingItem ? 'تعديل صنف' : 'إضافة صنف جديد'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">اسم الصنف</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-600/10"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">السعر (د.ل)</label>
                            <input
                                type="number"
                                value={isNaN(formData.price as number) ? '' : formData.price}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setFormData({ ...formData, price: isNaN(val) ? 0 : val });
                                }}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-600/10"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between mr-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الفئة</label>
                            <button
                                type="button"
                                onClick={() => setIsAddingCategory(!isAddingCategory)}
                                className="text-[10px] font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest"
                            >
                                {isAddingCategory ? 'إلغاء' : '+ فئة جديدة'}
                            </button>
                        </div>

                        {isAddingCategory ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="اسم الفئة الجديدة..."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="flex-1 h-10 bg-gray-50 dark:bg-gray-950/40 border border-violet-200 dark:border-violet-900/30 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-600/10"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCategory}
                                    className="px-4 h-10 bg-violet-600 text-white rounded-xl font-black text-xs shadow-lg shadow-violet-600/10 active:scale-95 transition-all"
                                >
                                    إضافة
                                </button>
                            </div>
                        ) : (
                            <div className="relative group">
                                <select
                                    value={formData.category_id}
                                    onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                                    className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-600/10 appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" disabled>اختر الفئة...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-violet-600 transition-colors" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">صورة الصنف</label>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden flex items-center justify-center">
                                {imagePreview || formData.image_url ? (
                                    <img src={imagePreview || getFullUrl(formData.image_url)} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="w-6 h-6 text-gray-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setImageFile(file);
                                            setImagePreview(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="hidden"
                                    id="item-image"
                                />
                                <label
                                    htmlFor="item-image"
                                    className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-950/40 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    {(imagePreview || formData.image_url) ? 'تغيير الصورة' : 'اختر صورة...'}
                                </label>
                                <p className="text-[9px] text-gray-400 mt-1 font-bold">يفضل استخدام صور مربعة (PNG, JPG)</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الوصف</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full h-20 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-600/10 resize-none"
                        />
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl">
                        <input
                            type="checkbox"
                            checked={formData.is_available}
                            onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                            id="is_available"
                            className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-600/10"
                        />
                        <label htmlFor="is_available" className="text-sm font-bold text-gray-600 dark:text-gray-400 underline decoration-dotted">متاح للطلب الآن</label>
                    </div>
                    <div className="sticky bottom-0 pt-3 pb-1 bg-card dark:bg-card border-t border-gray-100 dark:border-gray-800/60 mt-4">
                        <button
                            type="submit"
                            disabled={isUploading}
                            className={`w-full h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isUploading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isUploading ? 'جاري الرفع...' : (editingItem ? 'حفظ التعديلات' : 'إضافة إلى القائمة')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Recipe Modal */}
            <Modal
                isOpen={isRecipeModalOpen}
                onClose={() => setIsRecipeModalOpen(false)}
                title={`إدارة مكونات وتكلفة: ${selectedItemForRecipe?.name}`}
            >
                {(() => {
                    const modalTotalCost = recipeIngredients.reduce((sum, ri) => sum + ((ri.ingredient?.cost_per_unit || 0) * (ri.quantity_needed || 0)), 0);
                    const modalSellingPrice = selectedItemForRecipe?.price || 0;
                    const modalProfit = modalSellingPrice > 0 ? modalSellingPrice - modalTotalCost : 0;
                    const modalMarginPct = modalSellingPrice > 0 ? ((modalProfit / modalSellingPrice) * 100).toFixed(1) : '0';

                    return (
                        <div className="space-y-6">
                            {/* Cost vs Selling Price Metric Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-3 rounded-xl text-center">
                                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 block mb-0.5">تكلفة التحضير</span>
                                    <span className="text-base font-black text-amber-600 tabular-nums">
                                        {modalTotalCost.toFixed(2)} <span className="text-[9px]">د.ل</span>
                                    </span>
                                </div>
                                <div className="bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30 p-3 rounded-xl text-center">
                                    <span className="text-[10px] font-black text-violet-700 dark:text-violet-400 block mb-0.5">سعر البيع الحالي</span>
                                    <span className="text-base font-black text-violet-600 tabular-nums">
                                        {modalSellingPrice.toFixed(2)} <span className="text-[9px]">د.ل</span>
                                    </span>
                                </div>
                                <div className={`p-3 rounded-xl text-center border ${
                                    modalProfit > 0
                                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/50 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/50 text-amber-700 dark:text-amber-400'
                                }`}>
                                    <span className="text-[10px] font-black block mb-0.5">صافي الربح</span>
                                    {modalProfit > 0 ? (
                                        <span className="text-base font-black text-emerald-600 tabular-nums">
                                            {modalProfit.toFixed(2)} <span className="text-[9px]">د.ل</span>
                                        </span>
                                    ) : (
                                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                                            يحتاج لتسعير
                                        </span>
                                    )}
                                </div>
                                <div className={`p-3 rounded-xl text-center border ${
                                    parseFloat(modalMarginPct) > 30
                                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/50 text-emerald-700 dark:text-emerald-300'
                                        : parseFloat(modalMarginPct) > 0
                                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/50 text-amber-700 dark:text-amber-300'
                                        : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/50 text-rose-700 dark:text-rose-300'
                                }`}>
                                    <span className="text-[10px] font-black block mb-0.5">هامش الربح</span>
                                    <span className="text-base font-black tabular-nums">
                                        {parseFloat(modalMarginPct) > 0 ? `${modalMarginPct}%` : '0.0%'}
                                    </span>
                                </div>
                            </div>

                            {/* Direct Meal Price Setting & Margin Calculator */}
                            <div className="bg-gradient-to-r from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                            <span>🎯</span> تحديد سعر بيع الوجبة بناءً على التكلفة
                                        </h4>
                                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                            التكلفة المحسوبة: {modalTotalCost.toFixed(2)} د.ل — يمكنك اعتماد هوامش ربح سريعة وتحديث سعر الوجبة مباشرة:
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {[
                                            { label: '+30% ربح', pct: 1.3 },
                                            { label: '+40% ربح', pct: 1.4 },
                                            { label: '+50% ربح', pct: 1.5 },
                                            { label: '+70% ربح', pct: 1.7 },
                                        ].map((preset) => {
                                            const suggested = modalTotalCost > 0 ? Math.ceil(modalTotalCost * preset.pct) : 0;
                                            return (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    disabled={modalTotalCost <= 0}
                                                    onClick={() => setQuickPrice(suggested)}
                                                    className="px-2 py-1 text-[10px] font-black bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-lg hover:bg-amber-100/50 transition-all disabled:opacity-40"
                                                    title={`سعر مقترح: ${suggested} د.ل`}
                                                >
                                                    {preset.label} ({suggested} د.ل)
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            step="0.25"
                                            min="0"
                                            value={quickPrice || ''}
                                            onChange={(e) => setQuickPrice(parseFloat(e.target.value) || 0)}
                                            placeholder="أدخل سعر البيع الجديد..."
                                            className="w-full h-10 bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 text-xs font-black outline-none focus:ring-2 focus:ring-amber-500/20"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">
                                            د.ل
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isUpdatingPrice || quickPrice <= 0 || quickPrice === selectedItemForRecipe?.price}
                                        onClick={() => handleUpdateItemPrice(quickPrice)}
                                        className="h-10 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {isUpdatingPrice ? 'جاري الحفظ...' : 'اعتماد وتحديث سعر الوجبة'}
                                    </button>
                                </div>
                            </div>

                            {/* Add Ingredient Form */}
                            <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">إضافة مكون للوصفة</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-1">
                                        <select
                                            value={newRecipeData.ingredient_id}
                                            onChange={(e) => setNewRecipeData({ ...newRecipeData, ingredient_id: parseInt(e.target.value) })}
                                            className="w-full h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none"
                                        >
                                            {availableIngredients.map(ing => (
                                                <option key={ing.id} value={ing.id}>
                                                    {ing.name} ({ing.unit} - {ing.cost_per_unit} د.ل)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            step="0.001"
                                            placeholder="الكمية المطلوبة"
                                            value={newRecipeData.quantity_needed || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setNewRecipeData({ ...newRecipeData, quantity_needed: isNaN(val) ? 0 : val });
                                            }}
                                            className="w-full h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddIngredientToRecipe}
                                        className="h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-amber-600/10 active:scale-95 transition-all"
                                    >
                                        إضافة
                                    </button>
                                </div>
                            </div>

                            {/* Current Recipe Ingredients */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between mr-1">
                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">المكونات وتكاليفها الجزئية ({recipeIngredients.length})</h3>
                                    <span className="text-[10px] text-gray-400 font-bold">تُخصم تلقائياً من المخزون عند الطلب</span>
                                </div>
                                {recipeIngredients.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic text-center py-6 bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                                        لا توجد مكونات معرفة لهذه الوصفة بعد. أضف المواد الخام لحساب تكلفة التحضير بدقة.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {recipeIngredients.map(ri => {
                                            const subCost = (ri.ingredient?.cost_per_unit || 0) * (ri.quantity_needed || 0);
                                            return (
                                                <div key={ri.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl group transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-amber-50 dark:bg-amber-950/20 rounded-lg flex items-center justify-center border border-amber-200/40 dark:border-amber-900/30">
                                                            <ChefHat className="w-4 h-4 text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900 dark:text-gray-200 leading-none mb-1.5">{ri.ingredient?.name}</p>
                                                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-gray-500">
                                                                <span>الكمية: <b className="text-gray-900 dark:text-white">{ri.quantity_needed} {ri.ingredient?.unit}</b></span>
                                                                <span className="text-gray-300">•</span>
                                                                <span>سعر الوحدة: {ri.ingredient?.cost_per_unit || 0} د.ل</span>
                                                                <span className="text-gray-300">•</span>
                                                                <span className="text-amber-600 font-black">التكلفة: {subCost.toFixed(2)} د.ل</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveIngredientFromRecipe(ri.id)}
                                                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                                                        title="إزالة المكون من الوصفة"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
