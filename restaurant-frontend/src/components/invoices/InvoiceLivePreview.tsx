'use client';

import React, { useState, useRef } from 'react';
import { RestaurantSettings } from '@/services/settingsService';
import { Printer, Eye, ShoppingCart, ShoppingBag, RotateCcw } from 'lucide-react';
import SalesInvoiceDocument, { SalesInvoiceData } from './SalesInvoiceDocument';
import PurchaseInvoiceDocument, { PurchaseInvoiceData } from './PurchaseInvoiceDocument';
import PurchaseReturnDocument, { PurchaseReturnData } from './PurchaseReturnDocument';

interface InvoiceLivePreviewProps {
    settings: RestaurantSettings | null;
}

export default function InvoiceLivePreview({ settings }: InvoiceLivePreviewProps) {
    const [previewType, setPreviewType] = useState<'sales' | 'purchases' | 'returns'>('sales');
    const printableAreaRef = useRef<HTMLDivElement>(null);

    // Mock Data for Sales Invoice
    const mockSalesData: SalesInvoiceData = {
        orderId: '1042',
        orderDate: new Date().toISOString(),
        cashierName: 'محمد أحمد',
        orderType: 'dine_in',
        tableNumber: 'طاولة 5',
        items: [
            { id: 1, name: 'بيتزا سوبريم مخصوص', quantity: 2, price: 35.0, notes: 'بدون شطة' },
            { id: 2, name: 'سلطة سيزر بالدجاج', quantity: 1, price: 18.0 },
            { id: 3, name: 'عصير برتقال طبيعي', quantity: 2, price: 9.0 }
        ],
        subtotal: 106.0,
        taxRate: settings?.tax_rate || 5,
        taxAmount: Number(((106.0 * (settings?.tax_rate || 5)) / 100).toFixed(2)),
        discount: 6.0,
        deliveryFee: 0,
        total: Number((106.0 - 6.0 + ((106.0 * (settings?.tax_rate || 5)) / 100)).toFixed(2)),
        paymentMethod: 'card',
        cardProvider: 'تداول'
    };

    // Mock Data for Purchase Invoice
    const mockPurchaseData: PurchaseInvoiceData = {
        id: 205,
        invoice_number: 'PUR-2026-088',
        supplier_name: 'شركة الواحة للمواد الغذائية واللحوم',
        supplier_company: 'الواحة للاستيراد والتوزيع',
        supplier_phone: '+218 91 234 5678',
        supplier_tax_number: '310998877600003',
        invoice_date: new Date().toLocaleDateString('ar-LY'),
        status_display: 'مرحل للمخزن ✔',
        items: [
            { id: 1, ingredient_name: 'جبن موزاريلا إيطالي مبشور', quantity: 20, unit: 'kg', unit_display: 'كجم', unit_price: 24.5, total_price: 490.0 },
            { id: 2, ingredient_name: 'صلصة طماطم بيتزا فاخرة', quantity: 15, unit: 'can', unit_display: 'علبة', unit_price: 8.0, total_price: 120.0 },
            { id: 3, ingredient_name: 'دقيق فاخر للبيتزا والمعجنات', quantity: 10, unit: 'bag', unit_display: 'شوال 25ك', unit_price: 45.0, total_price: 450.0 }
        ],
        total_amount: 1060.0,
        paid_amount: 600.0,
        remaining_amount: 460.0,
        notes: 'دفعة نقدية أولى والباقي يسدد خلال 15 يوم'
    };

    // Mock Data for Purchase Return
    const mockReturnData: PurchaseReturnData = {
        id: 54,
        return_number: 'RET-2026-019',
        invoice_number: 'PUR-2026-088',
        supplier_name: 'شركة الواحة للمواد الغذائية واللحوم',
        supplier_company: 'الواحة للاستيراد والتوزيع',
        supplier_phone: '+218 91 234 5678',
        return_date: new Date().toLocaleDateString('ar-LY'),
        refund_method: 'DEBT_REDUCTION',
        reason: 'تلف في التغليف وتغير في الجودة أثناء النقل',
        items: [
            { ingredient_name: 'جبن موزاريلا إيطالي مبشور', quantity: 5, unit: 'kg', unit_display: 'كجم', unit_price: 24.5, reason: 'تلف كيس التغليف' },
            { ingredient_name: 'صلصة طماطم بيتزا فاخرة', quantity: 3, unit: 'can', unit_display: 'علبة', unit_price: 8.0, reason: 'علب معطوبة' }
        ],
        total_amount: 146.5
    };

    const handlePrintTest = () => {
        window.print();
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 flex flex-col space-y-4">
            {/* Top Bar: Selector & Print Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setPreviewType('sales')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                            previewType === 'sales'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        فاتورة البيع
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewType('purchases')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                            previewType === 'purchases'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        فاتورة الشراء
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewType('returns')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                            previewType === 'returns'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        مرتجع الشراء
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <span className="text-[11px] font-bold text-gray-400 hidden sm:inline">
                        <Eye className="w-3.5 h-3.5 inline ml-1" />
                        معاينة تفاعلية حية
                    </span>
                    <button
                        type="button"
                        onClick={handlePrintTest}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
                        title="تجربة طباعة المعاينة الحالية على الطابعة أو كملف PDF"
                    >
                        <Printer className="w-4 h-4" />
                        <span>طباعة تجريبية</span>
                    </button>
                </div>
            </div>

            {/* Preview Viewport */}
            <div
                ref={printableAreaRef}
                className="overflow-y-auto max-h-[620px] p-4 sm:p-6 bg-gray-200/60 dark:bg-gray-950/60 rounded-2xl flex items-center justify-center min-h-[450px]"
            >
                {previewType === 'sales' && (
                    <div id="printable-sales-invoice">
                        <SalesInvoiceDocument
                            settings={settings}
                            invoiceData={mockSalesData}
                            isPrintPreview={true}
                        />
                    </div>
                )}

                {previewType === 'purchases' && (
                    <div id="printable-purchase-invoice" className="w-full">
                        <PurchaseInvoiceDocument
                            settings={settings}
                            invoiceData={mockPurchaseData}
                            isPrintPreview={true}
                        />
                    </div>
                )}

                {previewType === 'returns' && (
                    <div id="printable-return-invoice" className="w-full">
                        <PurchaseReturnDocument
                            settings={settings}
                            returnData={mockReturnData}
                            isPrintPreview={true}
                        />
                    </div>
                )}
            </div>

            <div className="text-center text-[11px] text-gray-400 font-medium">
                💡 أي تعديل على القوالب، الشعار، الباركود، أو نصوص التذييل والشروط يظهر فوراً في المعاينة أعلاه.
            </div>
        </div>
    );
}
