'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components';
import {
    CookingPot,
    Search,
    Plus,
    Trash2,
    Save,
    ChevronDown,
    Package,
    CheckCircle2,
    Utensils,
    ChefHat,
    Layers
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import { menuService, MenuItem, isLiquidOrDrink } from '@/services/menuService';
import { inventoryService, Ingredient, RecipeIngredient } from '@/services/inventoryService';
import { getFullUrl } from '@/lib/api';

export default function RecipesPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn } = useAuthStore();
    const router = useRouter();

    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Data lists
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [allRecipes, setAllRecipes] = useState<RecipeIngredient[]>([]);

    // Selected item for active recipe editing
    const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
    const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
    const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

    // Form for adding ingredient to recipe
    const [newIngredientId, setNewIngredientId] = useState<number>(0);
    const [newQuantity, setNewQuantity] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search query
    const [searchQuery, setSearchQuery] = useState('');

    // Quick Price update state
    const [quickPrice, setQuickPrice] = useState<number>(0);
    const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        } else {
            fetchInitialData();
        }
    }, [isLoggedIn, router]);

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            const [items, ings, recipes] = await Promise.all([
                menuService.getMenuItems(),
                inventoryService.getIngredients(),
                inventoryService.getAllRecipes().catch(() => [])
            ]);
            setMenuItems(items);
            setIngredients(ings);
            setAllRecipes(recipes);

            if (ings.length > 0) {
                setNewIngredientId(ings[0].id);
            }

            // Auto-select first food item if available (excluding drinks/liquids)
            const foodOnly = items.filter(item => !isLiquidOrDrink(item));
            if (foodOnly.length > 0) {
                selectMenuItem(foodOnly[0]);
            }
        } catch (err) {
            console.error('Failed to load recipes data', err);
        } finally {
            setIsLoading(false);
        }
    };

    const selectMenuItem = async (item: MenuItem) => {
        setSelectedMenuItem(item);
        setQuickPrice(item.price || 0);
        try {
            setIsLoadingRecipe(true);
            const recipe = await inventoryService.getRecipeForItem(item.id);
            setRecipeIngredients(recipe);
        } catch (err) {
            console.error('Failed to load item recipe', err);
        } finally {
            setIsLoadingRecipe(false);
        }
    };

    const handleUpdateItemPrice = async (newPriceVal: number) => {
        if (!selectedMenuItem || isNaN(newPriceVal) || newPriceVal <= 0) return;
        try {
            setIsUpdatingPrice(true);
            const updated = await menuService.updateMenuItem(selectedMenuItem.id, {
                ...selectedMenuItem,
                price: newPriceVal,
                category_id: (selectedMenuItem.category as any)?.id
            });
            setSelectedMenuItem(updated);
            setQuickPrice(updated.price);
            setMenuItems(prev => prev.map(m => m.id === updated.id ? updated : m));
        } catch (err) {
            console.error('Failed to update price', err);
        } finally {
            setIsUpdatingPrice(false);
        }
    };

    const handleAddIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMenuItem || !newIngredientId || !newQuantity || parseFloat(newQuantity) <= 0) return;

        try {
            setIsSubmitting(true);
            await inventoryService.addIngredientToRecipe(selectedMenuItem.id, {
                ingredient_id: newIngredientId,
                quantity_needed: parseFloat(newQuantity)
            });

            // Reload recipes for this item
            const updated = await inventoryService.getRecipeForItem(selectedMenuItem.id);
            setRecipeIngredients(updated);

            // Update allRecipes cache
            const all = await inventoryService.getAllRecipes().catch(() => []);
            setAllRecipes(all);

            setNewQuantity('');
        } catch (err: any) {
            console.error('Failed to add ingredient to recipe', err);
            alert(err?.response?.data?.message || 'حدث خطأ أثناء إضافة المكون إلى الوصفة.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveIngredient = async (id: number) => {
        if (!confirm('هل تريد بالتأكيد إزالة هذا المكون من وصفة الوجبة؟')) return;
        try {
            await inventoryService.removeIngredientFromRecipe(id);
            if (selectedMenuItem) {
                const updated = await inventoryService.getRecipeForItem(selectedMenuItem.id);
                setRecipeIngredients(updated);
                const all = await inventoryService.getAllRecipes().catch(() => []);
                setAllRecipes(all);
            }
        } catch (err) {
            console.error('Failed to remove ingredient', err);
        }
    };

    // Cost calculations
    const calculateTotalCost = () => {
        return recipeIngredients.reduce((sum, item) => {
            const cost = (item.ingredient?.cost_per_unit || 0) * (item.quantity_needed || 0);
            return sum + cost;
        }, 0);
    };

    const totalCost = calculateTotalCost();
    const sellingPrice = selectedMenuItem?.price || 0;
    const profitMargin = sellingPrice > 0 ? sellingPrice - totalCost : 0;
    const profitPercentage = sellingPrice > 0 ? ((profitMargin / sellingPrice) * 100).toFixed(1) : '0';

    // Filtered menu items - strictly exclude any liquids/drinks (water, cold/hot drinks)
    const foodMenuItems = menuItems.filter(item => !isLiquidOrDrink(item));

    const filteredMenuItems = foodMenuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Check which items have recipes
    const itemHasRecipe = (itemId: number) => {
        return allRecipes.some(r => r.menu_item?.id === itemId);
    };

    if (!isClient || !isLoggedIn) return null;

    return (
        <div className="flex bg-background dark:bg-background min-h-screen transition-colors duration-300" dir="rtl">
            <Sidebar />

            <main className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-4 md:p-8 transition-all duration-300`}>
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10 border border-amber-500/20">
                            <CookingPot className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">
                                تحضير وصفات الطعام
                            </h1>
                            <p className="text-gray-400 dark:text-gray-500 text-xs md:text-sm font-bold opacity-80">
                                ربط مكونات المخزون بالوجبات وحساب تكلفة التحضير وهامش الربح
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push('/menu')}
                        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl font-black text-xs transition-all self-start md:self-auto"
                    >
                        <Utensils className="w-4 h-4 text-violet-500" />
                        إدارة قائمة الطعام
                    </button>
                </header>

                {/* Main Content: Two Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Menu Items Selection List (4 cols) */}
                    <div className="lg:col-span-4 bg-card dark:bg-card rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-180px)]">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800/40 bg-gray-50/50 dark:bg-gray-900/30">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-amber-500" />
                                    اختر وجبة للتحضير
                                </span>
                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/30 px-2 py-0.5 rounded-md">
                                    {foodMenuItems.length} وجبة طعام
                                </span>
                            </div>
                            <div className="mb-2 p-2 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/40 dark:border-amber-800/20 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
                                <span>🍽️</span>
                                <span>أطباق الطعام فقط (المياه والمشروبات الجاهزة مستبعدة تلقائياً).</span>
                            </div>
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="بحث في وجبات الطعام..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pr-9 pl-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                />
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/30 p-2">
                            {isLoading ? (
                                <div className="p-8 text-center text-gray-400 text-xs font-bold">جاري تحميل الأصناف...</div>
                            ) : filteredMenuItems.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-xs font-bold">
                                    {menuItems.length === 0 ? (
                                        <div className="space-y-3">
                                            <p>لا توجد وجبات في قائمة الطعام بعد.</p>
                                            <button
                                                onClick={() => router.push('/menu')}
                                                className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg text-xs font-black"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                إضافة وجبة أولاً
                                            </button>
                                        </div>
                                    ) : 'لا توجد نتائج مطابقة للبحث.'}
                                </div>
                            ) : (
                                filteredMenuItems.map((item) => {
                                    const isSelected = selectedMenuItem?.id === item.id;
                                    const hasRecipe = itemHasRecipe(item.id);

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => selectMenuItem(item)}
                                            className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                                isSelected
                                                    ? 'bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 shadow-xs'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/30 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                                                    {item.image_url ? (
                                                        <img src={getFullUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Utensils className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-xs font-black truncate ${isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-gray-200'}`}>
                                                        {item.name}
                                                    </p>
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        {item.category?.name || 'عام'} • {item.price} د.ل
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="shrink-0">
                                                {hasRecipe ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200 dark:border-emerald-800/40">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        لها وصفة
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-400">
                                                        بدون وصفة
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Column: Recipe Details & Ingredients Configurator (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        {selectedMenuItem ? (
                            <>
                                {/* Item Overview & Profitability Card */}
                                <div className="bg-card dark:bg-card rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-sm p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800/40">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                                {selectedMenuItem.image_url ? (
                                                    <img src={getFullUrl(selectedMenuItem.image_url)} alt={selectedMenuItem.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Utensils className="w-6 h-6 text-gray-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                                                        {selectedMenuItem.name}
                                                    </h2>
                                                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 border border-violet-100 dark:border-violet-900/30">
                                                        {selectedMenuItem.category?.name || 'عام'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 font-bold mt-1">
                                                    {selectedMenuItem.description || 'لا يوجد وصف للصنف'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Financial Badges - 4 Comparison Cards */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                            <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-3 rounded-xl text-center min-w-[90px]">
                                                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 block mb-0.5">تكلفة التحضير</span>
                                                <span className="text-sm md:text-base font-black text-amber-600 tabular-nums">
                                                    {totalCost.toFixed(2)} <span className="text-[9px]">د.ل</span>
                                                </span>
                                            </div>
                                            <div className="bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30 p-3 rounded-xl text-center min-w-[90px]">
                                                <span className="text-[10px] font-black text-violet-700 dark:text-violet-400 block mb-0.5">سعر البيع الحالي</span>
                                                <span className="text-sm md:text-base font-black text-violet-600 tabular-nums">
                                                    {sellingPrice.toFixed(2)} <span className="text-[9px]">د.ل</span>
                                                </span>
                                            </div>
                                            <div className={`p-3 rounded-xl text-center border min-w-[90px] ${
                                                profitMargin > 0
                                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/50 text-emerald-700 dark:text-emerald-400'
                                                    : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/50 text-amber-700 dark:text-amber-400'
                                            }`}>
                                                <span className="text-[10px] font-black block mb-0.5">صافي الربح</span>
                                                {profitMargin > 0 ? (
                                                    <span className="text-sm md:text-base font-black text-emerald-600 tabular-nums">
                                                        {profitMargin.toFixed(2)} <span className="text-[9px]">د.ل</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                                                        يحتاج لتسعير
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`p-3 rounded-xl text-center border min-w-[90px] ${
                                                parseFloat(profitPercentage) > 30
                                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/50 text-emerald-700 dark:text-emerald-300'
                                                    : parseFloat(profitPercentage) > 0
                                                    ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/50 text-amber-700 dark:text-amber-300'
                                                    : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/50 text-rose-700 dark:text-rose-300'
                                            }`}>
                                                <span className="text-[10px] font-black block mb-0.5">هامش الربح</span>
                                                <span className="text-sm md:text-base font-black tabular-nums">
                                                    {parseFloat(profitPercentage) > 0 ? `${profitPercentage}%` : '0.0%'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Direct Meal Price Setting & Margin Calculator */}
                                    <div className="my-4 bg-gradient-to-r from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                                    <span>🎯</span> تحديد سعر بيع الوجبة بناءً على التكلفة
                                                </h4>
                                                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                                    التكلفة المحسوبة: {totalCost.toFixed(2)} د.ل — يمكنك اختيار هامش ربح وتحديث سعر الوجبة فوراً:
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {[
                                                    { label: '+30% ربح', pct: 1.3 },
                                                    { label: '+40% ربح', pct: 1.4 },
                                                    { label: '+50% ربح', pct: 1.5 },
                                                    { label: '+70% ربح', pct: 1.7 },
                                                ].map((preset) => {
                                                    const suggested = totalCost > 0 ? Math.ceil(totalCost * preset.pct) : 0;
                                                    return (
                                                        <button
                                                            key={preset.label}
                                                            type="button"
                                                            disabled={totalCost <= 0}
                                                            onClick={() => setQuickPrice(suggested)}
                                                            className="px-2.5 py-1 text-[10px] font-black bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-lg hover:bg-amber-100/50 transition-all disabled:opacity-40"
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
                                                disabled={isUpdatingPrice || quickPrice <= 0 || quickPrice === selectedMenuItem?.price}
                                                onClick={() => handleUpdateItemPrice(quickPrice)}
                                                className="h-10 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                                {isUpdatingPrice ? 'جاري الحفظ...' : 'اعتماد وتحديث سعر الوجبة'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Add Ingredient Form */}
                                    <form onSubmit={handleAddIngredient} className="pt-6">
                                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Plus className="w-4 h-4 text-amber-500" />
                                            إضافة مادة خام من المخزون إلى الوصفة
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                            <div className="md:col-span-6 relative">
                                                <label className="text-[10px] font-black text-gray-400 block mb-1">اختر المادة الخام</label>
                                                <div className="relative">
                                                    <select
                                                        value={newIngredientId}
                                                        onChange={(e) => setNewIngredientId(parseInt(e.target.value))}
                                                        className="w-full h-11 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer"
                                                        required
                                                    >
                                                        {ingredients.map(ing => (
                                                            <option key={ing.id} value={ing.id}>
                                                                {ing.name} (المتوفر: {ing.current_stock} {ing.unit} | سعر الوحدة: {ing.cost_per_unit} د.ل)
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>

                                            <div className="md:col-span-4">
                                                <label className="text-[10px] font-black text-gray-400 block mb-1">
                                                    الكمية المطلوبة ({ingredients.find(i => i.id === newIngredientId)?.unit || ''})
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    placeholder="مثال: 0.25"
                                                    value={newQuantity}
                                                    onChange={(e) => setNewQuantity(e.target.value)}
                                                    className="w-full h-11 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                                                    required
                                                />
                                            </div>

                                            <div className="md:col-span-2 flex items-end">
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting || ingredients.length === 0}
                                                    className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    {isSubmitting ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Plus className="w-4 h-4" />
                                                            إضافة
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>

                                {/* Ingredients Table for Active Recipe */}
                                <div className="bg-card dark:bg-card rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-sm overflow-hidden">
                                    <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800/40 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ChefHat className="w-5 h-5 text-amber-500" />
                                            <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                                المكونات المستخدمة في تحضير الوجبة ({recipeIngredients.length})
                                            </h3>
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-400">
                                            تُخصم هذه المقادير تلقائياً من المخزون عند تسجيل طلب
                                        </span>
                                    </div>

                                    {isLoadingRecipe ? (
                                        <div className="p-12 text-center text-gray-400 font-bold text-xs">
                                            جاري تحميل مكونات الوصفة...
                                        </div>
                                    ) : recipeIngredients.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <CookingPot className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                لم يتم تحديد وصفة لهذه الوجبة بعد.
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                اختر المواد الخام والكميات من النموذج أعلاه لإعداد وصفة التحضير.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-right" dir="rtl">
                                                <thead>
                                                    <tr className="bg-gray-50/50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800/40 text-[11px] font-black text-gray-400 uppercase">
                                                        <th className="px-6 py-3.5">المكون / المادة الخام</th>
                                                        <th className="px-6 py-3.5">الكمية المطلوبة للوجبة</th>
                                                        <th className="px-6 py-3.5">تكلفة الوحدة</th>
                                                        <th className="px-6 py-3.5">التكلفة الجزئية</th>
                                                        <th className="px-6 py-3.5 text-center">إجراءات</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30 text-xs">
                                                    {recipeIngredients.map((item) => {
                                                        const itemCost = (item.ingredient?.cost_per_unit || 0) * item.quantity_needed;
                                                        return (
                                                            <tr key={item.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/20 transition-colors">
                                                                <td className="px-6 py-4 font-black text-gray-900 dark:text-gray-100 flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center text-amber-600">
                                                                        <Package className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <span>{item.ingredient?.name}</span>
                                                                        <span className="block text-[10px] font-bold text-gray-400">
                                                                            رصيد المخزن الحالي: {item.ingredient?.current_stock} {item.ingredient?.unit}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 font-black text-gray-800 dark:text-gray-200">
                                                                    <span className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                                                                        {item.quantity_needed} {item.ingredient?.unit}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400">
                                                                    {item.ingredient?.cost_per_unit || 0} د.ل / {item.ingredient?.unit}
                                                                </td>
                                                                <td className="px-6 py-4 font-black text-amber-600">
                                                                    {itemCost.toFixed(3)} د.ل
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <button
                                                                        onClick={() => handleRemoveIngredient(item.id)}
                                                                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                                                                        title="إزالة المكون من الوصفة"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-amber-500/5 dark:bg-amber-500/10 font-black text-xs border-t border-amber-500/20">
                                                        <td colSpan={3} className="px-6 py-4 text-gray-900 dark:text-white">
                                                            إجمالي تكلفة تحضير الوجبة:
                                                        </td>
                                                        <td colSpan={2} className="px-6 py-4 text-amber-600 text-sm">
                                                            {totalCost.toFixed(2)} د.ل
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="bg-card dark:bg-card rounded-2xl border border-gray-100 dark:border-gray-800/40 p-16 text-center shadow-sm">
                                <CookingPot className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <h3 className="text-base font-black text-gray-700 dark:text-gray-200 mb-1">
                                    الرجاء اختيار وجبة من القائمة على اليمين
                                </h3>
                                <p className="text-xs text-gray-400 font-bold max-w-sm mx-auto">
                                    يمكنك اختيار أي وجبة لتعديل وصفة تحضيرها وربطها بمكونات المخزون.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
