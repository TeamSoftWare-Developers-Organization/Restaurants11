'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Sidebar, Modal, ShiftModal, ExpenseModal, ThermalReceipt80mm, RestoLogo } from '@/components';
import AIRecommendations from '@/components/pos/AIRecommendations';
import AIDynamicPromotionsWidget from '@/components/pos/AIDynamicPromotionsWidget';
import { useSettingsStore } from '@/store/settingsStore';
import {
    ShoppingBag,
    Search,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Banknote,
    Receipt,
    Utensils,
    CheckCircle,
    AlertCircle,
    Clock,
    PauseCircle,
    ChevronDown,
    FileText,
    X,
    Grid,
    Layers,
    ArrowRight,
    Barcode,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';
import { menuService, MenuItem, Category } from '@/services/menuService';
import { orderService, Order } from '@/services/orderService';
import { paymentService } from '@/services/paymentService';
import { reservationService, Table } from '@/services/reservationService';
import { treasuryService } from '@/services/treasuryService';
import { getFullUrl } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';

export default function POSPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn } = useAuthStore();
    const { items, addItem, removeItem, updateQuantity, updateItemNotes, clearCart, setCartItems, getTotals } = useCartStore();
    const router = useRouter();
    const isOrderLoadedManually = useRef(false);

    const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [barcodeQuery, setBarcodeQuery] = useState('');
    const [barcodeFlash, setBarcodeFlash] = useState(false);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const [isClient, setIsClient] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const { settings, fetchSettings } = useSettingsStore();
    const [showThermalReceipt, setShowThermalReceipt] = useState(false);
    const [thermalOrder, setThermalOrder] = useState<any>(null);
    const [lastOrder, setLastOrder] = useState<any>(null);
    const [invoiceIssued, setInvoiceIssued] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'warning' | 'error' | 'success' | 'info';
    }>({
        isOpen: false,
        title: 'تنبيه',
        message: '',
        type: 'warning'
    });

    const showAlert = (message: string, title = 'تنبيه', type: 'warning' | 'error' | 'success' | 'info' = 'warning') => {
        setAlertModal({ isOpen: true, title, message, type });
    };
    const [tables, setTables] = useState<Table[]>([]);
    const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('takeaway');
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [shiftMode, setShiftMode] = useState<'open' | 'close'>('open');
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [showActiveOrdersModal, setShowActiveOrdersModal] = useState(false);

    const [showCardModal, setShowCardModal] = useState(false);
    const [selectedCardProvider, setSelectedCardProvider] = useState<string>('تداول');
    const [customCardProvider, setCustomCardProvider] = useState('');
    const [cardTransactionId, setCardTransactionId] = useState('');

    const [showDebtModal, setShowDebtModal] = useState(false);
    const [debtCustomerName, setDebtCustomerName] = useState('');
    const [debtNotes, setDebtNotes] = useState('');
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
    const [isProcessingHold, setIsProcessingHold] = useState(false);
    const [editingNoteItemId, setEditingNoteItemId] = useState<number | null>(null);
    const [tempNoteText, setTempNoteText] = useState('');

    // حالة للتبديل بين القائمة والسلة على الأجهزة الصغيرة (Responsive Mobile Tabs)
    const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

    // حالة توسيع عرض السلة على شاشات سطح المكتب
    const [isCartExpanded, setIsCartExpanded] = useState<boolean>(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('pos_cart_expanded');
            if (saved === 'true') {
                setIsCartExpanded(true);
            }
        } catch {
            // ignore
        }
    }, []);

    const toggleCartExpand = () => {
        setIsCartExpanded(prev => {
            const next = !prev;
            try {
                localStorage.setItem('pos_cart_expanded', String(next));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const { activeShift, setActiveShift, user } = useAuthStore();
    const currentCashierName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'الكاشير';
    const { subtotal, total } = getTotals();

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        } else {
            fetchData();
            checkCurrentShift();
            fetchSettings();
        }
    }, [isLoggedIn, router]);

    const isAnyModalOpen =
        showSuccessModal ||
        showWarningModal ||
        alertModal.isOpen ||
        showShiftModal ||
        showExpenseModal ||
        showActiveOrdersModal ||
        showCardModal ||
        showDebtModal ||
        showThermalReceipt ||
        editingNoteItemId !== null;

    // دالة ضمان بقاء حقل الباركود نشطاً دوماً دون سحب التركيز من الحقول النصية الأخرى
    const focusBarcodeInput = () => {
        if (isAnyModalOpen) return;
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT') && active !== barcodeInputRef.current) {
            return;
        }
        if (barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    };

    useEffect(() => {
        // تركيز أولي عند التحميل
        const timer = setTimeout(focusBarcodeInput, 120);

        // مراقبة النقر في أي مكان بالشاشة لإعادة التركيز التلقائي للباركود
        const handleGlobalClick = (e: MouseEvent) => {
            if (isAnyModalOpen) return;
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                if (target !== barcodeInputRef.current) return;
            }
            setTimeout(focusBarcodeInput, 40);
        };

        // اعتراض ضربات المفاتيح واختصارات الدفع السريعة
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (isAnyModalOpen) return;

            // اختصارات لوحة المفاتيح السريعة لطرق الدفع
            if (e.key === 'F1') {
                e.preventDefault();
                handleCheckout('cash');
                return;
            }
            if (e.key === 'F2') {
                e.preventDefault();
                if (items.length > 0 || currentOrder) {
                    setShowCardModal(true);
                } else {
                    showAlert('يرجى إضافة أصناف إلى السلة أولاً قبل اختيار طريقة الدفع.', 'السلة فارغة', 'warning');
                }
                return;
            }
            if (e.key === 'F3') {
                e.preventDefault();
                if (items.length > 0 || currentOrder) {
                    setShowDebtModal(true);
                } else {
                    showAlert('يرجى إضافة أصناف إلى السلة أولاً قبل اختيار طريقة الدفع.', 'السلة فارغة', 'warning');
                }
                return;
            }
            if (e.key === 'F4') {
                e.preventDefault();
                if (items.length > 0) {
                    handleHoldOrder();
                }
                return;
            }

            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                if (target !== barcodeInputRef.current) return;
            }

            // توجيه مدخلات الماسح الضوئي لحقل الباركود
            if (barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
                barcodeInputRef.current.focus();
            }
        };

        window.addEventListener('click', handleGlobalClick);
        window.addEventListener('keydown', handleGlobalKeyDown);

        // نبض دوري للتأكد من جهوزية حقل الباركود باستمرار
        const interval = setInterval(focusBarcodeInput, 700);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            window.removeEventListener('click', handleGlobalClick);
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [isAnyModalOpen, items, currentOrder]);

    useEffect(() => {
        focusBarcodeInput();
    }, [items]);

    const checkCurrentShift = async () => {
        try {
            const shift = await treasuryService.getCurrentShift();
            setActiveShift(shift);
            if (!shift) {
                setShiftMode('open');
                setShowShiftModal(true);
            }
        } catch (err) {
            console.error('Failed to check shift', err);
        }
    };

    useEffect(() => {
        if (isOrderLoadedManually.current) {
            isOrderLoadedManually.current = false;
            return;
        }
        setInvoiceIssued(false);
        setCurrentOrder(null);
    }, [items]);

    const fetchActiveOrders = async () => {
        try {
            const allOrders = await orderService.getOrders();
            const pending = allOrders.filter(o => 
                (o.status === 'pending' || o.status === 'preparing') && 
                (!o.payments || o.payments.length === 0)
            );
            setActiveOrders(pending);
        } catch (err) {
            console.error('Failed to fetch active orders', err);
        }
    };

    const loadOrderIntoPOS = (order: Order) => {
        isOrderLoadedManually.current = true;
        clearCart();
        const validItems = (order.items || []).filter(it => (it.menu_item && it.menu_item.id) || (it as any).menu_item_id);
        const mapped = validItems.map(it => {
            const itemId = it.menu_item ? it.menu_item.id : (it as any).menu_item_id;
            const menuItem = menuItems.find(m => m.id === itemId);
            return {
                id: itemId,
                name: it.menu_item ? it.menu_item.name : (menuItem?.name || 'صنف'),
                price: Number(it.unit_price),
                quantity: it.quantity,
                image_url: menuItem?.image_url || (it.menu_item as any)?.image_url,
                category: menuItem?.category?.name || (it.menu_item as any)?.category?.name,
                notes: it.notes || ''
            };
        });
        setCartItems(mapped);
        setCurrentOrder(order);
        setLastOrder(order);
        setInvoiceIssued(true);
        if (order.table_number && order.table_number.includes('طاولة')) {
            setOrderType('dine_in');
        } else {
            setOrderType('takeaway');
        }
        setMobileTab('cart'); // الانتقال التلقائي للسلة عند تحميل طلب
    };

    const fetchData = async () => {
        try {
            const [itemsData, categoriesData, tablesData] = await Promise.all([
                menuService.getMenuItems(),
                menuService.getCategories(),
                reservationService.getTables()
            ]);
            setMenuItems(itemsData);
            setCategories(categoriesData);
            setTables(tablesData);
            fetchActiveOrders();
        } catch (err) {
            console.error('Failed to fetch POS data', err);
        }
    };

    const processBarcode = async (code: string) => {
        const cleanCode = code.trim();
        if (!cleanCode) return;

        let matchedItem = menuItems.find(item => {
            const itemBarcode = (item as any).barcode ? String((item as any).barcode).trim() : '';
            const itemSku = (item as any).sku ? String((item as any).sku).trim() : '';
            const itemCode = (item as any).code ? String((item as any).code).trim() : '';
            const itemId = String(item.id).trim();

            return (
                (itemBarcode && itemBarcode === cleanCode) ||
                (itemSku && itemSku === cleanCode) ||
                (itemCode && itemCode === cleanCode) ||
                itemId === cleanCode
            );
        });

        if (!matchedItem) {
            try {
                const freshItems = await menuService.getMenuItems();
                setMenuItems(freshItems);
                matchedItem = freshItems.find(item => {
                    const itemBarcode = (item as any).barcode ? String((item as any).barcode).trim() : '';
                    const itemSku = (item as any).sku ? String((item as any).sku).trim() : '';
                    const itemCode = (item as any).code ? String((item as any).code).trim() : '';
                    const itemId = String(item.id).trim();

                    return (
                        (itemBarcode && itemBarcode === cleanCode) ||
                        (itemSku && itemSku === cleanCode) ||
                        (itemCode && itemCode === cleanCode) ||
                        itemId === cleanCode
                    );
                });
            } catch (err) {
                console.error("Error refreshing menu items for barcode:", err);
            }
        }

        if (matchedItem) {
            addItem({
                id: matchedItem.id,
                name: matchedItem.name,
                price: matchedItem.price,
                image_url: matchedItem.image_url,
                category: matchedItem.category?.name
            });
            setBarcodeQuery('');
            setBarcodeFlash(true);
            setTimeout(() => setBarcodeFlash(false), 700);
        } else {
            showAlert(`لم يتم العثور على صنف برمز الباركود: ${cleanCode}`, 'الباركود غير موجود', 'warning');
            setBarcodeQuery('');
        }
        
        setTimeout(() => {
            if (barcodeInputRef.current) {
                barcodeInputRef.current.focus();
                barcodeInputRef.current.select();
            }
        }, 50);
    };

    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processBarcode(barcodeQuery);
    };

    if (!isClient || !isLoggedIn) return null;

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategoryName === 'الكل' || !selectedCategoryName || item.category?.name === selectedCategoryName;
        const matchesSearch = item.name.includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="flex flex-col lg:flex-row bg-gray-50/50 dark:bg-[#0b0f19] min-h-screen transition-colors duration-300 min-w-0 w-full" dir="rtl">
            <Sidebar className="no-print" />

            <main className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen flex flex-col xl:flex-row gap-5 p-4 md:p-6 transition-all duration-300 min-w-0 w-full`}>
                
                {/* شريط التبديل العلوي للشاشات الصغيرة (Responsive Mobile Tabs) */}
                <div className="xl:hidden flex items-center bg-white dark:bg-[#111827] p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm sticky top-3 z-20">
                    <button
                        onClick={() => setMobileTab('menu')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                            mobileTab === 'menu'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Utensils className="w-4 h-4" />
                        <span>قائمة المنتجات والأصناف</span>
                    </button>
                    <button
                        onClick={() => setMobileTab('cart')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 relative ${
                            mobileTab === 'cart'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span>سلة المبيعات</span>
                        {items.length > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {items.reduce((sum, it) => sum + it.quantity, 0)}
                            </span>
                        )}
                    </button>
                </div>

                {/* قسم المنتجات والأقسام (يظهر حسب التبويب في الموبايل ودائماً في الشاشات الكبيرة) */}
                <section className={`flex-1 min-w-0 space-y-4 ${mobileTab === 'cart' ? 'hidden xl:flex xl:flex-col' : 'flex flex-col'}`}>
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/60">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-indigo-500/30 overflow-hidden shadow-md flex items-center justify-center p-0.5 shrink-0 transition-colors">
                                <RestoLogo className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-base md:text-lg font-black text-gray-900 dark:text-white leading-tight">
                                        RestoSystem POS
                                    </h1>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                        نظام رستو تك
                                    </span>
                                </div>
                                <p className="text-gray-400 dark:text-gray-400 text-[11px] font-semibold">
                                    شاشة الكاشير والمبيعات المباشرة
                                </p>
                            </div>
                        </div>

                        {/* TechTwo Dev Tag */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700/50">
                            <img src="/branding/techtwo-logo.png" alt="TechTwo" className="w-4 h-4 object-contain" />
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                تطوير: <strong className="text-indigo-600 dark:text-indigo-400 font-black">TechTwo (تك تو)</strong>
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    fetchActiveOrders();
                                    setShowActiveOrdersModal(true);
                                }}
                                className="relative flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 hover:border-emerald-500 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-all shadow-sm group active:scale-95 w-full sm:w-auto justify-center"
                            >
                                <Clock className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                                <span>الطلبيات النشطة والمعلقة</span>
                                {activeOrders.length > 0 && (
                                    <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                                        {activeOrders.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </header>

                    {/* شريط البحث الممتد بعرض كامل عن الأصناف */}
                    <div className="relative group shadow-sm w-full">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 group-focus-within:scale-110 transition-transform pointer-events-none" />
                        <input
                            type="text"
                            placeholder="ابحث عن اسم الوجبة أو الصنف هنا..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 bg-white dark:bg-[#111827] border-2 border-gray-100 dark:border-gray-800/80 hover:border-emerald-500/50 focus:border-emerald-600 rounded-2xl pr-12 pl-4 text-xs sm:text-sm font-bold transition-all outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400 shadow-xs"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors"
                                title="مسح البحث"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* ويدجت عروض وتسعير الساعات الهادئة الذكي (AI Dynamic Promotions) */}
                    <AIDynamicPromotionsWidget compact={true} className="mb-1" />

                    {!selectedCategoryName ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>اختر القسم لعرض المنتجات</span>
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5">
                                <div
                                    onClick={() => setSelectedCategoryName('الكل')}
                                    className="cursor-pointer bg-white dark:bg-[#111827] rounded-none p-5 sm:p-6 border-2 border-gray-100 dark:border-gray-800/80 hover:border-emerald-500 hover:shadow-xl transition-all flex flex-col items-center justify-center text-center gap-3 group active:scale-95 shadow-sm"
                                >
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-none bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                                        <Grid className="w-7 h-7 sm:w-8 sm:h-8" />
                                    </div>
                                    <span className="text-sm sm:text-base font-black text-gray-800 dark:text-gray-100">جميع الأصناف (الكل)</span>
                                </div>

                                {categories.map((cat) => {
                                    const categoryImage = (cat as any)?.image_url;

                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => setSelectedCategoryName(cat.name)}
                                            className="cursor-pointer bg-white dark:bg-[#111827] rounded-none p-5 sm:p-6 border-2 border-gray-100 dark:border-gray-800/80 hover:border-emerald-500 hover:shadow-xl transition-all flex flex-col items-center justify-center text-center gap-3 group active:scale-95 shadow-sm overflow-hidden"
                                        >
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-none bg-gray-50 dark:bg-gray-800 text-emerald-600 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform shadow-xs">
                                                {categoryImage ? (
                                                    <img src={getFullUrl(categoryImage)} alt={cat.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Utensils className="w-7 h-7 sm:w-8 sm:h-8" />
                                                )}
                                            </div>
                                            <span className="text-sm sm:text-base font-black text-gray-800 dark:text-gray-100 truncate w-full">{cat.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* شبكة مربعات الأصناف الموسعة والواضحة */}
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-5">
                                {/* بطاقة الرجوع للأقسام الرئيسية */}
                                <div
                                    onClick={() => setSelectedCategoryName(null)}
                                    className="bg-emerald-50/90 dark:bg-emerald-950/30 rounded-none shadow-sm border-2 border-dashed border-emerald-500/60 hover:border-emerald-600 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/50 transition-all group cursor-pointer active:scale-95 overflow-hidden flex flex-col items-center justify-center p-5 text-center min-h-[220px] sm:min-h-[250px]"
                                >
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-none bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-md shadow-emerald-600/30">
                                        <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7" />
                                    </div>
                                    <h3 className="text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-200 mb-1">الخروج للأقسام</h3>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">العودة لكافة التصنيفات</p>
                                </div>

                                {/* بطاقات الأصناف الموسعة */}
                                {filteredItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white dark:bg-[#111827] rounded-none shadow-sm border-2 border-gray-100 dark:border-gray-800/80 hover:border-emerald-500 hover:shadow-xl transition-all duration-200 group cursor-pointer active:scale-98 overflow-hidden flex flex-col min-h-[220px] sm:min-h-[250px]"
                                        onClick={() => addItem({
                                            id: item.id,
                                            name: item.name,
                                            price: item.price,
                                            image_url: item.image_url,
                                            category: item.category?.name
                                        })}
                                    >
                                        {/* صورة الصنف الموسعة */}
                                        <div className="w-full h-36 sm:h-44 md:h-40 xl:h-44 bg-gray-50 dark:bg-gray-900 relative overflow-hidden shrink-0 flex items-center justify-center rounded-none">
                                            {item.image_url ? (
                                                <img
                                                    src={getFullUrl(item.image_url)}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        const fb = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                                                        if (fb) fb.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700 fallback-icon ${item.image_url ? 'hidden' : ''}`}>
                                                <Utensils className="w-10 h-10 sm:w-12 sm:h-12" />
                                            </div>
                                            {/* شارة السعر الكبيرة البارزة */}
                                            <div className="absolute top-3 left-3 bg-emerald-600/95 backdrop-blur-md px-3 py-1 rounded-none shadow-md flex items-center gap-1 border border-white/20">
                                                <span className="text-white font-black text-xs sm:text-sm tabular-nums">{item.price}</span>
                                                <span className="text-white/80 font-bold text-[10px]">د.ل</span>
                                            </div>
                                        </div>

                                        {/* تفاصيل الصنف وزر الإضافة السريعة */}
                                        <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
                                            <div>
                                                <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100 line-clamp-2 mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                                                    {item.name}
                                                </h3>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/60 mt-auto">
                                                <span className="text-gray-400 font-bold text-xs truncate max-w-[120px]">
                                                    {item.category?.name || 'عام'}
                                                </span>
                                                <div className="w-8 h-8 rounded-none bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-all shadow-xs">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* شريط الاقتراحات الذكية التكميلية (AI Market Basket Recommendations) */}
                    <div className="mt-4">
                        <AIRecommendations />
                    </div>
                </section>

                {/* قسم السلة الجانبي (يظهر حسب التبويب في الموبايل ودائماً في الشاشات الكبيرة) */}
                <section className={`w-full xl:w-[400px] 2xl:w-[420px] shrink-0 bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/60 flex flex-col h-[calc(100vh-7rem)] xl:h-[calc(100vh-3rem)] sticky top-3 xl:top-6 overflow-hidden ${mobileTab === 'menu' ? 'hidden xl:flex' : 'flex'}`}>
                    <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 dark:border-gray-800/60 flex justify-between items-center bg-gray-50/40 dark:bg-gray-800/30 shrink-0 gap-2">
                        {/* يمين الترويسة: أيقونة السلة وعنوان سلة المبيعات */}
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight truncate">
                                    سلة المبيعات
                                </h2>
                                <span className="text-[10px] font-bold text-gray-400 block truncate">
                                    {items.reduce((sum, it) => sum + it.quantity, 0)} أصناف مضافة
                                </span>
                            </div>
                        </div>

                        {/* يسار الترويسة: زر إغلاق الوردية الكبير للشاشات اللمسية + زر تفريغ السلة */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {items.length > 0 && (
                                <button
                                    onClick={clearCart}
                                    className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-200/50 dark:border-rose-900/40 transition-all cursor-pointer active:scale-95 touch-manipulation"
                                    title="تفريغ السلة بالكامل"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">تفريغ</span>
                                </button>
                            )}

                            {/* زر إغلاق الوردية البارز لأعلى السلة على اليسار لسهولة اللمس */}
                            <button
                                onClick={() => {
                                    setShiftMode('close');
                                    setShowShiftModal(true);
                                }}
                                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-700 dark:text-amber-300 border-2 border-amber-500/40 hover:border-amber-500/70 rounded-xl text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer active:scale-95 touch-manipulation"
                                title="إغلاق الوردية الحالية وتسليم الخزينة"
                            >
                                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>إغلاق الوردية</span>
                            </button>
                        </div>
                    </div>

                    {/* حقل الباركود المدمج داخل السلة - نشط دائماً وجاهز للمسح المباشر */}
                    <div className={`p-2.5 border-b transition-colors shrink-0 ${barcodeFlash ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/40' : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500/20'}`}>
                        <form onSubmit={handleBarcodeSubmit} className="relative group">
                            <Barcode className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 animate-pulse pointer-events-none" />
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                placeholder="امسح الباركود مباشرة (نشط دائماً)..."
                                value={barcodeQuery}
                                onChange={(e) => setBarcodeQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        processBarcode(barcodeQuery);
                                    }
                                }}
                                onBlur={() => {
                                    setTimeout(focusBarcodeInput, 40);
                                }}
                                className="w-full h-11 bg-white dark:bg-gray-900 border-2 border-emerald-500/50 hover:border-emerald-600 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 rounded-xl pr-11 pl-20 text-xs sm:text-sm font-bold transition-all outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 shadow-2xs"
                            />
                            {/* شارة النشاط الدائم للباركود */}
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black pointer-events-none shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                <span>نشط ⚡</span>
                            </div>
                        </form>
                    </div>

                    {/* منطقة الأصناف المضافة - مساحة ممتدة رأسياً بالكامل */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                        <div className="flex gap-1.5 bg-gray-50/70 dark:bg-gray-800/40 p-1 rounded-xl border border-gray-100 dark:border-gray-800/60 shrink-0">
                            <button
                                onClick={() => setOrderType('takeaway')}
                                className={`flex-1 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    orderType === 'takeaway'
                                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                        : 'text-gray-500 hover:text-emerald-600'
                                }`}
                            >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>سفري</span>
                            </button>
                            <button
                                onClick={() => setOrderType('dine_in')}
                                className={`flex-1 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    orderType === 'dine_in'
                                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                        : 'text-gray-500 hover:text-emerald-600'
                                }`}
                            >
                                <Utensils className="w-3.5 h-3.5" />
                                <span>محلي</span>
                            </button>
                        </div>

                        {orderType === 'dine_in' && (
                            <div className="space-y-1 bg-emerald-50/60 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-500/20 shrink-0">
                                <label className="text-[11px] font-black text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <Utensils className="w-3 h-3 text-emerald-600" />
                                        <span>اختر طاولة الصالة</span>
                                    </span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedTableId || ''}
                                        onChange={(e) => setSelectedTableId(parseInt(e.target.value))}
                                        className="w-full h-8.5 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800/60 rounded-lg pr-3 pl-8 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-emerald-600/30 shadow-sm appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>اختر الطاولة...</option>
                                        {tables.map(table => (
                                            <option key={table.id} value={table.id}>
                                                طاولة رقم {table.table_number} ({table.capacity} مقاعد)
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-center py-8 opacity-45">
                                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                                    <ShoppingBag className="text-gray-400 w-6 h-6" />
                                </div>
                                <p className="text-gray-700 dark:text-gray-200 font-black text-xs">السلة فارغة</p>
                                <p className="text-gray-400 font-bold text-[10px] mt-0.5">امسح بالباركود أو اضغط على الأصناف لإضافتها</p>
                            </div>
                        ) : (
                            items.map((item) => {
                                const isEditingNote = editingNoteItemId === item.id;
                                const itemTotal = (item.price * item.quantity).toFixed(2);
                                return (
                                    <div
                                        key={item.id}
                                        className="group bg-gray-50/70 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/70 hover:border-emerald-500/40 transition-all flex flex-col gap-2"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/50 flex items-center justify-center shadow-xs relative">
                                                {item.image_url ? (
                                                    <img
                                                        src={getFullUrl(item.image_url)}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            const fb = e.currentTarget.parentElement?.querySelector('.fallback-cart-icon');
                                                            if (fb) fb.classList.remove('hidden');
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={`fallback-cart-icon flex items-center justify-center ${item.image_url ? 'hidden' : ''}`}>
                                                    <Utensils className="w-5 h-5 text-emerald-600/70" />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between gap-1.5">
                                                    <h4 className="font-black text-xs text-gray-900 dark:text-gray-100 truncate" title={item.name}>
                                                        {item.name}
                                                    </h4>
                                                    <div className="text-left shrink-0">
                                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                            {itemTotal} <span className="text-[9px] font-bold">د.ل</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] text-gray-400 font-bold tabular-nums">
                                                        {item.price.toFixed(2)} د.ل للقطعة
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {item.notes && !isEditingNote && (
                                            <div className="flex items-center justify-between gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 rounded-lg px-2 py-1 text-[11px] text-amber-900 dark:text-amber-200">
                                                <div className="flex items-center gap-1 overflow-hidden">
                                                    <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                                                    <span className="font-bold truncate">{item.notes}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setEditingNoteItemId(item.id);
                                                        setTempNoteText(item.notes || '');
                                                    }}
                                                    className="text-[10px] font-black text-amber-700 dark:text-amber-300 hover:underline shrink-0"
                                                >
                                                    تعديل
                                                </button>
                                            </div>
                                        )}

                                        {isEditingNote && (
                                            <div className="p-2 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 rounded-lg space-y-1.5">
                                                <div className="flex items-center justify-between text-[11px] font-black text-amber-900 dark:text-amber-200">
                                                    <span>ملاحظة المطبخ:</span>
                                                    <button onClick={() => setEditingNoteItemId(null)} className="text-gray-400 hover:text-gray-600">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="مثال: بدون بصل..."
                                                    value={tempNoteText}
                                                    onChange={(e) => setTempNoteText(e.target.value)}
                                                    className="w-full h-7 bg-white dark:bg-gray-900 border border-amber-200 rounded-md px-2 text-[11px] font-bold outline-none"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-1 pt-0.5">
                                                    <button
                                                        onClick={() => {
                                                            updateItemNotes(item.id, '');
                                                            setEditingNoteItemId(null);
                                                        }}
                                                        className="px-2 py-0.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded"
                                                    >
                                                        مسح
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            updateItemNotes(item.id, tempNoteText.trim());
                                                            setEditingNoteItemId(null);
                                                        }}
                                                        className="px-2.5 py-0.5 text-[10px] font-black bg-amber-600 text-white rounded shadow-xs"
                                                    >
                                                        حفظ
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-1 border-t border-gray-200/50 dark:border-gray-700/40">
                                            <div className="flex items-center bg-white dark:bg-gray-900 rounded-lg p-0.5 border border-gray-200/80 dark:border-gray-700/60 shadow-2xs" dir="ltr">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold"
                                                >
                                                    {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-500" /> : <Minus className="w-3.5 h-3.5" />}
                                                </button>
                                                <span className="font-black text-gray-900 dark:text-white text-xs min-w-[2rem] text-center tabular-nums">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold transition-all shadow-2xs"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {!item.notes && !isEditingNote && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingNoteItemId(item.id);
                                                            setTempNoteText('');
                                                        }}
                                                        className="h-7 px-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:text-amber-600 hover:border-amber-400 text-[11px] font-bold flex items-center gap-1 transition-all"
                                                    >
                                                        <FileText className="w-3 h-3 text-amber-500" />
                                                        <span>ملاحظة</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                                                    title="حذف الصنف"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* فوتر السلة مع أزرار الدفع الكبيرة والواضحة */}
                    <div className="shrink-0 p-3.5 sm:p-4 bg-gray-50/90 dark:bg-gray-900/90 border-t-2 border-gray-100 dark:border-gray-800/80 space-y-3">
                        {/* بطاقة الحسابات البارزة */}
                        <div className="flex justify-between items-center bg-white dark:bg-[#070b14] px-4 py-3 rounded-2xl border-2 border-emerald-500/20 shadow-sm">
                            <div className="text-right">
                                <span className="text-[11px] font-bold text-gray-400 block mb-0.5">المبلغ الإجمالي المستحق</span>
                                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                                    {total.toFixed(2)} <span className="text-xs font-bold text-gray-400">د.ل</span>
                                </span>
                            </div>
                            <div className="text-left space-y-0.5">
                                <span className="text-[11px] font-bold text-gray-400 block">المجموع الفرعي</span>
                                <span className="text-sm font-black text-gray-700 dark:text-gray-200 tabular-nums">
                                    {subtotal.toFixed(2)} د.ل
                                </span>
                            </div>
                        </div>

                        {/* أزرار طرق الدفع الكبيرة - مريحة للشاشات اللمسية وتسهيل عمل الكاشير */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                            {/* زر نقدي كبير */}
                            <button
                                onClick={() => handleCheckout('cash')}
                                disabled={isProcessingCheckout || isProcessingHold}
                                className="flex flex-col items-center justify-center gap-1.5 py-3 sm:py-3.5 px-2 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-black shadow-md shadow-emerald-600/25 active:scale-95 disabled:opacity-50 transition-all cursor-pointer group"
                                title="الدفع نقداً (F1)"
                            >
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Banknote className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-sm sm:text-base font-black tracking-wide">نقدي</span>
                                <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.2 rounded text-white/90">F1</span>
                            </button>

                            {/* زر بطاقة كبير */}
                            <button
                                onClick={() => {
                                    if (items.length === 0 && !currentOrder) {
                                        showAlert('يرجى إضافة أصناف إلى السلة أولاً قبل اختيار طريقة الدفع.', 'السلة فارغة', 'warning');
                                        return;
                                    }
                                    setShowCardModal(true);
                                }}
                                disabled={isProcessingCheckout || isProcessingHold}
                                className="flex flex-col items-center justify-center gap-1.5 py-3 sm:py-3.5 px-2 bg-gradient-to-b from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black shadow-md shadow-indigo-600/25 active:scale-95 disabled:opacity-50 transition-all cursor-pointer group"
                                title="الدفع ببطاقة الدفع الإلكتروني (F2)"
                            >
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <CreditCard className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-sm sm:text-base font-black tracking-wide">بطاقة</span>
                                <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.2 rounded text-white/90">F2</span>
                            </button>

                            {/* زر آجل كبير */}
                            <button
                                onClick={() => {
                                    if (items.length === 0 && !currentOrder) {
                                        showAlert('يرجى إضافة أصناف إلى السلة أولاً قبل اختيار طريقة الدفع.', 'السلة فارغة', 'warning');
                                        return;
                                    }
                                    setShowDebtModal(true);
                                }}
                                disabled={isProcessingCheckout || isProcessingHold}
                                className="flex flex-col items-center justify-center gap-1.5 py-3 sm:py-3.5 px-2 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black shadow-md shadow-amber-500/25 active:scale-95 disabled:opacity-50 transition-all cursor-pointer group"
                                title="تسجيل الطلب كحساب آجل (F3)"
                            >
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-sm sm:text-base font-black tracking-wide">آجل</span>
                                <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.2 rounded text-white/90">F3</span>
                            </button>
                        </div>

                        {/* زرا الطلب المعلق وإصدار الفاتورة */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleHoldOrder}
                                disabled={items.length === 0 || isProcessingHold || isProcessingCheckout}
                                className="h-10 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300/70 rounded-xl font-black flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 active:scale-98 transition-all"
                                title="تعليق الطلب الحالي (F4)"
                            >
                                {isProcessingHold ? (
                                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <PauseCircle className="w-4 h-4 text-amber-600" />
                                )}
                                <span>طلب معلق (F4)</span>
                            </button>
                            <button
                                onClick={() => handlePrintInvoice()}
                                className="h-10 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:text-emerald-600 hover:border-emerald-600 font-black rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm no-print active:scale-98 transition-all shadow-2xs"
                            >
                                <Receipt className="w-4 h-4 text-emerald-600" />
                                <span>عرض الفاتورة</span>
                            </button>
                        </div>

                        {/* تسجيل مصروفات وإغلاق الوردية */}
                        <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-gray-200/60 dark:border-gray-800/60 px-1">
                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="text-rose-500 hover:text-rose-600 hover:underline"
                            >
                                + تسجيل مصروف
                            </button>
                            <button
                                onClick={() => {
                                    setShiftMode('close');
                                    setShowShiftModal(true);
                                }}
                                className="text-amber-600 hover:text-amber-700 hover:underline"
                            >
                                إغلاق الوردية
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <Modal isOpen={showSuccessModal} onClose={() => { setShowSuccessModal(false); clearCart(); }} title="تم إتمام العملية">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">تمت عملية البيع بنجاح!</h3>
                    <p className="text-gray-500 font-bold text-xs mb-5">تم تسجيل الدفع وتحديث حالة الطلب بنجاح.</p>
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={() => {
                                setShowSuccessModal(false);
                                setShowThermalReceipt(true);
                            }}
                            className="flex-1 h-10 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl font-black transition-all text-xs flex items-center justify-center gap-1.5"
                        >
                            <Receipt className="w-4 h-4" />
                            <span>عرض الفاتورة</span>
                        </button>
                        <button
                            onClick={() => { setShowSuccessModal(false); clearCart(); }}
                            className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md transition-all text-xs"
                        >
                            طلب جديد
                        </button>
                    </div>
                </div>
            </Modal>

            {/* نافذة التنبيهات المنبثقة الشاملة (In-App Popup Alert Modal) */}
            <Modal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                title={alertModal.title}
            >
                <div className="flex flex-col items-center justify-center py-5 text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-inner ${
                        alertModal.type === 'error'
                            ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                            : alertModal.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                            : alertModal.type === 'info'
                            ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-600'
                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600'
                    }`}>
                        {alertModal.type === 'success' ? (
                            <CheckCircle className="w-9 h-9" />
                        ) : alertModal.type === 'error' ? (
                            <X className="w-9 h-9 stroke-[2.5]" />
                        ) : (
                            <AlertCircle className="w-9 h-9" />
                        )}
                    </div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white mb-2">
                        {alertModal.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 font-bold text-xs sm:text-sm mb-6 max-w-xs leading-relaxed">
                        {alertModal.message}
                    </p>
                    <button
                        onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                        className={`w-full h-11 text-white rounded-xl font-black shadow-md transition-all text-xs cursor-pointer active:scale-98 ${
                            alertModal.type === 'error'
                                ? 'bg-rose-600 hover:bg-rose-700'
                                : alertModal.type === 'success'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : alertModal.type === 'info'
                                ? 'bg-sky-600 hover:bg-sky-700'
                                : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                    >
                        حسناً، فهمت
                    </button>
                </div>
            </Modal>

            <Modal isOpen={showWarningModal} onClose={() => setShowWarningModal(false)} title="تنبيه">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center mb-3">
                        <AlertCircle className="w-10 h-10 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">إصدار فاتورة مطلوب</h3>
                    <p className="text-gray-500 font-bold text-xs mb-5">يرجى إصدار فاتورة أولاً قبل إتمام عملية الدفع.</p>
                    <button
                        onClick={() => setShowWarningModal(false)}
                        className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black shadow-md transition-all text-xs"
                    >
                        فهمت
                    </button>
                </div>
            </Modal>

            <Modal isOpen={showCardModal} onClose={() => setShowCardModal(false)} title="الدفع بالبطاقة المصرفية">
                <div className="space-y-3 py-1">
                    <div>
                        <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1.5">اختر خدمة البطاقة / الدفع الإلكتروني</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['تداول', 'إدفع لي', 'سداد', 'موبي كاش', 'أخرى'].map((provider) => (
                                <button
                                    key={provider}
                                    type="button"
                                    onClick={() => setSelectedCardProvider(provider)}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-between ${
                                        selectedCardProvider === provider
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-600 ring-1 ring-emerald-500/20'
                                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    <span>{provider}</span>
                                    {selectedCardProvider === provider && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedCardProvider === 'أخرى' && (
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 mb-1 block">اسم خدمة البطاقة</label>
                            <input
                                type="text"
                                placeholder="مثال: بطاقة محلية..."
                                value={customCardProvider}
                                onChange={(e) => setCustomCardProvider(e.target.value)}
                                className="w-full h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">رقم المعاملة / الإيصال (اختياري)</label>
                        <input
                            type="text"
                            placeholder="رقم المعاملة..."
                            value={cardTransactionId}
                            onChange={(e) => setCardTransactionId(e.target.value)}
                            className="w-full h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none"
                        />
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400">إجمالي المبلغ:</span>
                        <span className="text-base font-black text-emerald-600 tabular-nums">{total.toFixed(2)} د.ل</span>
                    </div>

                    <button
                        onClick={() => {
                            const provider = selectedCardProvider === 'أخرى' ? (customCardProvider.trim() || 'أخرى') : selectedCardProvider;
                            setShowCardModal(false);
                            handleCheckout('card', provider, cardTransactionId);
                        }}
                        disabled={isProcessingCheckout}
                        className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md transition-all text-xs"
                    >
                        {isProcessingCheckout ? 'جاري الدفع...' : 'تأكيد الدفع بالبطاقة'}
                    </button>
                </div>
            </Modal>

            <Modal isOpen={showDebtModal} onClose={() => setShowDebtModal(false)} title="تسجيل دفع آجل (ذمة)">
                <div className="space-y-3 py-1">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                        سيتم إتمام الطلب وترحيله كـ "آجل" في قسم المدفوعات لمتابعته لاحقاً.
                    </div>

                    <div>
                        <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">اسم العميل أو الجهة (اختياري)</label>
                        <input
                            type="text"
                            placeholder="اسم العميل..."
                            value={debtCustomerName}
                            onChange={(e) => setDebtCustomerName(e.target.value)}
                            className="w-full h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">رقم الهاتف أو ملاحظات (اختياري)</label>
                        <input
                            type="text"
                            placeholder="رقم الهاتف أو بيان الذمة..."
                            value={debtNotes}
                            onChange={(e) => setDebtNotes(e.target.value)}
                            className="w-full h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none"
                        />
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400">إجمالي المبلغ الآجل:</span>
                        <span className="text-base font-black text-amber-600 tabular-nums">{total.toFixed(2)} د.ل</span>
                    </div>

                    <button
                        onClick={() => {
                            setShowDebtModal(false);
                            const info = debtCustomerName.trim() ? `${debtCustomerName.trim()}${debtNotes.trim() ? ' - ' + debtNotes.trim() : ''}` : debtNotes.trim();
                            handleCheckout('debt', undefined, undefined, info);
                        }}
                        disabled={isProcessingCheckout}
                        className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black shadow-md transition-all text-xs"
                    >
                        {isProcessingCheckout ? 'جاري التسجيل...' : 'تأكيد تسجيل الدفع الآجل'}
                    </button>
                </div>
            </Modal>

            <Modal isOpen={showActiveOrdersModal} onClose={() => setShowActiveOrdersModal(false)} title="الطلبيات النشطة والمعلقة">
                <div className="space-y-2.5 py-1 max-h-[60vh] overflow-y-auto">
                    {activeOrders.length === 0 ? (
                        <div className="p-5 text-center bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 space-y-1.5">
                            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                            <h4 className="text-xs font-black text-gray-800 dark:text-gray-200">لا توجد طلبيات معلقة حالياً</h4>
                            <p className="text-[11px] text-gray-500 font-bold">
                                يمكنك حفظ أي طلب كطلب معلق من زر "حفظ كطلب معلق" وسداده لاحقاً من هنا.
                            </p>
                        </div>
                    ) : (
                        activeOrders.map((ord) => (
                            <div key={ord.id} className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200/60 dark:border-gray-800 flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-black text-gray-900 dark:text-white text-xs">#{ord.id}</span>
                                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                            {ord.table_number || 'سفري'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 truncate">
                                        {ord.items.map(i => `${i.menu_item?.name || 'صنف'} (${i.quantity})`).join('، ')}
                                    </div>
                                    <div className="text-xs font-black text-emerald-600 mt-0.5">
                                        {ord.total_amount} د.ل
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => { loadOrderIntoPOS(ord); setShowActiveOrdersModal(false); }}
                                        className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-xs transition-all"
                                    >
                                        تحميل وسداد
                                    </button>
                                    <button
                                        onClick={() => handleCancelActiveOrder(ord.id)}
                                        className="h-8 w-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg border border-rose-200/50 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            <ShiftModal isOpen={showShiftModal} onClose={() => { if (shiftMode === 'open' && !activeShift) return; setShowShiftModal(false); }} mode={shiftMode} onSuccess={() => checkCurrentShift()} />
            <ExpenseModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} />

            {showThermalReceipt && thermalOrder && (
                <ThermalReceipt80mm
                    order={thermalOrder}
                    settings={settings}
                    onClose={() => {
                        setShowThermalReceipt(false);
                        setThermalOrder(null);
                    }}
                    autoPrint={false}
                />
            )}
        </div>
    );

    async function handleCheckout(method: 'cash' | 'card' | 'debt', cardProvider?: string, transactionId?: string, debtDetails?: string) {
        if (!activeShift) {
            showAlert('يرجى فتح وردية أولاً قبل البدء في المبيعات.', 'الوردية مغلقة', 'warning');
            setShiftMode('open');
            setShowShiftModal(true);
            return;
        }

        if (items.length === 0 && !currentOrder) {
            showAlert('يرجى إضافة أصناف إلى السلة أولاً لإتمام عملية البيع.', 'السلة فارغة', 'warning');
            return;
        }

        try {
            setIsProcessingCheckout(true);
            let orderToPay = currentOrder;

            if (!orderToPay) {
                const selectedTable = tables.find(t => t.id === selectedTableId);
                const tableDescriptor = orderType === 'takeaway' ? 'سفري' : (selectedTable ? `طاولة ${selectedTable.table_number}` : 'محلي');

                const orderPayload = {
                    items: items.map(item => ({
                        menu_item_id: item.id,
                        quantity: item.quantity,
                        notes: item.notes || undefined
                    })),
                    status: 'pending',
                    table_number: tableDescriptor,
                };

                orderToPay = await orderService.createOrder(orderPayload);
                setCurrentOrder(orderToPay);
                setLastOrder(orderToPay);
                setInvoiceIssued(true);
            }

            await paymentService.recordPayment({
                order_id: orderToPay.id,
                amount: total,
                payment_method: method === 'card' ? 'credit_card' : method === 'debt' ? 'debt' : 'cash',
                card_provider: method === 'card' ? (cardProvider || 'تداول') : undefined,
                transaction_id: transactionId || (debtDetails ? `آجل: ${debtDetails}` : undefined)
            });

            await orderService.updateOrder(orderToPay.id, { status: 'completed' });

            const completedOrderData = {
                ...orderToPay,
                items: (orderToPay.items && orderToPay.items.length > 0) ? orderToPay.items : items.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    unit_price: item.price,
                    quantity: item.quantity,
                    notes: item.notes,
                    menu_item: { name: item.name, price: item.price }
                })),
                total_amount: total,
                payment_method: method === 'card' ? 'credit_card' : method === 'debt' ? 'debt' : 'cash',
                card_provider: method === 'card' ? cardProvider : undefined,
                table_number: orderToPay.table_number || (orderType === 'takeaway' ? 'سفري' : 'محلي'),
                cashier_name: currentCashierName,
                shift_id: activeShift?.id,
                order_date_time: new Date().toISOString()
            };
            setThermalOrder(completedOrderData);

            // Open the in-app invoice popup modal immediately (without browser print dialog)
            setShowThermalReceipt(true);
            setShowSuccessModal(false);

            clearCart();
            setCurrentOrder(null);
            setInvoiceIssued(false);
            fetchActiveOrders();
        } catch (err: any) {
            console.error('Checkout failed', err);
            const msg = err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إتمام الدفع';
            if (typeof msg === 'string' && msg.includes('وردية')) {
                setShiftMode('open');
                setShowShiftModal(true);
            }
            showAlert(`فشل إتمام العملية: ${msg}`, 'خطأ في الدفع', 'error');
        } finally {
            setIsProcessingCheckout(false);
        }
    }

    async function handlePrintInvoice() {
        if (!activeShift) {
            showAlert('يرجى فتح وردية أولاً قبل البدء في المبيعات.', 'الوردية مغلقة', 'warning');
            setShiftMode('open');
            setShowShiftModal(true);
            return;
        }

        if (items.length === 0 && !currentOrder) return;

        try {
            let order = currentOrder;
            if (!order) {
                const selectedTable = tables.find(t => t.id === selectedTableId);
                const tableDescriptor = orderType === 'takeaway' ? 'سفري' : (selectedTable ? `طاولة ${selectedTable.table_number}` : 'محلي');

                const orderPayload = {
                    items: items.map(item => ({
                        menu_item_id: item.id,
                        quantity: item.quantity,
                        notes: item.notes || undefined
                    })),
                    status: 'pending',
                    table_number: tableDescriptor,
                };

                order = await orderService.createOrder(orderPayload);
                setCurrentOrder(order);
                setLastOrder(order);
            }
            setInvoiceIssued(true);

            const orderToPrint = {
                ...order,
                items: (order.items && order.items.length > 0) ? order.items : items.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    unit_price: item.price,
                    quantity: item.quantity,
                    notes: item.notes,
                    menu_item: { name: item.name, price: item.price }
                })),
                total_amount: order.total_amount ? Number(order.total_amount) : total,
                table_number: order.table_number || (orderType === 'takeaway' ? 'سفري' : 'محلي'),
                cashier_name: currentCashierName,
                shift_id: activeShift?.id,
                order_date_time: order.created_at || order.order_date_time || new Date().toISOString()
            };
            setThermalOrder(orderToPrint);
            setShowThermalReceipt(true);
        } catch (err: any) {
            console.error('Failed to issue invoice', err);
            const msg = err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إصدار الفاتورة';
            if (typeof msg === 'string' && msg.includes('وردية')) {
                setShiftMode('open');
                setShowShiftModal(true);
            }
            showAlert(`حدث خطأ أثناء إصدار الفاتورة: ${msg}`, 'خطأ في الفاتورة', 'error');
        }
    }

    async function handleHoldOrder() {
        if (!activeShift) {
            showAlert('يرجى فتح وردية أولاً قبل البدء في المبيعات وحفظ الطلبات المعلقة.', 'الوردية مغلقة', 'warning');
            setShiftMode('open');
            setShowShiftModal(true);
            return;
        }

        if (items.length === 0) {
            showAlert('يرجى إضافة أصناف إلى السلة أولاً لوضع الطلب في الانتظار.', 'السلة فارغة', 'warning');
            return;
        }

        try {
            setIsProcessingHold(true);
            const selectedTable = tables.find(t => t.id === selectedTableId);
            const tableDescriptor = orderType === 'takeaway' ? 'سفري' : (selectedTable ? `طاولة ${selectedTable.table_number}` : 'محلي');

            const orderPayload = {
                items: items.map(item => ({
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    notes: item.notes || undefined
                })),
                status: 'pending',
                table_number: tableDescriptor,
            };

            const created = await orderService.createOrder(orderPayload);
            clearCart();
            setCurrentOrder(null);
            setInvoiceIssued(false);
            await fetchActiveOrders();
            showAlert(`تم حفظ الطلب رقم #${created.id} كطلب معلق بنجاح!`, 'تم التعليق بنجاح', 'success');
        } catch (err: any) {
            console.error('Failed to hold order', err);
            const msg = err?.response?.data?.message || err?.message || 'حدث خطأ أثناء تعليق الطلب';
            if (typeof msg === 'string' && msg.includes('وردية')) {
                setShiftMode('open');
                setShowShiftModal(true);
            }
            showAlert(`فشل حفظ الطلب المعلق: ${msg}`, 'خطأ في الحفظ', 'error');
        } finally {
            setIsProcessingHold(false);
        }
    }

    async function handleCancelActiveOrder(orderId: number) {
        if (!confirm(`هل أنت متأكد من رغبتك في إلغاء الطلب المعلق رقم #${orderId}؟`)) return;
        try {
            await orderService.updateOrder(orderId, { status: 'cancelled'}) ;
            await fetchActiveOrders();
        } catch (err: any) {
            console.error('Failed to cancel active order', err);
            showAlert('فشل إلغاء الطلب المعلق', 'خطأ في الإلغاء', 'error');
        }
    }
}