'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Modal } from '@/components';
import {
    Building2,
    Search,
    Filter,
    ArrowUpRight,
    CreditCard,
    DollarSign,
    Save,
    Calendar,
    Clock,
    Hash
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import { paymentService, Payment } from '@/services/paymentService';
import { orderService, Order } from '@/services/orderService';

export default function PaymentsPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn } = useAuthStore();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isFetchingOrder, setIsFetchingOrder] = useState(false);

    // Summary state
    const [dailyTotal, setDailyTotal] = useState(0);

    // Active filter tab: 'all' | 'cash' | 'card' | 'debt'
    const [activeMethodTab, setActiveMethodTab] = useState<'all' | 'cash' | 'card' | 'debt'>('all');
    const [selectedCardProvider, setSelectedCardProvider] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

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
            const data = await paymentService.getPayments();
            setPayments(data);

            // Calculate daily total (simplified)
            const total = data.reduce((acc, curr) => acc + curr.amount, 0);
            setDailyTotal(total);
        } catch (err) {
            console.error('Fetch payments failed', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShowDetails = async (orderId: number) => {
        try {
            setIsFetchingOrder(true);
            setIsDetailsModalOpen(true);
            const orderData = await orderService.getOrder(orderId);
            setSelectedOrder(orderData);
        } catch (err) {
            console.error('Failed to fetch order details', err);
            setIsDetailsModalOpen(false);
        } finally {
            setIsFetchingOrder(false);
        }
    };

    // Calculate totals per payment method
    const cashPayments = payments.filter(p => p.payment_method === 'cash');
    const cardPayments = payments.filter(p => p.payment_method === 'credit_card' || p.payment_method === 'card');
    const debtPayments = payments.filter(p => p.payment_method === 'debt');

    const totalCash = cashPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalCard = cardPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalDebt = debtPayments.reduce((acc, p) => acc + p.amount, 0);

    // Available card providers in payments
    const availableCardProviders = Array.from(
        new Set(
            cardPayments
                .map(p => p.card_provider || 'غير محدد')
                .filter(Boolean)
        )
    );

    // Filtered list
    const filteredPayments = payments.filter(txn => {
        // Method filter
        if (activeMethodTab === 'cash' && txn.payment_method !== 'cash') return false;
        if (activeMethodTab === 'debt' && txn.payment_method !== 'debt') return false;
        if (activeMethodTab === 'card') {
            const isCard = txn.payment_method === 'credit_card' || txn.payment_method === 'card';
            if (!isCard) return false;
            if (selectedCardProvider !== 'all') {
                const provider = txn.card_provider || 'غير محدد';
                if (provider !== selectedCardProvider) return false;
            }
        }

        // Search filter
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            const txnIdMatch = (txn.transaction_id || `TXN-${txn.id}`).toLowerCase().includes(term);
            const orderIdMatch = txn.order_id.toString().includes(term);
            const providerMatch = (txn.card_provider || '').toLowerCase().includes(term);
            return txnIdMatch || orderIdMatch || providerMatch;
        }

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
                        <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
                            <Building2 className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">المدفوعات</h1>
                            <p className="text-gray-400 dark:text-gray-500 text-[13px] font-bold opacity-70">سجل المعاملات وتفصيل طرق الدفع</p>
                        </div>
                    </div>
                </header>

                {/* Cards Summary by Method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {/* All / Total */}
                    <div 
                        onClick={() => { setActiveMethodTab('all'); setSelectedCardProvider('all'); }}
                        className={`bg-card dark:bg-card p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-all cursor-pointer hover:scale-[1.02] ${activeMethodTab === 'all' ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-gray-100 dark:border-gray-800/40'}`}
                    >
                        <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-1">إجمالي الكل</p>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                                {dailyTotal.toFixed(2)}
                                <span className="text-xs font-bold text-gray-400 mr-1 italic">د.ل</span>
                            </h3>
                            <span className="text-[10px] text-gray-400 font-bold">{payments.length} معاملة</span>
                        </div>
                    </div>

                    {/* Cash */}
                    <div 
                        onClick={() => { setActiveMethodTab('cash'); setSelectedCardProvider('all'); }}
                        className={`bg-card dark:bg-card p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-all cursor-pointer hover:scale-[1.02] ${activeMethodTab === 'cash' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-100 dark:border-gray-800/40'}`}
                    >
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest mb-1">الدفع النقدي (كاش)</p>
                            <h3 className="text-xl font-black text-emerald-600 tabular-nums">
                                {totalCash.toFixed(2)}
                                <span className="text-xs font-bold text-gray-400 mr-1 italic">د.ل</span>
                            </h3>
                            <span className="text-[10px] text-gray-400 font-bold">{cashPayments.length} معاملة</span>
                        </div>
                    </div>

                    {/* Card */}
                    <div 
                        onClick={() => setActiveMethodTab('card')}
                        className={`bg-card dark:bg-card p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-all cursor-pointer hover:scale-[1.02] ${activeMethodTab === 'card' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100 dark:border-gray-800/40'}`}
                    >
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mb-1">دفع البطاقات</p>
                            <h3 className="text-xl font-black text-blue-600 tabular-nums">
                                {totalCard.toFixed(2)}
                                <span className="text-xs font-bold text-gray-400 mr-1 italic">د.ل</span>
                            </h3>
                            <span className="text-[10px] text-gray-400 font-bold">{cardPayments.length} معاملة</span>
                        </div>
                    </div>

                    {/* Debt / آجل */}
                    <div 
                        onClick={() => { setActiveMethodTab('debt'); setSelectedCardProvider('all'); }}
                        className={`bg-card dark:bg-card p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-all cursor-pointer hover:scale-[1.02] ${activeMethodTab === 'debt' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-100 dark:border-gray-800/40'}`}
                    >
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest mb-1">دفع آجل (ذمم)</p>
                            <h3 className="text-xl font-black text-amber-600 tabular-nums">
                                {totalDebt.toFixed(2)}
                                <span className="text-xs font-bold text-gray-400 mr-1 italic">د.ل</span>
                            </h3>
                            <span className="text-[10px] text-gray-400 font-bold">{debtPayments.length} معاملة</span>
                        </div>
                    </div>
                </div>

                <section className="bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                    {/* Filter Bar & Tabs */}
                    <div className="p-6 border-b border-gray-50 dark:border-gray-800/30 flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            {/* Method Tabs */}
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <button
                                    onClick={() => { setActiveMethodTab('all'); setSelectedCardProvider('all'); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeMethodTab === 'all' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-orange-600'}`}
                                >
                                    جميع المعاملات ({payments.length})
                                </button>
                                <button
                                    onClick={() => { setActiveMethodTab('cash'); setSelectedCardProvider('all'); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeMethodTab === 'cash' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-emerald-600'}`}
                                >
                                    <DollarSign className="w-3.5 h-3.5" />
                                    نقدي ({cashPayments.length})
                                </button>
                                <button
                                    onClick={() => setActiveMethodTab('card')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeMethodTab === 'card' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-blue-600'}`}
                                >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    بطاقات ({cardPayments.length})
                                </button>
                                <button
                                    onClick={() => { setActiveMethodTab('debt'); setSelectedCardProvider('all'); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeMethodTab === 'debt' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-amber-600'}`}
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    آجل ({debtPayments.length})
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative w-full md:w-80 group">
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="بحث برقم المعاملة أو الطلب أو الخدمة..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-10 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100/50 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-orange-600/10 rounded-xl pr-10 pl-4 text-sm font-bold transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Sub-tabs for Card Providers when 'card' tab is active */}
                        {activeMethodTab === 'card' && availableCardProviders.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/40">
                                <span className="text-xs font-bold text-gray-400 ml-2">خدمة البطاقة:</span>
                                <button
                                    onClick={() => setSelectedCardProvider('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCardProvider === 'all' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-gray-600'}`}
                                >
                                    جميع الخدمات
                                </button>
                                {availableCardProviders.map(provider => (
                                    <button
                                        key={provider}
                                        onClick={() => setSelectedCardProvider(provider)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCardProvider === provider ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-blue-600 border border-gray-100 dark:border-gray-800'}`}
                                    >
                                        💳 {provider} ({cardPayments.filter(p => (p.card_provider || 'غير محدد') === provider).length})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto text-sm">
                        <table className="w-full text-right" dir="rtl">
                            <thead>
                                <tr className="bg-gray-50/30 dark:bg-gray-900/20 border-b border-gray-50 dark:border-gray-800/40">
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">رقم المعاملة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">رقم الطلب</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">وسيلة الدفع</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">خدمة البطاقة</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">المبلغ</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">التوقيت</th>
                                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none text-center">التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-400 font-bold italic">جاري التحميل...</td></tr>
                                ) : filteredPayments.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-400 font-bold italic">لا توجد معاملات مطابقة للفلتر المحدد.</td></tr>
                                ) : filteredPayments.map((txn) => (
                                    <tr key={txn.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-black text-gray-900 dark:text-gray-200 uppercase tabular-nums">
                                                {txn.transaction_id || `TXN-${txn.id.toString().padStart(3, '0')}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-400 tabular-nums">#{txn.order_id}</td>
                                        <td className="px-6 py-4">
                                            {txn.payment_method === 'cash' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600">
                                                    <DollarSign className="w-3.5 h-3.5" />
                                                    نقدي
                                                </span>
                                            )}
                                            {(txn.payment_method === 'credit_card' || txn.payment_method === 'card') && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-blue-50 dark:bg-blue-950/20 text-blue-600">
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    بطاقة مصرفية
                                                </span>
                                            )}
                                            {txn.payment_method === 'debt' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-50 dark:bg-amber-950/20 text-amber-600">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    آجل
                                                </span>
                                            )}
                                            {txn.payment_method !== 'cash' && txn.payment_method !== 'credit_card' && txn.payment_method !== 'card' && txn.payment_method !== 'debt' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-purple-50 dark:bg-purple-950/20 text-purple-600">
                                                    {txn.payment_method}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {txn.card_provider ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 dark:bg-blue-950/30 text-blue-600 border border-blue-100 dark:border-blue-900/30">
                                                    💳 {txn.card_provider}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-700 text-xs font-semibold">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-black text-orange-600 italic">
                                            {txn.amount.toFixed(2)} <span className="text-[10px] not-italic mr-0.5">د.ل</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 font-semibold tabular-nums text-xs opacity-70">
                                            {new Date(txn.payment_date_time).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => handleShowDetails(txn.order_id)}
                                                    className="p-2 bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-orange-600 rounded-xl transition-all border border-gray-100 dark:border-gray-800"
                                                >
                                                    <ArrowUpRight className="w-4 h-4" />
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
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                title={`تفاصيل الطلب #${selectedOrder?.id}`}
            >
                {isFetchingOrder ? (
                    <div className="p-12 text-center text-gray-400 font-bold italic">جاري تحميل تفاصيل الطلب...</div>
                ) : selectedOrder ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-1">
                                    <Building2 className="w-4 h-4 text-orange-600" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المكان</span>
                                </div>
                                <div className="text-sm font-black text-gray-900 dark:text-white">
                                    {selectedOrder.table_number ? `طاولة ${selectedOrder.table_number}` : 'سفري / تيك أواي'}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-4 h-4 text-orange-600" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الوقت</span>
                                </div>
                                <div className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                                    {new Date(selectedOrder.order_date_time).toLocaleTimeString('en-GB')}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الأصناف</h3>
                            <div className="space-y-2">
                                {selectedOrder.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-gray-50 dark:border-gray-800/40">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-950/30 rounded-lg flex items-center justify-center text-[10px] font-black text-orange-600">
                                                {item.quantity}x
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-gray-900 dark:text-white">{item.menu_item?.name}</div>
                                                {item.notes && <div className="text-[10px] text-gray-400 font-bold">{item.notes}</div>}
                                            </div>
                                        </div>
                                        <div className="text-xs font-black text-gray-900 dark:text-white tabular-nums">
                                            {(item.unit_price * item.quantity).toFixed(2)} د.ل
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-400">
                                <span>المجموع الفرعي</span>
                                <span className="tabular-nums">{(selectedOrder.total_amount + selectedOrder.discount_amount).toFixed(2)} د.ل</span>
                            </div>
                            {selectedOrder.discount_amount > 0 && (
                                <div className="flex justify-between text-xs font-bold text-orange-600">
                                    <span>الخصم</span>
                                    <span className="tabular-nums">-{selectedOrder.discount_amount.toFixed(2)} د.ل</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-black text-gray-900 dark:text-white border-t border-dashed border-gray-200 dark:border-gray-800 pt-2">
                                <span>الإجمالي</span>
                                <span className="tabular-nums">{selectedOrder.total_amount.toFixed(2)} د.ل</span>
                            </div>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
