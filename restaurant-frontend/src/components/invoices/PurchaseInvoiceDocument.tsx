'use client';

import React from 'react';
import { RestaurantSettings } from '@/services/settingsService';

export interface PurchaseInvoiceItem {
    id: number | string;
    ingredient_name: string;
    quantity: number;
    unit?: string;
    unit_display?: string;
    unit_price: number;
    total_price: number;
}

export interface PurchaseInvoiceData {
    id: number | string;
    invoice_number: string;
    supplier_name: string;
    supplier_company?: string;
    supplier_phone?: string;
    supplier_tax_number?: string;
    invoice_date: string;
    status_display?: string;
    items: PurchaseInvoiceItem[];
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    notes?: string;
}

interface PurchaseInvoiceDocumentProps {
    settings: RestaurantSettings | null;
    invoiceData: PurchaseInvoiceData;
    templateOverride?: 'classic_clean' | 'corporate_table';
    isPrintPreview?: boolean;
}

export default function PurchaseInvoiceDocument({
    settings,
    invoiceData,
    templateOverride,
    isPrintPreview = false,
}: PurchaseInvoiceDocumentProps) {
    const template = templateOverride || settings?.purchase_invoice_template || 'classic_clean';
    const showLogo = settings?.show_logo_purchases !== false;
    const currency = settings?.currency || 'د.ل';

    const getFullLogoUrl = (path?: string) => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const backendBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
        return `${backendBase}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    // ==========================================
    // 1. CORPORATE MODERN TABLE TEMPLATE
    // ==========================================
    if (template === 'corporate_table') {
        return (
            <div
                className={`mx-auto bg-white text-gray-900 font-sans ${
                    isPrintPreview ? 'shadow-xl border border-gray-200 rounded-2xl p-6 sm:p-8 max-w-3xl' : 'w-full p-8'
                }`}
                style={{ direction: 'rtl', minHeight: '650px' }}
            >
                {/* Header */}
                <div className="flex items-start justify-between pb-6 border-b-2 border-emerald-600 mb-6">
                    <div className="space-y-1">
                        {showLogo && settings?.logo && (
                            <img
                                src={getFullLogoUrl(settings.logo)}
                                alt="Logo"
                                className="h-14 object-contain mb-2"
                            />
                        )}
                        <h1 className="text-2xl font-black text-gray-900">{settings?.name || 'مطعمنا'}</h1>
                        <p className="text-xs text-gray-500 font-semibold">{settings?.address || 'العنوان الرئيسي'}</p>
                        {settings?.tax_number && (
                            <p className="text-xs text-gray-700 font-bold">الرقم الضريبي للمنشأة: {settings.tax_number}</p>
                        )}
                    </div>

                    <div className="text-left space-y-1.5">
                        <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-black text-xs rounded-lg border border-emerald-200">
                            فاتورة توريد مواد خام (مشتريات)
                        </span>
                        <div className="text-base font-black text-gray-900">
                            رقم الفاتورة: <span className="font-mono text-emerald-600">#{invoiceData.invoice_number}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-semibold">
                            تاريخ الفاتورة: {invoiceData.invoice_date}
                        </div>
                        <div className="text-xs">
                            <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800">
                                {invoiceData.status_display || 'مرحل للمخزن'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Supplier & Delivery Info Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1 text-xs">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">
                            بيانات المورد
                        </span>
                        <div className="font-black text-sm text-gray-900">{invoiceData.supplier_name}</div>
                        {invoiceData.supplier_company && (
                            <div className="text-gray-600 font-semibold">{invoiceData.supplier_company}</div>
                        )}
                        {invoiceData.supplier_phone && (
                            <div className="text-gray-600 font-mono" dir="ltr">هاتف: {invoiceData.supplier_phone}</div>
                        )}
                        {invoiceData.supplier_tax_number && (
                            <div className="text-gray-600">الرقم الضريبي للمورد: {invoiceData.supplier_tax_number}</div>
                        )}
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                            بيانات الاستلام والتسوية
                        </span>
                        <div className="flex justify-between">
                            <span className="text-gray-600">طريقة الدفع:</span>
                            <span className="font-bold text-gray-900">
                                {invoiceData.remaining_amount <= 0 ? 'مسدد بالكامل' : 'آجل / جزئي'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">حالة المستودع:</span>
                            <span className="font-bold text-emerald-600">تم إدخال الكميات للأرصدة ✔</span>
                        </div>
                        <div className="text-gray-500 text-[11px] pt-1">
                            {settings?.purchase_invoice_terms || 'تم فحص ومطابقة البضاعة المستلمة.'}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-emerald-600 text-white font-bold">
                            <tr>
                                <th className="p-3 w-10 text-center">#</th>
                                <th className="p-3">المادة الخام</th>
                                <th className="p-3 text-center">الكمية المستلمة</th>
                                <th className="p-3 text-center">سعر الوحدة</th>
                                <th className="p-3 text-left">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {invoiceData.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/60">
                                    <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                                    <td className="p-3 font-black text-gray-900">{item.ingredient_name}</td>
                                    <td className="p-3 text-center font-bold font-mono">
                                        {item.quantity} {item.unit_display || item.unit || ''}
                                    </td>
                                    <td className="p-3 text-center font-bold font-mono">{item.unit_price.toFixed(2)}</td>
                                    <td className="p-3 text-left font-black font-mono text-gray-900">
                                        {item.total_price.toFixed(2)} {currency}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Financial Summary */}
                <div className="flex justify-end mb-8">
                    <div className="w-72 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-gray-600">
                            <span>إجمالي الفاتورة:</span>
                            <span className="font-mono text-gray-900">{invoiceData.total_amount.toFixed(2)} {currency}</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-600">
                            <span>المدفوع نقداً:</span>
                            <span className="font-mono">{invoiceData.paid_amount.toFixed(2)} {currency}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-300 font-black text-rose-600 text-sm">
                            <span>المتبقي آجل على المنشأة:</span>
                            <span className="font-mono text-base">{invoiceData.remaining_amount.toFixed(2)} {currency}</span>
                        </div>
                    </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-600">
                    <div>
                        <p className="font-bold mb-10 text-gray-800">توقيع واستلام أمين المستودع</p>
                        <div className="border-b border-gray-400 w-44 mx-auto" />
                    </div>
                    <div>
                        <p className="font-bold mb-10 text-gray-800">توقيع مندوب المورد / الموزع</p>
                        <div className="border-b border-gray-400 w-44 mx-auto" />
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. CLASSIC CLEAN TEMPLATE (Default)
    // ==========================================
    return (
        <div
            className={`mx-auto bg-white text-gray-900 font-sans ${
                isPrintPreview ? 'shadow-xl border border-gray-200 rounded-2xl p-6 sm:p-8 max-w-3xl' : 'w-full p-8'
            }`}
            style={{ direction: 'rtl', minHeight: '600px' }}
        >
            {/* Header */}
            <div className="flex items-start justify-between pb-6 border-b border-gray-200 mb-6">
                <div>
                    {showLogo && settings?.logo && (
                        <img
                            src={getFullLogoUrl(settings.logo)}
                            alt="Logo"
                            className="h-12 object-contain mb-2"
                        />
                    )}
                    <h2 className="text-xl font-black text-gray-900">{settings?.name || 'مطعمنا'}</h2>
                    <p className="text-xs text-gray-500 font-medium">{settings?.address || 'الفرع الرئيسي'}</p>
                    {settings?.phone && <p className="text-xs text-gray-500 font-medium">هاتف: {settings.phone}</p>}
                    {settings?.tax_number && (
                        <p className="text-xs text-gray-600 font-bold">الرقم الضريبي: {settings.tax_number}</p>
                    )}
                </div>

                <div className="text-left space-y-1">
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 font-black text-xs rounded-md">
                        فاتورة شراء مواد خام
                    </span>
                    <div className="text-sm font-bold text-gray-700">
                        رقم الفاتورة: <span className="font-mono text-black font-black">#{invoiceData.invoice_number}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">التاريخ: {invoiceData.invoice_date}</div>
                </div>
            </div>

            {/* Supplier Banner */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200 mb-6 text-xs">
                <div>
                    <span className="text-gray-400 font-bold block mb-0.5">المورد</span>
                    <span className="font-black text-sm text-gray-900">{invoiceData.supplier_name}</span>
                    {invoiceData.supplier_company && (
                        <span className="text-gray-500 mr-2">({invoiceData.supplier_company})</span>
                    )}
                </div>
                {invoiceData.supplier_phone && (
                    <div>
                        <span className="text-gray-400 font-bold block mb-0.5">هاتف المورد</span>
                        <span className="font-mono font-bold text-gray-700" dir="ltr">{invoiceData.supplier_phone}</span>
                    </div>
                )}
                <div>
                    <span className="text-gray-400 font-bold block mb-0.5">حالة الترحيل</span>
                    <span className="font-bold text-emerald-600">مرحل للمخزن ✔</span>
                </div>
            </div>

            {/* Items Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-right text-xs">
                    <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                        <tr>
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3">المادة الخام</th>
                            <th className="p-3 text-center">الكمية</th>
                            <th className="p-3 text-center">سعر الوحدة</th>
                            <th className="p-3 text-left">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invoiceData.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                                <td className="p-3 font-bold text-gray-900">{item.ingredient_name}</td>
                                <td className="p-3 text-center font-semibold font-mono">
                                    {item.quantity} {item.unit_display || item.unit || ''}
                                </td>
                                <td className="p-3 text-center font-mono">{item.unit_price.toFixed(2)}</td>
                                <td className="p-3 text-left font-black font-mono text-gray-900">
                                    {item.total_price.toFixed(2)} {currency}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5 text-xs mb-8">
                <div className="flex justify-between font-semibold text-gray-600">
                    <span>إجمالي قيمة الفاتورة:</span>
                    <span className="font-mono font-bold text-gray-900">{invoiceData.total_amount.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-600">
                    <span>المدفوع نقداً (كاش):</span>
                    <span className="font-mono font-bold">{invoiceData.paid_amount.toFixed(2)} {currency}</span>
                </div>
                <div className="border-t border-gray-200 pt-1.5 flex justify-between font-black text-rose-600 text-sm">
                    <span>المتبقي آجل على المنشأة:</span>
                    <span className="font-mono">{invoiceData.remaining_amount.toFixed(2)} {currency}</span>
                </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-600">
                <div>
                    <p className="font-bold mb-10">توقيع المسؤول / أمين المخزن</p>
                    <div className="border-b border-gray-300 w-40 mx-auto" />
                </div>
                <div>
                    <p className="font-bold mb-10">توقيع واستلام المورد</p>
                    <div className="border-b border-gray-300 w-40 mx-auto" />
                </div>
            </div>
        </div>
    );
}
