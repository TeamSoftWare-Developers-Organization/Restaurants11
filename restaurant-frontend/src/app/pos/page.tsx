'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Sidebar, Modal, ShiftModal, ExpenseModal } from '@/components';
import AIRecommendations from '@/components/pos/AIRecommendations';
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
    Barcode
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
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const [isClient, setIsClient] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
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

    const { activeShift, setActiveShift } = useAuthStore();
    const { subtotal, total } = getTotals();

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        } else {
            fetchData();
            checkCurrentShift();
        }
    }, [isLoggedIn, router]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
                return;
            }
            if (barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
                barcodeInputRef.current.focus();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, []);

    useEffect(() => {
        if (barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
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
        } else {
            alert(`لم يتم العثور على صنف برمز الباركود: ${cleanCode}`);
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
        <div className="flex bg-gray-50/50 dark:bg-[#0b0f19] min-h-screen transition-colors duration-300" dir="rtl">
            <style jsx global>{`
                @media print {
                    @page { size: 80mm auto; margin: 0; }
                    body { visibility: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
                    .no-print, main, aside, nav { display: none !important; }
                    #printable-receipt { visibility: visible !important; display: block !important; position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white !important; color: black !important; }
                    #printable-receipt * { visibility: visible !important; color: black !important; }
                }
            `}</style>
            
            <Sidebar className="no-print" />

            <main className={`flex-1 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-64'} min-h-screen flex flex-col xl:flex-row gap-4 p-3 md:p-6 transition-all duration-300`}>
                
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
                <section className={`flex-1 space-y-4 ${mobileTab === 'cart' ? 'hidden xl:flex xl:flex-col' : 'flex flex-col'}`}>
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/60">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                                <Utensils className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-base md:text-lg font-black text-gray-900 dark:text-white leading-tight">نقطة البيع</h1>
                                <p className="text-gray-400 dark:text-gray-400 text-[11px] font-semibold">المبيعات المباشرة</p>
                            </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative group shadow-sm md:col-span-2">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 group-focus-within:scale-110 transition-transform" />
                            <input
                                type="text"
                                placeholder="ابحث عن اسم الوجبة أو المنتج هنا..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 md:h-12 bg-white dark:bg-[#111827] border-2 border-gray-100 dark:border-gray-800/80 hover:border-emerald-500/50 focus:border-emerald-600 rounded-2xl pr-12 pl-4 text-xs md:text-sm font-bold transition-all outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:text-rose-500"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleBarcodeSubmit} className="relative group shadow-sm">
                            <Barcode className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600 group-focus-within:scale-110 transition-transform" />
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                placeholder="مسح الباركود للإضافة الفورية..."
                                value={barcodeQuery}
                                onChange={(e) => setBarcodeQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        processBarcode(barcodeQuery);
                                    }
                                }}
                                className="w-full h-11 md:h-12 bg-white dark:bg-[#111827] border-2 border-indigo-100 dark:border-indigo-950/60 hover:border-indigo-500/50 focus:border-indigo-600 rounded-2xl pr-12 pl-4 text-xs md:text-sm font-bold transition-all outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                            />
                        </form>
                    </div>

                    {!selectedCategoryName ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>اختر القسم لعرض المنتجات</span>
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                                <div
                                    onClick={() => setSelectedCategoryName('الكل')}
                                    className="cursor-pointer bg-white dark:bg-[#111827] rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800/60 hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col items-center justify-center text-center gap-2.5 group active:scale-95"
                                >
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Grid className="w-6 h-6 md:w-7 md:h-7" />
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-gray-800 dark:text-gray-200">الكل</span>
                                </div>

                                {categories.map((cat) => {
                                    const categoryImage = (cat as any)?.image_url;

                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => setSelectedCategoryName(cat.name)}
                                            className="cursor-pointer bg-white dark:bg-[#111827] rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800/60 hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col items-center justify-center text-center gap-2.5 group active:scale-95 overflow-hidden"
                                        >
                                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 text-emerald-600 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
                                                {categoryImage ? (
                                                    <img src={getFullUrl(categoryImage)} alt={cat.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Utensils className="w-6 h-6 md:w-7 md:h-7" />
                                                )}
                                            </div>
                                            <span className="text-xs md:text-sm font-black text-gray-800 dark:text-gray-200 truncate w-full">{cat.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                                <div
                                    onClick={() => setSelectedCategoryName(null)}
                                    className="bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl shadow-xs border border-dashed border-emerald-500/65 hover:border-emerald-600 hover:shadow-sm transition-all group cursor-pointer active:scale-95 overflow-hidden flex flex-col items-center justify-center p-3 text-center"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shadow-sm shadow-emerald-600/20">
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-[11px] font-black text-emerald-900 dark:text-emerald-200 mb-0.5">الخروج للأقسام</h3>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[8px]">العودة للقائمة الرئيسية</p>
                                </div>

                                {filteredItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white dark:bg-[#111827] rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800/60 hover:shadow-md transition-all group cursor-pointer active:scale-95 overflow-hidden flex flex-col"
                                        onClick={() => addItem({
                                            id: item.id,
                                            name: item.name,
                                            price: item.price,
                                            image_url: item.image_url,
                                            category: item.category?.name
                                        })}
                                    >
                                        <div className="w-full h-28 sm:h-24 bg-gray-50/50 dark:bg-gray-900/40 relative overflow-hidden">
                                            {item.image_url ? (
                                                <img
                                                    src={getFullUrl(item.image_url)}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Utensils className="w-6 h-6 text-gray-200 dark:text-gray-800" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2 bg-emerald-600/95 backdrop-blur-md px-2 py-0.5 rounded-md shadow-xs">
                                                <span className="text-white font-black text-[11px] tabular-nums">{item.price} د.ل</span>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="text-xs font-black text-gray-900 dark:text-gray-200 truncate mb-0.5">{item.name}</h3>
                                            <p className="text-gray-400 font-bold text-[9px] uppercase tracking-wider">{item.category?.name || 'عام'}</p>
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
                <section className={`w-full xl:w-[380px] shrink-0 bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/60 flex flex-col h-[calc(100vh-7rem)] xl:h-[calc(100vh-3rem)] sticky top-3 xl:top-6 overflow-hidden ${mobileTab === 'menu' ? 'hidden xl:flex' : 'flex'}`}>
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/60 flex justify-between items-center bg-gray-50/40 dark:bg-gray-800/30">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 shadow-sm">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                                    السلة
                                </h2>
                                <span className="text-[10px] font-bold text-gray-400">
                                    {items.reduce((sum, it) => sum + it.quantity, 0)} أصناف مضافة
                                </span>
                            </div>
                        </div>
                        {items.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                                title="تفريغ السلة بالكامل"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>تفريغ</span>
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        <div className="flex gap-1.5 bg-gray-50/70 dark:bg-gray-800/40 p-1 rounded-xl border border-gray-100 dark:border-gray-800/60">
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
                            <div className="space-y-1 bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20">
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
                                        className="w-full h-9 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800/60 rounded-lg pr-3 pl-8 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-emerald-600/30 shadow-sm appearance-none cursor-pointer"
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
                            <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-40">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                                    <ShoppingBag className="text-gray-400 w-6 h-6" />
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 font-black text-xs">السلة فارغة</p>
                                <p className="text-gray-400 font-bold text-[10px] mt-0.5">امسح بالباركود أو اضغط على الأصناف</p>
                            </div>
                        ) : (
                            items.map((item) => {
                                const isEditingNote = editingNoteItemId === item.id;
                                const itemTotal = (item.price * item.quantity).toFixed(2);
                                return (
                                    <div
                                        key={item.id}
                                        className="group bg-gray-50/50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/60 hover:border-emerald-500/40 transition-all flex flex-col gap-2"
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/50 flex items-center justify-center shadow-xs">
                                                {item.image_url ? (
                                                    <img src={getFullUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Utensils className="w-5 h-5 text-emerald-600/70" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <h4 className="font-black text-xs text-gray-900 dark:text-gray-100 truncate">
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
                                                        {item.price.toFixed(2)} د.ل
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
                                            <div className="flex items-center bg-white dark:bg-gray-900 rounded-xl p-1 border border-gray-200/80 dark:border-gray-700/60 shadow-sm" dir="ltr">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold"
                                                >
                                                    {item.quantity === 1 ? <Trash2 className="w-4 h-4 text-rose-500" /> : <Minus className="w-4 h-4" />}
                                                </button>
                                                <span className="font-black text-gray-900 dark:text-white text-sm min-w-[2rem] text-center tabular-nums">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold transition-all shadow-xs"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {!item.notes && !isEditingNote && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingNoteItemId(item.id);
                                                            setTempNoteText('');
                                                        }}
                                                        className="h-8 px-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:text-amber-600 hover:border-amber-400 text-xs font-bold flex items-center gap-1 transition-all"
                                                    >
                                                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                                                        <span>ملاحظة</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                                                    title="حذف الصنف"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* اقتراحات ذكية تكميلية داخل السلة */}
                        <div className="pt-2">
                            <AIRecommendations compact={true} />
                        </div>
                    </div>

                    <div className="p-3.5 bg-gray-50/60 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800/60 space-y-3">
                        <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 font-bold text-xs">
                            <span>المجموع الفرعي:</span>
                            <span className="tabular-nums font-black text-gray-700 dark:text-gray-200">{subtotal.toFixed(2)} د.ل</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2 border-t border-gray-200/60 dark:border-gray-700/50">
                            <span className="text-xs font-black text-gray-900 dark:text-white">المبلغ الإجمالي</span>
                            <span className="text-xl font-black text-emerald-600 tabular-nums">
                                {total.toFixed(2)} <span className="text-xs not-italic font-bold text-gray-400 mr-0.5">د.ل</span>
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                            <button
                                onClick={() => handleCheckout('cash')}
                                disabled={isProcessingCheckout || isProcessingHold}
                                className="flex flex-col items-center justify-center h-12 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl font-black transition-all text-xs border-2 border-gray-200/80 dark:border-gray-700/60 hover:border-emerald-500 active:scale-95 disabled:opacity-50 shadow-sm"
                            >
                                <Banknote className="w-4 h-4 mb-1 text-emerald-600" />
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
                                className="flex flex-col items-center justify-center h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-md shadow-emerald-600/20 transition-all text-xs active:scale-95 disabled:opacity-50"
                            >
                                <CreditCard className="w-4 h-4 mb-1" />
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
                                className="flex flex-col items-center justify-center h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black shadow-md shadow-amber-500/20 transition-all text-xs active:scale-95 disabled:opacity-50"
                            >
                                <Clock className="w-4 h-4 mb-1" />
                                <span>آجل</span>
                            </button>
                        </div>

                        <button
                            onClick={handleHoldOrder}
                            disabled={items.length === 0 || isProcessingHold || isProcessingCheckout}
                            className="w-full h-11 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border-2 border-amber-300/60 rounded-2xl font-black flex items-center justify-center gap-2 transition-all text-xs disabled:opacity-50 shadow-sm active:scale-98"
                        >
                            {isProcessingHold ? (
                                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <PauseCircle className="w-4 h-4 text-amber-600" />
                            )}
                            <span>{isProcessingHold ? 'جاري الحفظ...' : 'حفظ كطلب معلق'}</span>
                        </button>

                        <button
                            onClick={() => handlePrintInvoice()}
                            className="w-full h-10 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-emerald-600 hover:border-emerald-600 font-black rounded-2xl flex items-center justify-center gap-1.5 transition-all text-xs no-print active:scale-98"
                        >
                            <Receipt className="w-4 h-4" />
                            <span>إصدار وطباعة فاتورة</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/50 dark:border-gray-700/40">
                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="h-9 bg-rose-50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-black transition-all"
                            >
                                تسجيل مصروفات
                            </button>
                            <button
                                onClick={() => {
                                    setShiftMode('close');
                                    setShowShiftModal(true);
                                }}
                                className="h-9 bg-amber-50 dark:bg-amber-950/20 text-amber-600 hover:bg-amber-100 rounded-xl text-xs font-black transition-all"
                            >
                                إغلاق الوردية
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {/* باقي المودالز ونظام الطباعة */}
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

            <Modal isOpen={showSuccessModal} onClose={() => { setShowSuccessModal(false); clearCart(); router.push('/orders'); }} title="تم إتمام العملية">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">تمت عملية البيع بنجاح!</h3>
                    <p className="text-gray-500 font-bold text-xs mb-5">تم تسجيل الدفع وتحديث حالة الطلب بنجاح.</p>
                    <button
                        onClick={() => { setShowSuccessModal(false); clearCart(); router.push('/orders'); }}
                        className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md transition-all text-xs"
                    >
                        حسنًا
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
            alert('يرجى إضافة أصناف إلى السلة أولاً لوضع الطلب في الانتظار');
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
            await orderService.updateOrder(orderId, { status: 'cancelled'}) ;
            await fetchActiveOrders();
        } catch (err: any) {
            console.error('Failed to cancel active order', err);
            alert('فشل إلغاء الطلب المعلق');
        }
    }
}