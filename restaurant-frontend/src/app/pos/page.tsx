'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Sidebar, Modal, ShiftModal, ExpenseModal } from '@/components';
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
    Image as ImageIcon,
    CheckCircle,
    AlertCircle,
    Clock,
    User,
    PauseCircle,
    ChevronDown,
    FileText,
    X
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

    const [activeCategory, setActiveCategory] = useState('الكل');
    const [searchQuery, setSearchQuery] = useState('');
    const [isClient, setIsClient] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>(['الكل']);
    const [lastOrder, setLastOrder] = useState<any>(null);
    const [invoiceIssued, setInvoiceIssued] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [tables, setTables] = useState<Table[]>([]);
    const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('takeaway');
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [shiftMode, setShiftMode] = useState<'open' | 'close'>('open');
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    // Active orders state
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [showActiveOrdersModal, setShowActiveOrdersModal] = useState(false);

    // Card payment modal state
    const [showCardModal, setShowCardModal] = useState(false);
    const [selectedCardProvider, setSelectedCardProvider] = useState<string>('تداول');
    const [customCardProvider, setCustomCardProvider] = useState('');
    const [cardTransactionId, setCardTransactionId] = useState('');

    // Debt payment modal state
    const [showDebtModal, setShowDebtModal] = useState(false);
    const [debtCustomerName, setDebtCustomerName] = useState('');
    const [debtNotes, setDebtNotes] = useState('');
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
    const [isProcessingHold, setIsProcessingHold] = useState(false);
    const [editingNoteItemId, setEditingNoteItemId] = useState<number | null>(null);
    const [tempNoteText, setTempNoteText] = useState('');

    const { activeShift, setActiveShift } = useAuthStore();

    const { subtotal, taxAmount, total } = getTotals();

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        } else {
            fetchData();
            checkCurrentShift();
        }
    }, [isLoggedIn, router]);

    // Check if an orderId or tableId was passed in URL query to load into POS
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
            setCategories(['الكل', ...categoriesData.map(c => c.name)]);
            setTables(tablesData);
            fetchActiveOrders();

            // Sanitize localStorage cart: remove items whose IDs no longer exist in the database
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

    const filteredItems = menuItems.filter(item =>
        (activeCategory === 'الكل' || item.category?.name === activeCategory) &&
        item.name.includes(searchQuery)
    );

    return (
        <div className="flex bg-background dark:bg-background min-h-screen transition-colors duration-300" dir="rtl">
            <style jsx global>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    /* Base reset for printing */
                    body {
                        visibility: hidden;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white !important;
                    }
                    /* Hide everything else */
                    .no-print, main, aside, nav {
                        display: none !important;
                    }
                    /* The receipt container */
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
                    /* Ensure all children are visible and black */
                    #printable-receipt * {
                        visibility: visible !important;
                        color: black !important;
                    }
                }
            `}</style>
            <Sidebar className="no-print" />

            <main className={`flex-1 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-80'} min-h-screen flex flex-col xl:flex-row gap-6 p-6 lg:p-8 transition-all duration-300`}>
                {/* Menu Section */}
                <section className="flex-1 space-y-6">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                                <Utensils className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">نقطة البيع</h1>
                                <p className="text-gray-400 dark:text-gray-500 text-[13px] font-bold opacity-70">المبيعات المباشرة</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    fetchActiveOrders();
                                    setShowActiveOrdersModal(true);
                                }}
                                className="relative flex items-center gap-2 bg-card dark:bg-card border border-gray-200/80 dark:border-gray-800 hover:border-emerald-500 px-4 py-2 rounded-xl text-xs font-black text-gray-700 dark:text-gray-300 transition-all shadow-sm group active:scale-95"
                            >
                                <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                                <span>الطلبيات النشطة والمعلقة</span>
                                {activeOrders.length > 0 && (
                                    <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                        {activeOrders.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </header>

                    {/* Search and Filters */}
                    <div className="relative group">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="بحث عن منتج..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 bg-card dark:bg-card border border-gray-100 dark:border-gray-800/40 shadow-sm rounded-xl pr-11 pl-4 text-sm font-bold transition-all outline-none focus:ring-2 focus:ring-emerald-600/10"
                        />
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-5 py-2 rounded-xl font-black text-xs transition-all shadow-sm border ${activeCategory === cat
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-card dark:bg-card text-gray-500 border-gray-100 dark:border-gray-800/40 hover:text-emerald-600'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Items Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 hover:shadow-xl transition-all group cursor-pointer active:scale-95 overflow-hidden flex flex-col"
                                onClick={() => addItem({
                                    id: item.id,
                                    name: item.name,
                                    price: item.price,
                                    image_url: item.image_url,
                                    category: item.category?.name
                                })}
                            >
                                <div className="w-full h-44 bg-gray-50/50 dark:bg-gray-900/40 relative overflow-hidden ring-1 ring-gray-100 dark:ring-gray-800">
                                    {item.image_url ? (
                                        <img
                                            src={getFullUrl(item.image_url)}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Utensils className="w-10 h-10 text-gray-200 dark:text-gray-800" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 bg-emerald-600/90 backdrop-blur-md px-3 py-1 rounded-lg shadow-lg">
                                        <span className="text-white font-black text-xs tabular-nums">{item.price} د.ل</span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-sm font-black text-gray-900 dark:text-gray-200 truncate mb-1">{item.name}</h3>
                                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">{item.category?.name || 'عام'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Cart Section - Perfectly Balanced & Spacious */}
                <section className="w-full xl:w-[415px] 2xl:w-[450px] shrink-0 bg-card dark:bg-card rounded-3xl shadow-xl dark:shadow-none border border-gray-100 dark:border-gray-800/40 flex flex-col h-[calc(100vh-6rem)] sticky top-8 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800/40 flex justify-between items-center bg-gray-50/40 dark:bg-gray-900/30">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 shadow-sm">
                                <ShoppingBag className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                                    السلة
                                </h2>
                                <span className="text-[11px] font-bold text-gray-400">
                                    {items.reduce((sum, it) => sum + it.quantity, 0)} أصناف مضافة
                                </span>
                            </div>
                        </div>
                        {items.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                                title="تفريغ السلة بالكامل"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>تفريغ السلة</span>
                            </button>
                        )}
                    </div>

                    {/* Cart Items & Configuration Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                        {/* Order Type Selection */}
                        <div className="flex gap-2 bg-gray-50/70 dark:bg-gray-950/50 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800/30">
                            <button
                                onClick={() => setOrderType('takeaway')}
                                className={`flex-1 h-10 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 ${orderType === 'takeaway'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'text-gray-500 hover:text-emerald-600 hover:bg-white/60 dark:hover:bg-gray-900/60'
                                    }`}
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span>طلب سفري</span>
                            </button>
                            <button
                                onClick={() => setOrderType('dine_in')}
                                className={`flex-1 h-10 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 ${orderType === 'dine_in'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'text-gray-500 hover:text-emerald-600 hover:bg-white/60 dark:hover:bg-gray-900/60'
                                    }`}
                            >
                                <Utensils className="w-4 h-4" />
                                <span>طلب محلي (صالة)</span>
                            </button>
                        </div>

                        {/* Table Selection Dropdown - Expanded, Spacious & Clear */}
                        {orderType === 'dine_in' && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-500/30">
                                <label className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>اختر طاولة الصالة</span>
                                    </span>
                                    {selectedTableId && (
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-black bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                                            طاولة محددة
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedTableId || ''}
                                        onChange={(e) => setSelectedTableId(parseInt(e.target.value))}
                                        className="w-full h-11 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800/60 rounded-xl pr-3.5 pl-9 text-xs md:text-sm font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-600/30 shadow-sm appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>اضغط هنا لاختيار الطاولة من القائمة...</option>
                                        {tables.map(table => (
                                            <option key={table.id} value={table.id}>
                                                طاولة رقم {table.table_number} ({table.capacity} مقاعد) {table.location ? `- ${table.location}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Items List inside Cart - Expanded & Spacious */}
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-14 opacity-40">
                                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center mb-2.5">
                                    <ShoppingBag className="text-gray-400 dark:text-gray-500 w-8 h-8" />
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 font-black text-sm">السلة فارغة</p>
                                <p className="text-gray-400 dark:text-gray-500 font-bold text-xs mt-0.5">اضغط على الأصناف لإضافتها هنا</p>
                            </div>
                        ) : (
                            items.map((item) => {
                                const isEditingNote = editingNoteItemId === item.id;
                                const itemTotal = (item.price * item.quantity).toFixed(2);
                                return (
                                    <div
                                        key={item.id}
                                        className="group bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all flex flex-col gap-2.5"
                                    >
                                        {/* Top Section: Thumbnail + Name & Badges + Prominent Total Price */}
                                        <div className="flex items-start gap-3">
                                            {/* Thumbnail Image */}
                                            <div className="w-13 h-13 md:w-14 md:h-14 rounded-xl overflow-hidden shrink-0 bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 relative flex items-center justify-center shadow-inner">
                                                {item.image_url ? (
                                                    <img
                                                        src={getFullUrl(item.image_url)}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <Utensils className="w-6 h-6 text-emerald-600/70 dark:text-emerald-400/60" />
                                                )}
                                            </div>

                                            {/* Name & Pricing Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-black text-sm md:text-base text-gray-900 dark:text-gray-100 leading-snug break-words">
                                                        {item.name}
                                                    </h4>
                                                    {/* Prominent Line Total */}
                                                    <div className="text-left shrink-0">
                                                        <span className="text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                            {itemTotal} <span className="text-[10px] font-bold">د.ل</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    {item.category && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                            {item.category}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-bold tabular-nums">
                                                        {item.quantity > 1 ? `${item.price.toFixed(2)} د.ل × ${item.quantity}` : `${item.price.toFixed(2)} د.ل للقطعة`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Kitchen Note Display */}
                                        {item.notes && !isEditingNote && (
                                            <div className="flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl px-2.5 py-1.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                    <span className="font-bold truncate">{item.notes}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setEditingNoteItemId(item.id);
                                                        setTempNoteText(item.notes || '');
                                                    }}
                                                    className="text-[11px] font-black text-amber-700 dark:text-amber-300 hover:underline shrink-0"
                                                >
                                                    تعديل
                                                </button>
                                            </div>
                                        )}

                                        {/* Inline Note Editor */}
                                        {isEditingNote && (
                                            <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/70 rounded-xl space-y-2 animate-in fade-in duration-200">
                                                <div className="flex items-center justify-between text-xs font-black text-amber-900 dark:text-amber-200">
                                                    <span>ملاحظة للمطبخ / تجهيز الطلب:</span>
                                                    <button
                                                        onClick={() => setEditingNoteItemId(null)}
                                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="مثال: بدون بصل، زيادة شطة، كاتشب خارجي..."
                                                    value={tempNoteText}
                                                    onChange={(e) => setTempNoteText(e.target.value)}
                                                    className="w-full h-8 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/30"
                                                    autoFocus
                                                />
                                                {/* One-touch common tags */}
                                                <div className="flex flex-wrap gap-1">
                                                    {['بدون بصل', 'شطة حارة', 'بدون مايونيز', 'سفري ومغلف', 'صوص إضافي', 'مستوي زيادة'].map(tag => (
                                                        <button
                                                            key={tag}
                                                            type="button"
                                                            onClick={() => setTempNoteText(prev => prev ? `${prev}، ${tag}` : tag)}
                                                            className="text-[10px] font-bold bg-white dark:bg-gray-900 text-amber-800 dark:text-amber-300 border border-amber-200/90 dark:border-amber-800/80 px-2 py-0.5 rounded-md hover:bg-amber-100/70 transition-all active:scale-95"
                                                        >
                                                            + {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex justify-end gap-1.5 pt-1">
                                                    <button
                                                        onClick={() => {
                                                            updateItemNotes(item.id, '');
                                                            setEditingNoteItemId(null);
                                                        }}
                                                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                                    >
                                                        مسح
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            updateItemNotes(item.id, tempNoteText.trim());
                                                            setEditingNoteItemId(null);
                                                        }}
                                                        className="px-3 py-1 text-[11px] font-black bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all shadow-sm active:scale-95"
                                                    >
                                                        حفظ الملاحظة
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bottom Action Bar: Quantity Stepper (LTR) + Note Button + Delete */}
                                        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-gray-800/60">
                                            {/* Stepper with LTR direction for consistent [-] [qty] [+] order */}
                                            <div className="flex items-center bg-gray-100/90 dark:bg-gray-800/90 rounded-xl p-1 border border-gray-200/60 dark:border-gray-700/60 shadow-inner" dir="ltr">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-rose-600 hover:bg-white dark:hover:bg-gray-700 transition-all active:scale-90 shadow-none hover:shadow-sm"
                                                    title={item.quantity === 1 ? 'حذف من السلة' : 'تقليل الكمية'}
                                                >
                                                    {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-500" /> : <Minus className="w-3.5 h-3.5" />}
                                                </button>
                                                <span className="font-black text-gray-900 dark:text-white text-sm md:text-base min-w-[2rem] text-center tabular-nums">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold transition-all active:scale-90 shadow-sm"
                                                    title="زيادة الكمية"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1.5">
                                                {/* Add Note Button */}
                                                {!item.notes && !isEditingNote && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingNoteItemId(item.id);
                                                            setTempNoteText('');
                                                        }}
                                                        className="h-8 px-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-amber-600 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                                                        title="إضافة ملاحظة خاصة بهذا الصنف للمطبخ"
                                                    >
                                                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                                                        <span>ملاحظة</span>
                                                    </button>
                                                )}

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition-all active:scale-95"
                                                    title="حذف هذا الصنف من السلة"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Totals Section */}
                    <div className="p-4 bg-gray-50/60 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800/50 space-y-3">
                        <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 font-bold text-xs">
                            <span>المجموع الفرعي:</span>
                            <span className="tabular-nums font-black text-gray-700 dark:text-gray-200 text-xs md:text-sm">{subtotal.toFixed(2)} د.ل</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2.5 border-t border-gray-200/80 dark:border-gray-800/60">
                            <span className="text-sm font-black text-gray-900 dark:text-white">المبلغ الإجمالي</span>
                            <span className="text-xl md:text-2xl font-black text-emerald-600 tabular-nums">
                                {total.toFixed(2)} <span className="text-xs not-italic font-bold text-gray-400 mr-1">د.ل</span>
                            </span>
                        </div>

                        {/* 3 Payment Methods - Compact & Clear */}
                        <div className="grid grid-cols-3 gap-2 mt-2.5">
                            <button
                                onClick={() => handleCheckout('cash')}
                                disabled={isProcessingCheckout || isProcessingHold}
                                className="flex flex-col items-center justify-center h-12 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl font-black transition-all text-[11px] border border-gray-200/80 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 active:scale-95 disabled:opacity-50 shadow-sm"
                            >
                                <Banknote className="w-4 h-4 mb-0.5 text-emerald-600" />
                                <span>نقدي</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (items.length === 0 && !currentOrder) {
                                        alert('يرجى إضافة أصناف إلى السلة أولاً');
                                        return;
                                    }
                                    setShowCardModal(true);
                                }}
                                disabled={isProcessingCheckout || isProcessingHold}
                                className="flex flex-col items-center justify-center h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-600/20 transition-all text-[11px] active:scale-95 disabled:opacity-50"
                            >
                                <CreditCard className="w-4 h-4 mb-0.5" />
                                <span>بطاقة</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (items.length === 0 && !currentOrder) {
                                        alert('يرجى إضافة أصناف إلى السلة أولاً');
                                        return;
                                    }
                                    setShowDebtModal(true);
                                }}
                                disabled={isProcessingCheckout || isProcessingHold}
                                className="flex flex-col items-center justify-center h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black shadow-md shadow-amber-500/20 transition-all text-[11px] active:scale-95 disabled:opacity-50"
                            >
                                <Clock className="w-4 h-4 mb-0.5" />
                                <span>آجل</span>
                            </button>
                        </div>

                        {/* Hold / Pending Order Button */}
                        <button
                            onClick={handleHoldOrder}
                            disabled={items.length === 0 || isProcessingHold || isProcessingCheckout}
                            className="w-full h-10 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            title="حفظ الطلب كطلب معلق في النظام لفتحه وسداده لاحقاً"
                        >
                            {isProcessingHold ? (
                                <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <PauseCircle className="w-4 h-4 text-amber-600" />
                            )}
                            <span>{isProcessingHold ? 'جاري الحفظ...' : 'حفظ كطلب معلق (سداد لاحقاً)'}</span>
                        </button>

                        <button
                            onClick={() => handlePrintInvoice()}
                            className="w-full h-10 border border-dashed border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-emerald-600 hover:border-emerald-600 font-black rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs no-print"
                        >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>إصدار وطباعة فاتورة</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-gray-100 dark:border-gray-800/30">
                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="h-8.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-[10px] font-black transition-all"
                            >
                                تسجيل مصروفات
                            </button>
                            <button
                                onClick={() => {
                                    setShiftMode('close');
                                    setShowShiftModal(true);
                                }}
                                className="h-8.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/40 rounded-lg text-[10px] font-black transition-all"
                            >
                                إغلاق الوردية
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Hidden Printable Receipt */}
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

            {/* Success Modal */}
            <Modal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    clearCart();
                    router.push('/orders');
                }}
                title="تم إتمام العملية"
            >
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mb-4 animate-bounce">
                        <CheckCircle className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">تمت عملية البيع بنجاح!</h3>
                    <p className="text-gray-500 font-bold text-sm mb-6">تم تسجيل الدفع وتحديث حالة الطلب بنجاح.</p>
                    <button
                        onClick={() => {
                            setShowSuccessModal(false);
                            clearCart();
                            router.push('/orders');
                        }}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                        حسنًا
                    </button>
                </div>
            </Modal>

            {/* Warning Modal */}
            <Modal
                isOpen={showWarningModal}
                onClose={() => setShowWarningModal(false)}
                title="تنبيه"
            >
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <AlertCircle className="w-12 h-12 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">إصدار فاتورة مطلوب</h3>
                    <p className="text-gray-500 font-bold text-sm mb-6">يرجى إصدار فاتورة أولاً قبل إتمام عملية الدفع.</p>
                    <button
                        onClick={() => setShowWarningModal(false)}
                        className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black shadow-lg shadow-amber-600/20 transition-all active:scale-95"
                    >
                        فهمت
                    </button>
                </div>
            </Modal>

            {/* Card Provider Modal */}
            <Modal
                isOpen={showCardModal}
                onClose={() => setShowCardModal(false)}
                title="الدفع بالبطاقة المصرفية"
            >
                <div className="space-y-4 py-2">
                    <div>
                        <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-2">اختر خدمة البطاقة / الدفع الإلكتروني</label>
                        <div className="grid grid-cols-2 gap-2.5">
                            {['تداول', 'إدفع لي', 'سداد', 'موبي كاش', 'أخرى'].map((provider) => (
                                <button
                                    key={provider}
                                    type="button"
                                    onClick={() => setSelectedCardProvider(provider)}
                                    className={`py-3 px-4 rounded-xl text-xs font-black border transition-all flex items-center justify-between ${
                                        selectedCardProvider === provider
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-600 ring-2 ring-emerald-500/20'
                                            : 'bg-card dark:bg-card border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                    }`}
                                >
                                    <span>{provider}</span>
                                    {selectedCardProvider === provider && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedCardProvider === 'أخرى' && (
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 mb-1 block">اسم خدمة البطاقة</label>
                            <input
                                type="text"
                                placeholder="مثال: يسر، بطاقة محلية..."
                                value={customCardProvider}
                                onChange={(e) => setCustomCardProvider(e.target.value)}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-[11px] font-bold text-gray-500 mb-1 block">رقم المعاملة / الإيصال (اختياري)</label>
                        <input
                            type="text"
                            placeholder="رقم المعاملة من جهاز POS..."
                            value={cardTransactionId}
                            onChange={(e) => setCardTransactionId(e.target.value)}
                            className="w-full h-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400">إجمالي المبلغ:</span>
                        <span className="text-lg font-black text-emerald-600 tabular-nums">{total.toFixed(2)} د.ل</span>
                    </div>

                    <button
                        onClick={() => {
                            const provider = selectedCardProvider === 'أخرى' ? (customCardProvider.trim() || 'أخرى') : selectedCardProvider;
                            setShowCardModal(false);
                            handleCheckout('card', provider, cardTransactionId);
                        }}
                        disabled={isProcessingCheckout}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95 text-xs disabled:opacity-50"
                    >
                        {isProcessingCheckout ? 'جاري الدفع...' : 'تأكيد الدفع بالبطاقة'}
                    </button>
                </div>
            </Modal>

            {/* Debt Modal (آجل / ذمم) */}
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
                        <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">اسم العميل أو الجهة (اختياري)</label>
                        <input
                            type="text"
                            placeholder="مثال: شركة النماء / الأستاذ أحمد..."
                            value={debtCustomerName}
                            onChange={(e) => setDebtCustomerName(e.target.value)}
                            className="w-full h-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-gray-500 mb-1 block">رقم الهاتف أو ملاحظات الآجل (اختياري)</label>
                        <input
                            type="text"
                            placeholder="رقم الهاتف أو بيان الذمة..."
                            value={debtNotes}
                            onChange={(e) => setDebtNotes(e.target.value)}
                            className="w-full h-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400">إجمالي المبلغ الآجل:</span>
                        <span className="text-lg font-black text-amber-600 tabular-nums">{total.toFixed(2)} د.ل</span>
                    </div>

                    <button
                        onClick={() => {
                            setShowDebtModal(false);
                            const info = debtCustomerName.trim() ? `${debtCustomerName.trim()}${debtNotes.trim() ? ' - ' + debtNotes.trim() : ''}` : debtNotes.trim();
                            handleCheckout('debt', undefined, undefined, info);
                        }}
                        disabled={isProcessingCheckout}
                        className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black shadow-lg shadow-amber-600/20 transition-all active:scale-95 text-xs disabled:opacity-50"
                    >
                        {isProcessingCheckout ? 'جاري التسجيل...' : 'تأكيد تسجيل الدفع الآجل'}
                    </button>
                </div>
            </Modal>

            {/* Active Orders Modal */}
            <Modal
                isOpen={showActiveOrdersModal}
                onClose={() => setShowActiveOrdersModal(false)}
                title="الطلبيات النشطة والمعلقة"
            >
                <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
                    {activeOrders.length === 0 ? (
                        <div className="p-6 text-center bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-2">
                            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Clock className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-black text-gray-800 dark:text-gray-200">لا توجد طلبيات معلقة حالياً</h4>
                            <p className="text-xs text-gray-500 font-bold max-w-sm mx-auto leading-relaxed">
                                لوضع أي طلب في الانتظار: أضف الأصناف إلى السلة، ثم اضغط على زر <span className="text-amber-600 font-black">"حفظ كطلب معلق (سداد لاحقاً)"</span>. سيظهر هنا ويمكنك تحميله وسداده بأي وقت.
                            </p>
                        </div>
                    ) : (
                        activeOrders.map((ord) => (
                            <div
                                key={ord.id}
                                className="p-3.5 bg-gray-50/70 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-all"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-black text-gray-900 dark:text-white text-xs">#{ord.id}</span>
                                        <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded">
                                            {ord.table_number || 'سفري'}
                                        </span>
                                        <span className="text-gray-400 text-[10px]">
                                            {new Date(ord.order_date_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 truncate">
                                        {ord.items.map(i => `${i.menu_item?.name || 'صنف'} (${i.quantity})`).join('، ')}
                                    </div>
                                    <div className="text-xs font-black text-emerald-600 mt-1">
                                        {ord.total_amount} د.ل
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            loadOrderIntoPOS(ord);
                                            setShowActiveOrdersModal(false);
                                        }}
                                        className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/15 transition-all active:scale-95 whitespace-nowrap flex items-center gap-1.5"
                                    >
                                        <span>تحميل وسداد</span>
                                    </button>
                                    <button
                                        onClick={() => handleCancelActiveOrder(ord.id)}
                                        className="h-9 w-9 flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-200/50 dark:border-rose-900/30 transition-all"
                                        title="إلغاء الطلب المعلق"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

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

            // If order was not created yet, create it automatically!
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

            // Record payment
            await paymentService.recordPayment({
                order_id: orderToPay.id,
                amount: total,
                payment_method: method === 'card' ? 'credit_card' : method === 'debt' ? 'debt' : 'cash',
                card_provider: method === 'card' ? (cardProvider || 'تداول') : undefined,
                transaction_id: transactionId || (debtDetails ? `آجل: ${debtDetails}` : undefined)
            });

            // Update order status to completed
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
            alert(`تم حفظ الطلب رقم #${created.id} كطلب معلق بنجاح! يمكنك فتحه ومتابعته في أي وقت من زر "الطلبيات النشطة والمعلقة".`);
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
