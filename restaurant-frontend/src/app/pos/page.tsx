'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Sidebar, Modal, ShiftModal, ExpenseModal } from '@/components';
import {
    Coffee,
    Utensils,
    CupSoda,
    Pizza,
    IceCream,
    Cake,
    Soup,
    Search,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Banknote,
    Receipt,
    Clock,
    User,
    PauseCircle,
    ChevronDown,
    FileText,
    X,
    CheckCircle,
    AlertCircle,
    ShoppingBag
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

// Pastel color badges matching SimplePOS mockup
const PASTEL_PALETTES = [
    { bg: 'bg-blue-100/80 dark:bg-blue-950/50', text: 'text-blue-500 dark:text-blue-400' },
    { bg: 'bg-emerald-100/80 dark:bg-emerald-950/50', text: 'text-emerald-500 dark:text-emerald-400' },
    { bg: 'bg-rose-100/80 dark:bg-rose-950/50', text: 'text-rose-500 dark:text-rose-400' },
    { bg: 'bg-amber-100/80 dark:bg-amber-950/50', text: 'text-amber-500 dark:text-amber-400' },
    { bg: 'bg-purple-100/80 dark:bg-purple-950/50', text: 'text-purple-500 dark:text-purple-400' },
    { bg: 'bg-yellow-100/80 dark:bg-yellow-950/50', text: 'text-yellow-600 dark:text-yellow-400' },
    { bg: 'bg-teal-100/80 dark:bg-teal-950/50', text: 'text-teal-500 dark:text-teal-400' },
];

function getPastelPalette(index: number) {
    return PASTEL_PALETTES[index % PASTEL_PALETTES.length];
}

function getFoodIcon(name: string = '', category?: string | null) {
    const text = `${name} ${category || ''}`.toLowerCase();
    if (text.includes('قهوة') || text.includes('كافيه') || text.includes('لاتيه') || text.includes('شاي') || text.includes('latte') || text.includes('coffee') || text.includes('tea')) {
        return Coffee;
    }
    if (text.includes('عصير') || text.includes('مشروب') || text.includes('كولا') || text.includes('بيبسي') || text.includes('ماء') || text.includes('مياه') || text.includes('cola') || text.includes('juice') || text.includes('drink') || text.includes('water')) {
        return CupSoda;
    }
    if (text.includes('بيتزا') || text.includes('pizza')) {
        return Pizza;
    }
    if (text.includes('كيك') || text.includes('حلو') || text.includes('تورت') || text.includes('cake') || text.includes('dessert')) {
        return Cake;
    }
    if (text.includes('ايس') || text.includes('مثلج') || text.includes('ice cream')) {
        return IceCream;
    }
    if (text.includes('شوربة') || text.includes('soup')) {
        return Soup;
    }
    return Utensils;
}

export default function POSPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn, user, activeShift, setActiveShift } = useAuthStore();
    const { items, addItem, removeItem, updateQuantity, updateItemNotes, clearCart, setCartItems, getTotals } = useCartStore();
    const router = useRouter();
    const isOrderLoadedManually = useRef(false);

    // Responsive Mobile Tab: 'menu' or 'cart'
    const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

    // Filter and Search states
    const [activeCategory, setActiveCategory] = useState('الكل');
    const [searchQuery, setSearchQuery] = useState('');
    const [isClient, setIsClient] = useState(false);
    const [currentTime, setCurrentTime] = useState('20:24');

    // Data states
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>(['الكل']);
    const [tables, setTables] = useState<Table[]>([]);
    const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('takeaway');
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

    // Active & Held orders
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [showActiveOrdersModal, setShowActiveOrdersModal] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [lastOrder, setLastOrder] = useState<any>(null);
    const [invoiceIssued, setInvoiceIssued] = useState(false);

    // Modals
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [shiftMode, setShiftMode] = useState<'open' | 'close'>('open');
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showChargeModal, setShowChargeModal] = useState(false);

    // Card Payment Modal
    const [showCardModal, setShowCardModal] = useState(false);
    const [selectedCardProvider, setSelectedCardProvider] = useState<string>('تداول');
    const [customCardProvider, setCustomCardProvider] = useState('');
    const [cardTransactionId, setCardTransactionId] = useState('');

    // Debt Payment Modal
    const [showDebtModal, setShowDebtModal] = useState(false);
    const [debtCustomerName, setDebtCustomerName] = useState('');
    const [debtNotes, setDebtNotes] = useState('');

    // Processing states
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
    const [isProcessingHold, setIsProcessingHold] = useState(false);
    const [editingNoteItemId, setEditingNoteItemId] = useState<number | null>(null);
    const [tempNoteText, setTempNoteText] = useState('');

    const { subtotal, taxAmount, total } = getTotals();

    // Live clock
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        } else {
            fetchData();
            checkCurrentShift();
        }
    }, [isLoggedIn, router]);

    // Query params handling
    useEffect(() => {
        if (isClient && isLoggedIn) {
            const urlParams = new URLSearchParams(window.location.search);
            const orderIdParam = urlParams.get('orderId');
            const tableIdParam = urlParams.get('tableId');
            const orderTypeParam = urlParams.get('orderType');

            if (orderIdParam) {
                orderService.getOrder(parseInt(orderIdParam))
                    .then(ord => {
                        if (ord) loadOrderIntoPOS(ord);
                    })
                    .catch(err => console.error('Failed to load order from query param', err));
            }

            if (tableIdParam) {
                setSelectedTableId(parseInt(tableIdParam));
                setOrderType('dine_in');
            } else if (orderTypeParam === 'dine_in' || orderTypeParam === 'takeaway') {
                setOrderType(orderTypeParam);
            }
        }
    }, [isClient, isLoggedIn]);

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
    };

    const fetchData = async () => {
        try {
            const [itemsData, categoriesData, tablesData] = await Promise.all([
                menuService.getMenuItems(),
                menuService.getCategories(),
                reservationService.getTables()
            ]);
            setMenuItems(itemsData);
            setCategories(['الكل', ...categoriesData.filter(c => c.name !== 'All' && c.name !== 'الكل').map(c => c.name)]);
            setTables(tablesData);
            fetchActiveOrders();

            const validIds = new Set(itemsData.map(i => i.id));
            const currentCart = useCartStore.getState().items;
            const validCartItems = currentCart.filter(i => validIds.has(i.id));
            if (validCartItems.length !== currentCart.length) {
                setCartItems(validCartItems);
            }
        } catch (err) {
            console.error('Failed to fetch POS data', err);
        }
    };

    if (!isClient || !isLoggedIn) return null;

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = activeCategory === 'All' || activeCategory === 'الكل' || item.category?.name === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const totalItemCount = items.reduce((sum, it) => sum + it.quantity, 0);

    return (
        <div className="flex bg-[#f4f6fb] dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-x-hidden">
            <style jsx global>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        visibility: hidden;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white !important;
                    }
                    .no-print, main, aside, nav, header {
                        display: none !important;
                    }
                    #printable-receipt {
                        visibility: visible !important;
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20px;
                        background: white !important;
                        color: black !important;
                    }
                    #printable-receipt * {
                        visibility: visible !important;
                        color: black !important;
                    }
                }
            `}</style>

            <Sidebar className="no-print" />

            {/* Main Content Area - Responsively bounded to prevent viewport overflow */}
            <div className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} flex flex-col min-h-screen min-w-0 w-full overflow-x-hidden transition-all duration-300`}>
                
                {/* 1. TOP HEADER (Matching System Theme) */}
                <header className="no-print bg-card dark:bg-card px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs border-b border-gray-100 dark:border-gray-800/60 z-20 min-w-0 w-full gap-2 transition-colors duration-200">
                    {/* Brand & Cashier details */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-base sm:text-lg shadow-sm shadow-emerald-600/20 shrink-0">
                            P
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h1 className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-none truncate">نقطة البيع</h1>
                            </div>
                            <p className="text-gray-400 dark:text-gray-500 text-[11px] sm:text-xs font-bold truncate mt-0.5">
                                كاونتر 01 · الكاشير: <span className="text-gray-700 dark:text-gray-300 font-bold">{user?.first_name ? `${user.first_name}` : 'Alex'}</span>
                            </p>
                        </div>
                    </div>

                    {/* Right Utility Actions + Digital Clock */}
                    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                        {/* Active / Held orders */}
                        <button
                            onClick={() => {
                                fetchActiveOrders();
                                setShowActiveOrdersModal(true);
                            }}
                            className="relative flex items-center gap-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/80 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200/80 dark:border-gray-700/60 transition-all active:scale-95 shadow-2xs"
                            title="عرض الطلبيات المعلقة والنشطة"
                        >
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="hidden md:inline">الطلبات المعلقة</span>
                            {activeOrders.length > 0 && (
                                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                    {activeOrders.length}
                                </span>
                            )}
                        </button>

                        {/* Shift Shortcut */}
                        <button
                            onClick={() => {
                                setShiftMode(activeShift ? 'close' : 'open');
                                setShowShiftModal(true);
                            }}
                            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 border shadow-2xs ${
                                activeShift 
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' 
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                            }`}
                            title="إدارة الوردية الحالية"
                        >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${activeShift ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <span className="hidden sm:inline">{activeShift ? 'وردية مفتوحة' : 'فتح وردية'}</span>
                        </button>

                        {/* Expense Shortcut */}
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="hidden lg:flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/80 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-gray-200/80 dark:border-gray-700/60 transition-all active:scale-95 shadow-2xs"
                        >
                            مصروف
                        </button>

                        {/* Digital Live Clock */}
                        <div className="bg-gray-50 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-gray-200/80 dark:border-gray-700/60 font-mono text-xs sm:text-sm md:text-base font-black tracking-wider shadow-2xs shrink-0">
                            {currentTime}
                        </div>
                    </div>
                </header>

                {/* Mobile / Tablet Screen Switcher (< lg) */}
                <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex gap-2 no-print">
                    <button
                        onClick={() => setMobileTab('menu')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            mobileTab === 'menu'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800'
                        }`}
                    >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>قائمة الأصناف</span>
                    </button>
                    <button
                        onClick={() => setMobileTab('cart')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative ${
                            mobileTab === 'cart'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800'
                        }`}
                    >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>الطلب الحالي</span>
                        {totalItemCount > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                {totalItemCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* 2. MAIN RESPONSIVE CONTENT AREA */}
                <main className="flex-1 p-3 sm:p-4 md:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start min-w-0 w-full">
                    
                    {/* LEFT / MAIN SECTION: Category Pills + Menu Grid */}
                    <section className={`flex-1 min-w-0 w-full space-y-4 ${mobileTab === 'cart' ? 'hidden lg:block' : 'block'}`}>
                        
                        {/* Category Pills */}
                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none flex-nowrap shrink-0">
                            {categories.map((cat) => {
                                const isSelected = activeCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-600/20'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 shadow-xs'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Menu Items Grid - Fully Responsive */}
                        {filteredItems.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 p-8 sm:p-12 text-center text-slate-400">
                                <Utensils className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm sm:text-base font-semibold">لا توجد أصناف تطابق هذا البحث أو التصنيف</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                                {filteredItems.map((item, idx) => {
                                    const palette = getPastelPalette(idx);
                                    const ItemIcon = getFoodIcon(item.name, item.category?.name);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => addItem({
                                                id: item.id,
                                                name: item.name,
                                                price: item.price,
                                                image_url: item.image_url,
                                                category: item.category?.name
                                            })}
                                            className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 border border-slate-100 dark:border-slate-700/60 cursor-pointer flex flex-col justify-between aspect-square active:scale-95 group select-none min-h-[140px]"
                                        >
                                            {/* Pastel Rounded Square Badge */}
                                            <div className={`w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center ${palette.bg} ${palette.text} transition-transform group-hover:scale-105 overflow-hidden shadow-xs shrink-0`}>
                                                {item.image_url ? (
                                                    <img
                                                        src={getFullUrl(item.image_url)}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <ItemIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                                                )}
                                            </div>

                                            {/* Item Name & Price */}
                                            <div className="mt-auto pt-2 sm:pt-3">
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm md:text-base leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {item.name}
                                                </h3>
                                                <p className="text-indigo-600 dark:text-indigo-400 font-black text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1 tabular-nums">
                                                    {item.price.toFixed(2)} د.ل
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* RIGHT / ASIDE SECTION: Simple "Current Order" Cart - Widened for optimal POS usability */}
                    <aside className={`w-full lg:w-[420px] xl:w-[480px] 2xl:w-[540px] shrink-0 min-w-0 ${mobileTab === 'menu' ? 'hidden lg:block' : 'block'}`}>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/70 p-4 sm:p-6 flex flex-col h-auto lg:h-[calc(100vh-6.5rem)] lg:sticky lg:top-4">
                            
                            {/* Header: Title + Items Badge */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
                                <div className="flex items-center gap-2.5">
                                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">الطلب الحالي</h2>
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                                        {totalItemCount} {totalItemCount === 1 ? 'صنف' : 'أصناف'}
                                    </span>
                                </div>

                                {items.length > 0 && (
                                    <button
                                        onClick={clearCart}
                                        className="text-xs text-slate-400 hover:text-rose-500 font-bold transition-colors"
                                        title="تفريغ السلة"
                                    >
                                        مسح الكل
                                    </button>
                                )}
                            </div>

                            {/* Order Type & Table Selection */}
                            <div className="py-2.5 border-b border-slate-100 dark:border-slate-700/60 space-y-2">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setOrderType('takeaway')}
                                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            orderType === 'takeaway'
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        طلب سفري
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrderType('dine_in')}
                                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            orderType === 'dine_in'
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        طلب محلي (صالة)
                                    </button>
                                </div>

                                {orderType === 'dine_in' && (
                                    <div className="relative animate-in fade-in duration-200">
                                        <select
                                            value={selectedTableId || ''}
                                            onChange={(e) => setSelectedTableId(parseInt(e.target.value))}
                                            className="w-full h-8 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 pr-7 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                                        >
                                            <option value="" disabled>اختر الطاولة...</option>
                                            {tables.map(table => (
                                                <option key={table.id} value={table.id}>
                                                    طاولة {table.table_number} ({table.capacity} مقاعد)
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                )}
                            </div>

                            {/* Cart Line Items */}
                            <div className="flex-1 overflow-y-auto py-2.5 space-y-2.5 max-h-[300px] lg:max-h-none scrollbar-thin">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-8 opacity-40">
                                        <ShoppingBag className="w-10 h-10 text-slate-400 mb-2" />
                                        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">السلة فارغة</p>
                                        <p className="text-[11px] text-slate-400">انقر على صنف من القائمة لإضافته</p>
                                    </div>
                                ) : (
                                    items.map((item, idx) => {
                                        const palette = getPastelPalette(idx);
                                        const ItemIcon = getFoodIcon(item.name, item.category);
                                        const isEditingNote = editingNoteItemId === item.id;
                                        const lineTotal = (item.price * item.quantity).toFixed(2);

                                        return (
                                            <div key={item.id} className="space-y-1 group bg-slate-50/50 dark:bg-slate-700/20 p-2 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-700/40">
                                                <div className="flex items-center justify-between gap-3">
                                                    {/* Soft Pastel Mini Badge / Icon */}
                                                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${palette.bg} ${palette.text}`}>
                                                        {item.image_url ? (
                                                            <img
                                                                src={getFullUrl(item.image_url)}
                                                                alt={item.name}
                                                                className="w-full h-full object-cover rounded-xl"
                                                            />
                                                        ) : (
                                                            <ItemIcon className="w-5 h-5" />
                                                        )}
                                                    </div>

                                                    {/* Item Name & Unit Price */}
                                                     <div className="flex-1 min-w-0 pr-1">
                                                         <h4 className="text-xs sm:text-sm md:text-[15px] font-bold text-slate-800 dark:text-slate-100 truncate leading-snug">
                                                             {item.name}
                                                         </h4>
                                                         <p className="text-[11px] sm:text-xs text-gray-400 font-bold tabular-nums">
                                                             {item.price.toFixed(2)} د.ل
                                                         </p>
                                                     </div>

                                                     {/* Sleek Minimalist Stepper [-] qty [+] */}
                                                     <div className="flex items-center gap-1.5" dir="ltr">
                                                         <button
                                                             onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                             className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-all active:scale-90"
                                                             title="تقليل الكمية"
                                                         >
                                                             <Minus className="w-3 h-3" />
                                                         </button>
                                                         <span className="text-xs sm:text-sm md:text-base font-bold text-slate-800 dark:text-white min-w-[1.25rem] text-center tabular-nums">
                                                             {item.quantity}
                                                         </span>
                                                         <button
                                                             onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                             className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-all active:scale-90"
                                                             title="زيادة الكمية"
                                                         >
                                                             <Plus className="w-3 h-3" />
                                                         </button>
                                                     </div>

                                                     {/* Line Total */}
                                                     <div className="min-w-[60px] sm:min-w-[70px] text-end font-black text-xs sm:text-sm md:text-base text-gray-900 dark:text-white tabular-nums">
                                                         {lineTotal} د.ل
                                                     </div>
                                                </div>

                                                {/* Optional Note Tag / Edit Trigger */}
                                                {item.notes && !isEditingNote && (
                                                    <div className="flex items-center justify-between text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md">
                                                        <span className="truncate">* {item.notes}</span>
                                                        <button
                                                            onClick={() => {
                                                                setEditingNoteItemId(item.id);
                                                                setTempNoteText(item.notes || '');
                                                            }}
                                                            className="text-amber-600 font-bold hover:underline shrink-0 pr-1"
                                                        >
                                                            تعديل
                                                        </button>
                                                    </div>
                                                )}

                                                {isEditingNote && (
                                                    <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                                        <input
                                                            type="text"
                                                            placeholder="ملاحظة..."
                                                            value={tempNoteText}
                                                            onChange={(e) => setTempNoteText(e.target.value)}
                                                            className="flex-1 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 text-[11px] outline-none"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                updateItemNotes(item.id, tempNoteText.trim());
                                                                setEditingNoteItemId(null);
                                                            }}
                                                            className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold"
                                                        >
                                                            حفظ
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingNoteItemId(null)}
                                                            className="text-slate-400 hover:text-slate-600 text-[10px]"
                                                        >
                                                            إلغاء
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Summary & Checkout Actions */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3 mt-auto">
                                
                                {/* Subtotal & Tax */}
                                <div className="space-y-1 text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">
                                    <div className="flex justify-between items-center">
                                        <span>المجموع الفرعي:</span>
                                        <span className="font-black text-gray-700 dark:text-gray-200 tabular-nums">
                                            {subtotal.toFixed(2)} د.ل
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span>الضريبة (10%):</span>
                                        <span className="font-black text-gray-700 dark:text-gray-200 tabular-nums">
                                            {taxAmount.toFixed(2)} د.ل
                                        </span>
                                    </div>
                                </div>

                                {/* Grand Total */}
                                <div className="flex justify-between items-baseline pt-2 border-t border-gray-100 dark:border-gray-800/60">
                                    <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white">الإجمالي:</span>
                                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                                        {total.toFixed(2)} <span className="text-sm font-bold text-gray-400">د.ل</span>
                                    </span>
                                </div>

                                {/* Row 1: مسح + دفع */}
                                <div className="flex gap-2.5 pt-0.5">
                                    <button
                                        type="button"
                                        onClick={clearCart}
                                        disabled={items.length === 0}
                                        className="w-1/3 h-11 sm:h-12 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-40 shadow-xs"
                                    >
                                        مسح
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (items.length === 0 && !currentOrder) {
                                                alert('يرجى إضافة أصناف إلى السلة أولاً');
                                                return;
                                            }
                                            setShowChargeModal(true);
                                        }}
                                        disabled={isProcessingCheckout || (items.length === 0 && !currentOrder)}
                                        className="flex-1 h-11 sm:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base sm:text-lg shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isProcessingCheckout ? 'جاري الدفع...' : 'دفع'}
                                    </button>
                                </div>

                                {/* Row 2: Quick Cash Buttons (المبلغ بالضبط, 20 د.ل, 50 د.ل) */}
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleCheckout('cash')}
                                        disabled={isProcessingCheckout || items.length === 0}
                                        className="h-9 sm:h-10 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-40 shadow-xs"
                                    >
                                        المبلغ بالضبط
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCheckout('cash')}
                                        disabled={isProcessingCheckout || items.length === 0}
                                        className="h-9 sm:h-10 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-40 shadow-xs"
                                    >
                                        20 د.ل
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCheckout('cash')}
                                        disabled={isProcessingCheckout || items.length === 0}
                                        className="h-9 sm:h-10 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-40 shadow-xs"
                                    >
                                        50 د.ل
                                    </button>
                                </div>

                                {/* Row 3: Secondary Actions (Card / Debt / Hold / Print) */}
                                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (items.length === 0 && !currentOrder) return;
                                            setShowCardModal(true);
                                        }}
                                        disabled={items.length === 0 && !currentOrder}
                                        className="py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40 border border-slate-100 dark:border-slate-700"
                                    >
                                        بطاقة
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (items.length === 0 && !currentOrder) return;
                                            setShowDebtModal(true);
                                        }}
                                        disabled={items.length === 0 && !currentOrder}
                                        className="py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40 border border-slate-100 dark:border-slate-700"
                                    >
                                        آجل
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleHoldOrder}
                                        disabled={items.length === 0 || isProcessingHold}
                                        className="py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition-all disabled:opacity-40 border border-amber-200/50"
                                        title="تعليق الطلب وسداده لاحقاً"
                                    >
                                        تعليق
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePrintInvoice}
                                        disabled={items.length === 0}
                                        className="py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40 border border-slate-100 dark:border-slate-700"
                                    >
                                        طباعة
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>
                </main>

                {/* Sticky Mobile Cart Bar (< lg screens when viewing Menu and cart is not empty) */}
                {totalItemCount > 0 && mobileTab === 'menu' && (
                    <div className="lg:hidden fixed bottom-3 inset-x-3 bg-indigo-600 text-white rounded-2xl shadow-xl p-3 flex items-center justify-between z-30 animate-in slide-in-from-bottom-3 duration-200">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs">
                                {totalItemCount}
                            </div>
                            <div>
                                <p className="text-xs font-medium text-indigo-100 leading-none">الإجمالي الحالي</p>
                                <p className="text-base font-extrabold text-white mt-0.5">{total.toFixed(2)} د.ل</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setMobileTab('cart')}
                            className="bg-white text-indigo-600 font-bold px-4 py-2 rounded-xl text-xs shadow-sm active:scale-95 transition-all"
                        >
                            استعراض السلة والدفع ←
                        </button>
                    </div>
                )}
            </div>

            {/* CHARGE / PAYMENT METHOD MODAL */}
            <Modal
                isOpen={showChargeModal}
                onClose={() => setShowChargeModal(false)}
                title="إتمام عملية الدفع"
            >
                <div className="space-y-4 py-3">
                    <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-400 font-bold">المبلغ الإجمالي المستحق</span>
                        <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                            {total.toFixed(2)} د.ل
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                        {/* Cash */}
                        <button
                            onClick={() => {
                                setShowChargeModal(false);
                                handleCheckout('cash');
                            }}
                            className="p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all group"
                        >
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">دفع نقدي (كاش)</span>
                            <span className="text-[10px] text-slate-400">استلام المبلغ نقداً</span>
                        </button>

                        {/* Card */}
                        <button
                            onClick={() => {
                                setShowChargeModal(false);
                                setShowCardModal(true);
                            }}
                            className="p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all group"
                        >
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">بطاقة مصرفية</span>
                            <span className="text-[10px] text-slate-400">تداول، سداد، إدفع لي...</span>
                        </button>

                        {/* Debt */}
                        <button
                            onClick={() => {
                                setShowChargeModal(false);
                                setShowDebtModal(true);
                            }}
                            className="p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all group"
                        >
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">دفع آجل (ذمة)</span>
                            <span className="text-[10px] text-slate-400">تسجيل على الحساب</span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* CARD PROVIDER MODAL */}
            <Modal
                isOpen={showCardModal}
                onClose={() => setShowCardModal(false)}
                title="الدفع بالبطاقة المصرفية"
            >
                <div className="space-y-4 py-2">
                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">اختر خدمة البطاقة / الدفع الإلكتروني</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['تداول', 'إدفع لي', 'سداد', 'موبي كاش', 'أخرى'].map((provider) => (
                                <button
                                    key={provider}
                                    type="button"
                                    onClick={() => setSelectedCardProvider(provider)}
                                    className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                                        selectedCardProvider === provider
                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 ring-2 ring-indigo-500/20'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                    }`}
                                >
                                    <span>{provider}</span>
                                    {selectedCardProvider === provider && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedCardProvider === 'أخرى' && (
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 mb-1 block">اسم خدمة البطاقة</label>
                            <input
                                type="text"
                                placeholder="مثال: يسر، بطاقة محلية..."
                                value={customCardProvider}
                                onChange={(e) => setCustomCardProvider(e.target.value)}
                                className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">رقم المعاملة / الإيصال (اختياري)</label>
                        <input
                            type="text"
                            placeholder="رقم المعاملة من جهاز POS..."
                            value={cardTransactionId}
                            onChange={(e) => setCardTransactionId(e.target.value)}
                            className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">إجمالي المبلغ:</span>
                        <span className="text-base sm:text-lg font-black text-indigo-600 tabular-nums">{total.toFixed(2)} د.ل</span>
                    </div>

                    <button
                        onClick={() => {
                            const provider = selectedCardProvider === 'أخرى' ? (customCardProvider.trim() || 'أخرى') : selectedCardProvider;
                            setShowCardModal(false);
                            handleCheckout('card', provider, cardTransactionId);
                        }}
                        disabled={isProcessingCheckout}
                        className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-xs disabled:opacity-50"
                    >
                        {isProcessingCheckout ? 'جاري الدفع...' : 'تأكيد الدفع بالبطاقة'}
                    </button>
                </div>
            </Modal>

            {/* DEBT MODAL */}
            <Modal
                isOpen={showDebtModal}
                onClose={() => setShowDebtModal(false)}
                title="تسجيل دفع آجل (ذمة)"
            >
                <div className="space-y-4 py-2">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                        سيتم إتمام الطلب وترحيله كـ "آجل" في قسم المدفوعات والطلبيات لمتابعته لاحقاً.
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">اسم العميل أو الجهة (اختياري)</label>
                        <input
                            type="text"
                            placeholder="مثال: شركة النماء / الأستاذ أحمد..."
                            value={debtCustomerName}
                            onChange={(e) => setDebtCustomerName(e.target.value)}
                            className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">رقم الهاتف أو ملاحظات الآجل (اختياري)</label>
                        <input
                            type="text"
                            placeholder="رقم الهاتف أو بيان الذمة..."
                            value={debtNotes}
                            onChange={(e) => setDebtNotes(e.target.value)}
                            className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">إجمالي المبلغ الآجل:</span>
                        <span className="text-base sm:text-lg font-black text-amber-600 tabular-nums">{total.toFixed(2)} د.ل</span>
                    </div>

                    <button
                        onClick={() => {
                            setShowDebtModal(false);
                            const info = debtCustomerName.trim() ? `${debtCustomerName.trim()}${debtNotes.trim() ? ' - ' + debtNotes.trim() : ''}` : debtNotes.trim();
                            handleCheckout('debt', undefined, undefined, info);
                        }}
                        disabled={isProcessingCheckout}
                        className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-lg shadow-amber-600/20 transition-all active:scale-95 text-xs disabled:opacity-50"
                    >
                        {isProcessingCheckout ? 'جاري التسجيل...' : 'تأكيد تسجيل الدفع الآجل'}
                    </button>
                </div>
            </Modal>

            {/* ACTIVE ORDERS MODAL */}
            <Modal
                isOpen={showActiveOrdersModal}
                onClose={() => setShowActiveOrdersModal(false)}
                title="الطلبيات النشطة والمعلقة"
            >
                <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
                    {activeOrders.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                            <Clock className="w-8 h-8 text-amber-500 mx-auto opacity-60" />
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">لا توجد طلبيات معلقة حالياً</h4>
                            <p className="text-xs text-slate-400">
                                يمكنك تعليق أي طلب بالضغط على زر "تعليق" أسفل السلة لفتحه لاحقاً.
                            </p>
                        </div>
                    ) : (
                        activeOrders.map((ord) => (
                            <div
                                key={ord.id}
                                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-indigo-500 transition-all"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-extrabold text-slate-900 dark:text-white text-xs">#{ord.id}</span>
                                        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded">
                                            {ord.table_number || 'سفري'}
                                        </span>
                                        <span className="text-slate-400 text-[10px]">
                                            {new Date(ord.order_date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">
                                        {ord.items.map(i => `${i.menu_item?.name || 'صنف'} (${i.quantity})`).join('، ')}
                                    </div>
                                    <div className="text-xs font-bold text-indigo-600 mt-1">
                                        {ord.total_amount} د.ل
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            loadOrderIntoPOS(ord);
                                            setShowActiveOrdersModal(false);
                                        }}
                                        className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                                    >
                                        تحميل وسداد
                                    </button>
                                    <button
                                        onClick={() => handleCancelActiveOrder(ord.id)}
                                        className="h-8 w-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                        title="إلغاء الطلب"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            {/* SUCCESS MODAL */}
            <Modal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    clearCart();
                }}
                title="تم إتمام العملية بنجاح"
            >
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mb-3 animate-bounce">
                        <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">تم تسجيل عملية البيع بنجاح!</h3>
                    <p className="text-slate-400 text-xs mb-6">تم تحديث الخزينة وسجل الطلبات بنجاح.</p>
                    <button
                        onClick={() => {
                            setShowSuccessModal(false);
                            clearCart();
                        }}
                        className="w-full h-10 sm:h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all"
                    >
                        حسنًا
                    </button>
                </div>
            </Modal>

            {/* HIDDEN PRINTABLE RECEIPT */}
            <div id="printable-receipt" style={{ display: 'none' }}>
                <div className="text-center mb-4 border-b pb-4" style={{ borderColor: '#eee' }}>
                    <h1 className="text-xl font-bold">نظام إدارة المطعم</h1>
                    <p className="text-sm font-bold opacity-70">فاتورة مبيعات</p>
                    <div className="flex justify-between text-[10px] mt-4 font-bold">
                        <span>رقم الطلب: #{lastOrder?.id || '---'}</span>
                        <span>التاريخ: {new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                </div>

                <div className="space-y-2 mb-4">
                    {items.map((item) => (
                        <div key={item.id} className="text-xs font-bold py-1 border-b border-gray-100">
                            <div className="flex justify-between">
                                <span>{item.name} x {item.quantity}</span>
                                <span>{(item.price * item.quantity).toFixed(2)} د.ل</span>
                            </div>
                            {item.notes && (
                                <div className="text-[10px] text-gray-600 font-normal pr-1">
                                    * ملاحظة: {item.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="border-t pt-2 space-y-1" style={{ borderColor: '#eee' }}>
                    <div className="flex justify-between text-xs font-bold">
                        <span>المجموع الفرعي:</span>
                        <span>{subtotal.toFixed(2)} د.ل</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-1 border-t mt-1" style={{ borderColor: '#eee' }}>
                        <span>الإجمالي التام:</span>
                        <span>{total.toFixed(2)} د.ل</span>
                    </div>
                </div>

                <div className="mt-8 text-center text-[10px] font-bold border-t pt-4" style={{ borderColor: '#eee' }}>
                    <p>شكراً لزيارتكم!</p>
                    <p className="mt-1 opacity-50">نظام إدارة المطاعم الذكي</p>
                </div>
            </div>

            <ShiftModal
                isOpen={showShiftModal}
                onClose={() => {
                    if (shiftMode === 'open' && !activeShift) {
                        return;
                    }
                    setShowShiftModal(false);
                }}
                mode={shiftMode}
                onSuccess={() => {
                    checkCurrentShift();
                }}
            />

            <ExpenseModal
                isOpen={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
            />
        </div>
    );

    // Business Logic Handlers
    async function handleCheckout(method: 'cash' | 'card' | 'debt', cardProvider?: string, transactionId?: string, debtDetails?: string) {
        if (!activeShift) {
            alert('يرجى فتح وردية أولاً قبل البدء في المبيعات.');
            setShiftMode('open');
            setShowShiftModal(true);
            return;
        }

        if (items.length === 0 && !currentOrder) {
            alert('يرجى إضافة أصناف إلى السلة أولاً');
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

            setShowSuccessModal(true);
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
            alert(`فشل إتمام العملية: ${msg}`);
        } finally {
            setIsProcessingCheckout(false);
        }
    }

    async function handlePrintInvoice() {
        if (!activeShift) {
            alert('يرجى فتح وردية أولاً قبل البدء في المبيعات.');
            setShiftMode('open');
            setShowShiftModal(true);
            return;
        }

        if (items.length === 0) return;

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

            setTimeout(() => {
                window.print();
            }, 500);
        } catch (err: any) {
            console.error('Failed to issue invoice', err);
            const msg = err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إصدار الفاتورة';
            if (typeof msg === 'string' && msg.includes('وردية')) {
                setShiftMode('open');
                setShowShiftModal(true);
            }
            alert(`حدث خطأ أثناء إصدار الفاتورة: ${msg}`);
        }
    }

    async function handleHoldOrder() {
        if (!activeShift) {
            alert('يرجى فتح وردية أولاً قبل البدء في المبيعات وحفظ الطلبات المعلقة.');
            setShiftMode('open');
            setShowShiftModal(true);
            return;
        }

        if (items.length === 0) {
            alert('يرجى إضافة أصناف إلى السلة أولاً لوضع الطلب في الانتظار (طلب معلق)');
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
            alert(`تم حفظ الطلب رقم #${created.id} كطلب معلق بنجاح!`);
        } catch (err: any) {
            console.error('Failed to hold order', err);
            const msg = err?.response?.data?.message || err?.message || 'حدث خطأ أثناء تعليق الطلب';
            if (typeof msg === 'string' && msg.includes('وردية')) {
                setShiftMode('open');
                setShowShiftModal(true);
            }
            alert(`فشل حفظ الطلب المعلق: ${msg}`);
        } finally {
            setIsProcessingHold(false);
        }
    }

    async function handleCancelActiveOrder(orderId: number) {
        if (!confirm(`هل أنت متأكد من رغبتك في إلغاء الطلب المعلق رقم #${orderId}؟`)) return;
        try {
            await orderService.updateOrder(orderId, { status: 'cancelled' });
            await fetchActiveOrders();
        } catch (err: any) {
            console.error('Failed to cancel active order', err);
            alert('فشل إلغاء الطلب المعلق');
        }
    }
}
