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
    ShoppingBag,
    ChevronLeft
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

const CATEGORY_COLORS: Record<string, { c: string; cbg: string; grad: string }> = {
    'ساخنة': { c: '#b45309', cbg: 'rgba(180, 83, 9, 0.15)', grad: 'linear-gradient(180deg, rgba(146, 64, 14, 0.88) 0%, rgba(120, 53, 15, 0.98) 100%)' },
    'قهوة': { c: '#b45309', cbg: 'rgba(180, 83, 9, 0.15)', grad: 'linear-gradient(180deg, rgba(146, 64, 14, 0.88) 0%, rgba(120, 53, 15, 0.98) 100%)' },
    'شاي': { c: '#854d0e', cbg: 'rgba(133, 77, 14, 0.15)', grad: 'linear-gradient(180deg, rgba(113, 63, 18, 0.88) 0%, rgba(84, 49, 12, 0.98) 100%)' },
    'باردة': { c: '#0284c7', cbg: 'rgba(2, 132, 199, 0.15)', grad: 'linear-gradient(180deg, rgba(3, 105, 161, 0.88) 0%, rgba(7, 89, 133, 0.98) 100%)' },
    'مشروبات': { c: '#0284c7', cbg: 'rgba(2, 132, 199, 0.15)', grad: 'linear-gradient(180deg, rgba(3, 105, 161, 0.88) 0%, rgba(7, 89, 133, 0.98) 100%)' },
    'المشروبات': { c: '#0284c7', cbg: 'rgba(2, 132, 199, 0.15)', grad: 'linear-gradient(180deg, rgba(3, 105, 161, 0.88) 0%, rgba(7, 89, 133, 0.98) 100%)' },
    'drinks': { c: '#0284c7', cbg: 'rgba(2, 132, 199, 0.15)', grad: 'linear-gradient(180deg, rgba(3, 105, 161, 0.88) 0%, rgba(7, 89, 133, 0.98) 100%)' },
    'عصائر': { c: '#15803d', cbg: 'rgba(21, 128, 61, 0.15)', grad: 'linear-gradient(180deg, rgba(21, 128, 61, 0.88) 0%, rgba(20, 83, 45, 0.98) 100%)' },
    'طبيعية': { c: '#15803d', cbg: 'rgba(21, 128, 61, 0.15)', grad: 'linear-gradient(180deg, rgba(21, 128, 61, 0.88) 0%, rgba(20, 83, 45, 0.98) 100%)' },
    'معجنات': { c: '#d97706', cbg: 'rgba(217, 119, 6, 0.15)', grad: 'linear-gradient(180deg, rgba(180, 83, 9, 0.88) 0%, rgba(120, 53, 15, 0.98) 100%)' },
    'حلويات': { c: '#7e22ce', cbg: 'rgba(126, 34, 206, 0.15)', grad: 'linear-gradient(180deg, rgba(126, 34, 206, 0.88) 0%, rgba(88, 28, 135, 0.98) 100%)' },
    'الحلويات': { c: '#7e22ce', cbg: 'rgba(126, 34, 206, 0.15)', grad: 'linear-gradient(180deg, rgba(126, 34, 206, 0.88) 0%, rgba(88, 28, 135, 0.98) 100%)' },
    'dessert': { c: '#7e22ce', cbg: 'rgba(126, 34, 206, 0.15)', grad: 'linear-gradient(180deg, rgba(126, 34, 206, 0.88) 0%, rgba(88, 28, 135, 0.98) 100%)' },
    'سندوتشات': { c: '#365314', cbg: 'rgba(54, 83, 20, 0.15)', grad: 'linear-gradient(180deg, rgba(63, 98, 18, 0.88) 0%, rgba(26, 46, 5, 0.98) 100%)' },
    'سندويتش': { c: '#365314', cbg: 'rgba(54, 83, 20, 0.15)', grad: 'linear-gradient(180deg, rgba(63, 98, 18, 0.88) 0%, rgba(26, 46, 5, 0.98) 100%)' },
    'مقبلات': { c: '#854d0e', cbg: 'rgba(133, 77, 14, 0.15)', grad: 'linear-gradient(180deg, rgba(146, 64, 14, 0.88) 0%, rgba(69, 26, 3, 0.98) 100%)' },
    'شيشة': { c: '#581c87', cbg: 'rgba(88, 28, 135, 0.15)', grad: 'linear-gradient(180deg, rgba(107, 33, 168, 0.88) 0%, rgba(59, 7, 100, 0.98) 100%)' },
    'ايس كريم': { c: '#0369a1', cbg: 'rgba(3, 105, 161, 0.15)', grad: 'linear-gradient(180deg, rgba(14, 116, 144, 0.88) 0%, rgba(21, 94, 117, 0.98) 100%)' },
    'بيتزا': { c: '#dc2626', cbg: 'rgba(220, 38, 38, 0.15)', grad: 'linear-gradient(180deg, rgba(190, 18, 60, 0.88) 0%, rgba(136, 19, 55, 0.98) 100%)' },
    'pizza': { c: '#dc2626', cbg: 'rgba(220, 38, 38, 0.15)', grad: 'linear-gradient(180deg, rgba(190, 18, 60, 0.88) 0%, rgba(136, 19, 55, 0.98) 100%)' },
    'برجر': { c: '#c2410c', cbg: 'rgba(194, 65, 12, 0.15)', grad: 'linear-gradient(180deg, rgba(234, 88, 12, 0.88) 0%, rgba(154, 52, 18, 0.98) 100%)' },
    'burger': { c: '#c2410c', cbg: 'rgba(194, 65, 12, 0.15)', grad: 'linear-gradient(180deg, rgba(234, 88, 12, 0.88) 0%, rgba(154, 52, 18, 0.98) 100%)' },
    'مشويات': { c: '#b91c1c', cbg: 'rgba(185, 28, 28, 0.15)', grad: 'linear-gradient(180deg, rgba(185, 28, 28, 0.88) 0%, rgba(127, 29, 29, 0.98) 100%)' },
    'سلطات': { c: '#15803d', cbg: 'rgba(21, 128, 61, 0.15)', grad: 'linear-gradient(180deg, rgba(21, 128, 61, 0.88) 0%, rgba(20, 83, 45, 0.98) 100%)' },
    'شاورما': { c: '#b45309', cbg: 'rgba(180, 83, 9, 0.15)', grad: 'linear-gradient(180deg, rgba(217, 119, 6, 0.88) 0%, rgba(120, 53, 15, 0.98) 100%)' },
    'وجبات': { c: '#be185d', cbg: 'rgba(190, 24, 93, 0.15)', grad: 'linear-gradient(180deg, rgba(219, 39, 119, 0.88) 0%, rgba(131, 24, 67, 0.98) 100%)' },
};

const PALETTE_FALLBACKS = [
    { c: '#0284c7', cbg: 'rgba(2, 132, 199, 0.15)', grad: 'linear-gradient(180deg, rgba(3, 105, 161, 0.88) 0%, rgba(7, 89, 133, 0.98) 100%)' },
    { c: '#b45309', cbg: 'rgba(180, 83, 9, 0.15)', grad: 'linear-gradient(180deg, rgba(146, 64, 14, 0.88) 0%, rgba(120, 53, 15, 0.98) 100%)' },
    { c: '#15803d', cbg: 'rgba(21, 128, 61, 0.15)', grad: 'linear-gradient(180deg, rgba(21, 128, 61, 0.88) 0%, rgba(20, 83, 45, 0.98) 100%)' },
    { c: '#7e22ce', cbg: 'rgba(126, 34, 206, 0.15)', grad: 'linear-gradient(180deg, rgba(126, 34, 206, 0.88) 0%, rgba(88, 28, 135, 0.98) 100%)' },
    { c: '#c2410c', cbg: 'rgba(194, 65, 12, 0.15)', grad: 'linear-gradient(180deg, rgba(234, 88, 12, 0.88) 0%, rgba(154, 52, 18, 0.98) 100%)' },
    { c: '#0e7490', cbg: 'rgba(14, 116, 144, 0.15)', grad: 'linear-gradient(180deg, rgba(14, 116, 144, 0.88) 0%, rgba(21, 94, 117, 0.98) 100%)' },
    { c: '#365314', cbg: 'rgba(54, 83, 20, 0.15)', grad: 'linear-gradient(180deg, rgba(63, 98, 18, 0.88) 0%, rgba(26, 46, 5, 0.98) 100%)' },
];

function getCategoryColor(catName?: string) {
    if (!catName) return PALETTE_FALLBACKS[0];
    const clean = catName.trim().toLowerCase();
    for (const key of Object.keys(CATEGORY_COLORS)) {
        if (clean.includes(key) || key.includes(clean)) {
            return CATEGORY_COLORS[key];
        }
    }
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
        hash = (hash << 5) - hash + clean.charCodeAt(i);
        hash |= 0;
    }
    return PALETTE_FALLBACKS[Math.abs(hash) % PALETTE_FALLBACKS.length];
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

    // Items to display, filtered by search query and ordered cleanly by category
    const displayedItems = React.useMemo(() => {
        let list = menuItems;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(item =>
                item.name.toLowerCase().includes(q) ||
                (item.category?.name && item.category.name.toLowerCase().includes(q))
            );
        }
        return [...list].sort((a, b) => {
            const catA = a.category?.name || '';
            const catB = b.category?.name || '';
            return catA.localeCompare(catB, 'ar');
        });
    }, [menuItems, searchQuery]);

    const filteredItems = displayedItems;

    const totalItemCount = items.reduce((sum, it) => sum + it.quantity, 0);

    if (!isClient || !isLoggedIn) return null;

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
                .pos-tiles-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
                    gap: 16px;
                }
                .pos-tile {
                    position: relative;
                    background: #1e293b;
                    border: 2px solid color-mix(in srgb, var(--c, #6366f1) 50%, #cbd5e1);
                    border-radius: 18px;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    cursor: pointer;
                    text-align: right;
                    font-family: inherit;
                    color: inherit;
                    box-shadow: 
                        0 0 0 1.5px color-mix(in srgb, var(--c, #6366f1) 45%, transparent),
                        0 0 20px 2px color-mix(in srgb, var(--c, #6366f1) 38%, transparent),
                        0 4px 14px rgba(0, 0, 0, 0.08);
                    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                                box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                                border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    user-select: none;
                    overflow: hidden;
                    height: 200px;
                }
                :global(.dark) .pos-tile {
                    background: #0f172a;
                    border: 2px solid color-mix(in srgb, var(--c, #6366f1) 75%, #334155);
                    box-shadow: 
                        0 0 0 1.5px color-mix(in srgb, var(--c, #6366f1) 65%, transparent),
                        0 0 28px 4px color-mix(in srgb, var(--c, #6366f1) 55%, transparent),
                        inset 0 1px 1.5px rgba(255, 255, 255, 0.25);
                }
                /* Elegant light sweep shine across card */
                .pos-tile::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: -140%;
                    width: 60%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.35),
                        transparent
                    );
                    transform: skewX(-22deg);
                    transition: left 0.7s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: none;
                    z-index: 10;
                }
                :global(.dark) .pos-tile::before {
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.18),
                        transparent
                    );
                }
                .pos-tile:hover {
                    transform: translateY(-4px) scale(1.01);
                    border-color: color-mix(in srgb, var(--c, #6366f1) 95%, #ffffff);
                    box-shadow: 
                        0 0 0 2.5px color-mix(in srgb, var(--c, #6366f1) 90%, transparent),
                        0 0 36px 6px color-mix(in srgb, var(--c, #6366f1) 70%, transparent),
                        0 14px 30px -4px rgba(0, 0, 0, 0.22);
                }
                .pos-tile:hover::before {
                    left: 180%;
                }
                :global(.dark) .pos-tile:hover {
                    border-color: color-mix(in srgb, var(--c, #6366f1) 100%, #ffffff);
                    box-shadow: 
                        0 0 0 3px color-mix(in srgb, var(--c, #6366f1) 100%, transparent),
                        0 0 48px 10px color-mix(in srgb, var(--c, #6366f1) 85%, transparent),
                        inset 0 1px 2.5px rgba(255, 255, 255, 0.5),
                        0 16px 36px -4px rgba(0, 0, 0, 0.65);
                }
                .pos-tile:active {
                    transform: scale(0.98);
                }
                .pos-tile.is-out, .pos-tile[disabled] {
                    opacity: 0.5;
                    cursor: not-allowed;
                    filter: grayscale(0.5);
                    box-shadow: none !important;
                }
                .pos-tile.is-out:hover, .pos-tile[disabled]:hover {
                    transform: none;
                    box-shadow: none !important;
                }
                /* Upper Image Area */
                .pos-img-container {
                    position: relative;
                    width: 100%;
                    flex: 1;
                    min-height: 130px;
                    overflow: hidden;
                    background: #1e293b;
                }
                .pos-card-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .pos-tile:hover .pos-card-img {
                    transform: scale(1.08);
                }
                .pos-card-img-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: radial-gradient(circle at center, color-mix(in srgb, var(--c) 45%, #1e293b) 0%, #0f172a 100%);
                    transition: transform 0.5s ease;
                }
                .pos-tile:hover .pos-card-img-placeholder {
                    transform: scale(1.05);
                }
                .pos-img-top-bar {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    left: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 2;
                    pointer-events: none;
                }
                .pos-cat-pill {
                    padding: 3px 9px;
                    border-radius: 9999px;
                    font-size: 10px;
                    font-weight: 800;
                    color: #ffffff;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.25);
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                }
                .pos-out-pill {
                    padding: 3px 8px;
                    border-radius: 9999px;
                    font-size: 10px;
                    font-weight: 800;
                    color: #fff;
                    background: rgba(225, 29, 72, 0.85);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
                .pos-img-vignette {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.45) 100%);
                    pointer-events: none;
                }
                /* Bottom Themed Banner matching Café POS */
                .pos-card-banner {
                    width: 100%;
                    height: 66px;
                    background: var(--cgrad, linear-gradient(180deg, #1e293b, #0f172a));
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    color: #ffffff;
                    position: relative;
                    z-index: 2;
                    border-top: 1px solid rgba(255, 255, 255, 0.15);
                }
                .pos-banner-icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(4px);
                    border: 1.5px solid rgba(255, 255, 255, 0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                    transition: transform 0.25s ease;
                }
                .pos-tile:hover .pos-banner-icon {
                    transform: scale(1.1);
                    background: rgba(255, 255, 255, 0.3);
                }
                .pos-banner-content {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    text-align: right;
                }
                .pos-banner-title {
                    font-size: 13.5px;
                    font-weight: 900;
                    line-height: 1.25;
                    color: #ffffff;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .pos-banner-price-row {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 2px;
                }
                .pos-banner-price {
                    font-size: 13px;
                    font-weight: 800;
                    color: #fef08a;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.6);
                    line-height: 1.2;
                }
                .pos-banner-cur {
                    font-size: 10.5px;
                    font-weight: 700;
                    color: rgba(254, 240, 138, 0.9);
                }
                .pos-banner-arrow {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
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
                    
                    {/* LEFT / MAIN SECTION: Unified Product Tiles with Embedded Category */}
                    <section className={`flex-1 min-w-0 w-full space-y-4 ${mobileTab === 'cart' ? 'hidden lg:block' : 'block'}`}>
                        {displayedItems.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 p-8 sm:p-12 text-center text-slate-400">
                                <Utensils className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm sm:text-base font-semibold">لا توجد أصناف تطابق بحثك حالياً</p>
                            </div>
                        ) : (
                            <div className="pos-tiles-grid">
                                {displayedItems.map((item) => {
                                    const catName = item.category?.name || 'عام';
                                    const colorInfo = getCategoryColor(catName);
                                    const ItemIcon = getFoodIcon(item.name, catName);
                                    const isOutOfStock = item.is_available === false;

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            disabled={isOutOfStock}
                                            style={{
                                                '--c': colorInfo.c,
                                                '--cbg': colorInfo.cbg,
                                                '--cgrad': colorInfo.grad,
                                            } as React.CSSProperties}
                                            onClick={() => {
                                                if (isOutOfStock) return;
                                                addItem({
                                                    id: item.id,
                                                    name: item.name,
                                                    price: item.price,
                                                    image_url: item.image_url,
                                                    category: catName
                                                });
                                            }}
                                            className={`pos-tile group ${isOutOfStock ? 'is-out' : ''}`}
                                        >
                                            {/* Upper Image Section */}
                                            <div className="pos-img-container">
                                                {item.image_url ? (
                                                    <img
                                                        src={getFullUrl(item.image_url)}
                                                        alt={item.name}
                                                        className="pos-card-img"
                                                    />
                                                ) : (
                                                    <div className="pos-card-img-placeholder">
                                                        <ItemIcon className="w-12 h-12 opacity-80 text-white" />
                                                    </div>
                                                )}

                                                {/* Top Badges (Category Pill & Stock Status) */}
                                                <div className="pos-img-top-bar">
                                                    <span className="pos-cat-pill">
                                                        {catName}
                                                    </span>
                                                    {isOutOfStock && (
                                                        <span className="pos-out-pill">
                                                            نفذ
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Soft shadow vignette to seamlessly transition to bottom banner */}
                                                <div className="pos-img-vignette" />
                                            </div>

                                            {/* Bottom Themed Banner */}
                                            <div className="pos-card-banner">
                                                {/* Right: Circular Icon */}
                                                <div className="pos-banner-icon">
                                                    <ItemIcon className="w-4 h-4 text-white" />
                                                </div>

                                                {/* Center: Title & Price */}
                                                <div className="pos-banner-content">
                                                    <span className="pos-banner-title" title={item.name}>
                                                        {item.name}
                                                    </span>
                                                    <div className="pos-banner-price-row">
                                                        <span className="pos-banner-price">
                                                            {item.price.toFixed(2)} <span className="pos-banner-cur">د.ل</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Left: Directional Arrow Chevron */}
                                                <div className="pos-banner-arrow">
                                                    <ChevronLeft className="w-4 h-4 text-white/80 group-hover:text-white group-hover:-translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* RIGHT / ASIDE SECTION: Standard Professional POS Receipt-Style Cart */}
                    <aside className={`w-full lg:w-[420px] xl:w-[470px] 2xl:w-[520px] shrink-0 min-w-0 ${mobileTab === 'menu' ? 'hidden lg:block' : 'block'}`}>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/70 p-3 sm:p-4 flex flex-col h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)] lg:sticky lg:top-3 overflow-hidden">
                            
                            {/* 1. Header: Title + Items Badge + Clear All */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-none">الطلب الحالي</h2>
                                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                        {totalItemCount} {totalItemCount === 1 ? 'صنف' : 'أصناف'}
                                    </span>
                                </div>

                                {items.length > 0 && (
                                    <button
                                        onClick={clearCart}
                                        className="text-xs text-rose-500 hover:text-rose-600 font-bold transition-colors"
                                        title="تفريغ السلة بالكامل"
                                    >
                                        مسح الكل
                                    </button>
                                )}
                            </div>

                            {/* 2. Order Type & Table Selection */}
                            <div className="py-2 border-b border-slate-100 dark:border-slate-700/60 space-y-1.5 shrink-0">
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setOrderType('takeaway')}
                                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            orderType === 'takeaway'
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                                        }`}
                                    >
                                        طلب سفري
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrderType('dine_in')}
                                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            orderType === 'dine_in'
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
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

                            {/* 3. Table Column Headers */}
                            <div className="grid grid-cols-12 gap-1.5 px-2.5 py-1.5 bg-slate-100/80 dark:bg-slate-700/50 rounded-xl text-[11px] font-black text-slate-500 dark:text-slate-300 mt-2 shrink-0">
                                <span className="col-span-5 text-start">الصنف</span>
                                <span className="col-span-3 text-center">الكمية</span>
                                <span className="col-span-3 text-end">الإجمالي</span>
                                <span className="col-span-1 text-center"></span>
                            </div>

                            {/* 4. Normal POS Items List (Compact, Scrollable Table) */}
                            <div className="flex-1 overflow-y-auto min-h-0 py-1 divide-y divide-slate-100 dark:divide-slate-700/50 scrollbar-thin">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[140px] text-center py-6 opacity-40">
                                        <ShoppingBag className="w-9 h-9 text-slate-400 mb-1.5" />
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">السلة فارغة</p>
                                        <p className="text-[11px] text-slate-400">انقر على أي صنف لإضافته مباشرة</p>
                                    </div>
                                ) : (
                                    items.map((item) => {
                                        const isEditingNote = editingNoteItemId === item.id;
                                        const lineTotal = (item.price * item.quantity).toFixed(2);

                                        return (
                                            <div key={item.id} className="py-2 px-1.5 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 rounded-lg transition-colors group">
                                                <div className="grid grid-cols-12 gap-1.5 items-center">
                                                    {/* Item Name & Unit Price */}
                                                    <div className="col-span-5 min-w-0 pr-1">
                                                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-tight" title={item.name}>
                                                            {item.name}
                                                        </h4>
                                                        <p className="text-[11px] text-slate-400 font-bold tabular-nums">
                                                            {item.price.toFixed(2)} د.ل
                                                        </p>
                                                    </div>

                                                    {/* Stepper [-] qty [+] */}
                                                    <div className="col-span-3 flex items-center justify-center gap-1" dir="ltr">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold transition-all active:scale-90"
                                                            title="تقليل الكمية"
                                                        >
                                                            <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                        </button>
                                                        <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white min-w-[1rem] text-center tabular-nums">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold transition-all active:scale-90"
                                                            title="زيادة الكمية"
                                                        >
                                                            <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Line Total */}
                                                    <div className="col-span-3 text-end font-black text-xs sm:text-sm text-slate-900 dark:text-white tabular-nums">
                                                        {lineTotal} <span className="text-[10px] text-slate-400 font-normal">د.ل</span>
                                                    </div>

                                                    {/* Quick Remove (✕) */}
                                                    <div className="col-span-1 flex items-center justify-center">
                                                        <button
                                                            onClick={() => removeItem(item.id)}
                                                            className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                                                            title="إزالة الصنف"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Optional Item Note */}
                                                {item.notes && !isEditingNote && (
                                                    <div className="flex items-center justify-between text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded mt-1">
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
                                                    <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg mt-1">
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

                            {/* 5. Pinned Footer: Totals + Quick Actions (Always visible on screen) */}
                            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 space-y-2 shrink-0 mt-auto bg-white dark:bg-slate-800">
                                
                                {/* Subtotal & Tax */}
                                <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 px-0.5">
                                    <span>المجموع: <span className="text-gray-800 dark:text-gray-200 font-black">{subtotal.toFixed(2)} د.ل</span></span>
                                    <span>الضريبة (10%): <span className="text-gray-800 dark:text-gray-200 font-black">{taxAmount.toFixed(2)} د.ل</span></span>
                                </div>

                                {/* Grand Total + Compact Pay & Clear Buttons */}
                                <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-700/60 px-0.5">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-400 block leading-tight">الإجمالي المستحق:</span>
                                        <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                                            {total.toFixed(2)} <span className="text-xs font-bold text-gray-400">د.ل</span>
                                        </span>
                                    </div>

                                    {/* Compact Actions: مسح + دفع */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={clearCart}
                                            disabled={items.length === 0}
                                            className="h-8 px-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg font-bold text-xs transition-all active:scale-95 disabled:opacity-40"
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
                                            className="h-8 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {isProcessingCheckout ? 'جاري الدفع...' : 'دفع'}
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Quick Cash Buttons (المبلغ بالضبط, 20 د.ل, 50 د.ل) */}
                                <div className="grid grid-cols-3 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleCheckout('cash')}
                                        disabled={isProcessingCheckout || items.length === 0}
                                        className="h-8 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-40"
                                    >
                                        المبلغ بالضبط
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCheckout('cash')}
                                        disabled={isProcessingCheckout || items.length === 0}
                                        className="h-8 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-40"
                                    >
                                        20 د.ل
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCheckout('cash')}
                                        disabled={isProcessingCheckout || items.length === 0}
                                        className="h-8 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-40"
                                    >
                                        50 د.ل
                                    </button>
                                </div>

                                {/* Row 3: Secondary Actions (Card / Debt / Hold / Print) */}
                                <div className="grid grid-cols-4 gap-1 pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (items.length === 0 && !currentOrder) return;
                                            setShowCardModal(true);
                                        }}
                                        disabled={items.length === 0 && !currentOrder}
                                        className="py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 border border-slate-200/80 dark:border-slate-700"
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
                                        className="py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 border border-slate-200/80 dark:border-slate-700"
                                    >
                                        آجل
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleHoldOrder}
                                        disabled={items.length === 0 || isProcessingHold}
                                        className="py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 border border-amber-200/50"
                                        title="تعليق الطلب وسداده لاحقاً"
                                    >
                                        تعليق
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePrintInvoice}
                                        disabled={items.length === 0}
                                        className="py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 border border-slate-200/80 dark:border-slate-700"
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
