'use client';

import React, { useEffect, useRef } from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { RestaurantSettings } from '@/services/settingsService';

export interface ThermalOrderItem {
    id?: number | string;
    name?: string;
    quantity: number;
    unit_price?: number;
    price?: number;
    notes?: string;
    menu_item?: {
        name: string;
        price: number;
    };
}

export interface ThermalOrderData {
    id: number | string;
    order_number?: string;
    order_date_time?: string;
    table_number?: string | null;
    status?: string;
    cashier_name?: string;
    shift_id?: number | string | null;
    employee?: {
        id?: number;
        user?: {
            username?: string;
            first_name?: string;
            last_name?: string;
        };
    } | null;
    items: ThermalOrderItem[];
    total_amount: number;
    discount_amount?: number;
    tax_amount?: number;
    tax_rate?: number;
    payment_method?: string;
    card_provider?: string;
    qr_code_base64?: string;
    qr_image_url?: string;
}

interface ThermalReceipt80mmProps {
    order: ThermalOrderData;
    settings: RestaurantSettings | null;
    onClose?: () => void;
    autoPrint?: boolean;
}

export default function ThermalReceipt80mm({
    order,
    settings,
    onClose,
    autoPrint = false
}: ThermalReceipt80mmProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const sellerName = settings?.name || 'مطعمنا';
    const taxNumber = settings?.tax_number || '';
    const currency = settings?.currency || 'د.ل';
    const showLogo = settings?.show_logo_sales !== false;

    const subtotal = order.items.reduce((sum, it) => {
        const price = Number(it.unit_price ?? it.price ?? it.menu_item?.price ?? 0);
        return sum + price * it.quantity;
    }, 0);

    const discount = Number(order.discount_amount || 0);
    const total = Number(order.total_amount || (subtotal - discount));

    const taxRate = settings?.tax_rate ? Number(settings.tax_rate) : 0;
    const taxAmount = order.tax_amount !== undefined
        ? Number(order.tax_amount)
        : (taxRate > 0 ? (total * taxRate) / (100 + taxRate) : 0);

    const orderDateStr = order.order_date_time || new Date().toISOString();
    const formattedDate = new Date(orderDateStr).toLocaleString('ar-LY', {
        dateStyle: 'short',
        timeStyle: 'medium',
    });

    const cashierName =
        order.cashier_name ||
        (order.employee?.user?.first_name
            ? `${order.employee.user.first_name} ${order.employee.user.last_name || ''}`.trim()
            : order.employee?.user?.username) ||
        'كاشير عام';

    const handlePrint = () => {
        window.print();
    };

    // Note: Do NOT trigger automatic window.print() to avoid the browser print dialog popping up unprompted.
    // The user views the receipt in this popup modal and can click print only if desired.

    const getFullLogoUrl = (path?: string) => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '');
        return `${backendBase}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir="rtl">
            {/* Print Styles for 80mm Roll */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    html, body {
                        width: 80mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #thermal-receipt-80mm, #thermal-receipt-80mm * {
                        visibility: visible !important;
                        color: #000000 !important;
                        border-color: #000000 !important;
                        text-shadow: none !important;
                        filter: none !important;
                    }
                    #thermal-receipt-80mm {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 80mm !important;
                        max-width: 80mm !important;
                        margin: 0 !important;
                        padding: 3mm 3mm !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: #ffffff !important;
                        font-family: 'Courier New', Courier, monospace !important;
                        -webkit-font-smoothing: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-[420px] w-full max-h-[94vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200">
                {/* Onscreen Header Action Bar */}
                <div className="no-print p-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900 dark:text-white">فاتورة المبيعات (معاينة منبثقة)</h3>
                            <p className="text-[11px] text-gray-400 font-medium">تم الحفظ بنجاح • إيصال حراري 80mm</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="طباعة عبر الطابعة"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة ورقية</span>
                        </button>

                        {onClose && (
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-xl bg-gray-200/60 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-all cursor-pointer"
                                title="إغلاق"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Printable 80mm Body */}
                <div className="overflow-y-auto p-4 sm:p-6 bg-gray-100/70 dark:bg-gray-950 flex justify-center">
                    <div
                        id="thermal-receipt-80mm"
                        ref={printRef}
                        className="w-[80mm] max-w-[80mm] bg-white text-black font-mono text-[12px] leading-tight p-3 sm:p-3.5 shadow-md border border-gray-200 select-none rounded-sm"
                        style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    >
                        {/* 1. Logo & Restaurant Header */}
                        <div className="text-center space-y-1 mb-2">
                            {showLogo && settings?.logo && (
                                <div className="flex justify-center mb-1">
                                    <img
                                        src={getFullLogoUrl(settings.logo)}
                                        alt={sellerName}
                                        className="max-h-14 max-w-[50mm] object-contain filter grayscale contrast-200"
                                    />
                                </div>
                            )}

                            <h1 className="text-base font-black tracking-tight text-black">{sellerName}</h1>

                            {settings?.bio && (
                                <p className="text-[10.5px] font-bold text-black leading-tight">{settings.bio}</p>
                            )}

                            {settings?.address && (
                                <p className="text-[10.5px] font-bold text-black leading-tight">{settings.address}</p>
                            )}

                            <div className="flex justify-center gap-2 text-[10.5px] font-bold text-black">
                                {settings?.phone && <span>هاتف: {settings.phone}</span>}
                            </div>

                            {taxNumber && (
                                <p className="text-[10.5px] font-bold mt-0.5 text-black">
                                    الرقم الضريبي: <span className="font-mono font-black">{taxNumber}</span>
                                </p>
                            )}

                            {settings?.commercial_record && (
                                <p className="text-[10.5px] font-bold text-black">
                                    السجل التجاري: <span className="font-mono">{settings.commercial_record}</span>
                                </p>
                            )}
                        </div>

                        {/* Dashed Separator */}
                        <div className="border-t-2 border-dashed border-black my-2" />

                        {/* 2. Order Metadata */}
                        <div className="text-[11px] space-y-1 mb-2 text-black">
                            <div className="flex justify-between font-black text-[12px]">
                                <span>فاتورة رقم: #{order.order_number || order.id}</span>
                                <span>{order.table_number ? (order.table_number.includes('سفري') ? order.table_number : `طاولة ${order.table_number}`) : 'طلب مباشر'}</span>
                            </div>

                            <div className="flex justify-between text-[11px] font-bold">
                                <span>التاريخ: {formattedDate}</span>
                            </div>

                            <div className="flex justify-between text-[11px] font-bold">
                                <span>الكاشير: {cashierName}</span>
                                {order.shift_id && <span>وردية: #{order.shift_id}</span>}
                            </div>

                            {order.payment_method && (
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span>طريقة الدفع: {order.payment_method === 'cash' ? 'نقدي (كاش)' : (order.card_provider ? `بطاقة (${order.card_provider})` : 'إلكتروني')}</span>
                                </div>
                            )}
                        </div>

                        {/* Dashed Separator */}
                        <div className="border-t-2 border-dashed border-black my-2" />

                        {/* 3. Items Table */}
                        <div className="mb-2">
                            <table className="w-full text-right text-[11px] text-black">
                                <thead>
                                    <tr className="border-b-2 border-dashed border-black text-[11px] font-black">
                                        <th className="py-1 text-right w-[46%]">الصنف</th>
                                        <th className="py-1 text-center w-[16%]">الكمية</th>
                                        <th className="py-1 text-left w-[19%]">السعر</th>
                                        <th className="py-1 text-left w-[19%]">الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((it, idx) => {
                                        const itemName = it.name || it.menu_item?.name || 'صنف';
                                        const price = Number(it.unit_price ?? it.price ?? it.menu_item?.price ?? 0);
                                        const itemTotal = price * it.quantity;

                                        return (
                                            <React.Fragment key={idx}>
                                                <tr className="border-b border-dashed border-black/40">
                                                    <td className="py-1.5 font-black text-black truncate max-w-[36mm]">
                                                        {itemName}
                                                    </td>
                                                    <td className="py-1.5 text-center font-black text-black">
                                                        {it.quantity}
                                                    </td>
                                                    <td className="py-1.5 text-left font-mono font-bold text-black">
                                                        {price.toFixed(2)}
                                                    </td>
                                                    <td className="py-1.5 text-left font-mono font-black text-black">
                                                        {itemTotal.toFixed(2)}
                                                    </td>
                                                </tr>
                                                {it.notes && (
                                                    <tr>
                                                        <td colSpan={4} className="text-[9.5px] font-bold text-black pb-1 italic pr-2">
                                                            * {it.notes}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Dashed Separator */}
                        <div className="border-t-2 border-dashed border-black my-2" />

                        {/* 4. Totals Breakdown */}
                        <div className="space-y-1.5 text-[11px] mb-2 font-black text-black">
                            <div className="flex justify-between">
                                <span>المجموع الفرعي:</span>
                                <span className="font-mono">{subtotal.toFixed(2)} {currency}</span>
                            </div>

                            {discount > 0 && (
                                <div className="flex justify-between">
                                    <span>الخصم الممنوح:</span>
                                    <span className="font-mono">-{discount.toFixed(2)} {currency}</span>
                                </div>
                            )}

                            {taxRate > 0 && (
                                <div className="flex justify-between">
                                    <span>ضريبة القيمة المضافة ({taxRate}%):</span>
                                    <span className="font-mono">{taxAmount.toFixed(2)} {currency}</span>
                                </div>
                            )}

                            <div className="border-t-2 border-black pt-1.5 flex justify-between text-[13px] font-black">
                                <span>الإجمالي النهائي:</span>
                                <span className="font-mono">{total.toFixed(2)} {currency}</span>
                            </div>
                        </div>



                        {/* 6. Footer Message & Policy Terms */}
                        <div className="text-center space-y-1 mt-2 pt-1 border-t-2 border-dashed border-black text-[10.5px] text-black">
                            {settings?.invoice_footer_message ? (
                                <p className="font-black text-[11px]">{settings.invoice_footer_message}</p>
                            ) : (
                                <p className="font-black text-[11px]">شكراً لزيارتكم!</p>
                            )}

                            {settings?.sales_invoice_terms && (
                                <p className="text-[9px] font-bold text-black leading-tight max-w-[70mm] mx-auto">
                                    {settings.sales_invoice_terms}
                                </p>
                            )}

                            <p className="text-[8.5px] font-black text-black font-mono pt-1">
                                *** نظام إدارة المطاعم الذكي ***
                            </p>
                        </div>
                    </div>
                </div>

                {/* Onscreen Footer Close Action */}
                <div className="no-print p-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center gap-2">
                    <span className="text-[11px] text-gray-500 font-bold hidden sm:inline">
                        إجمالي الفاتورة: <strong className="text-emerald-600 font-black">{total.toFixed(2)} {currency}</strong>
                    </span>
                    <div className="flex items-center gap-2 mr-auto sm:mr-0">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-200/70 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition cursor-pointer"
                            >
                                إغلاق (طلب جديد)
                            </button>
                        )}
                        <button
                            onClick={handlePrint}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة ورقية</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
