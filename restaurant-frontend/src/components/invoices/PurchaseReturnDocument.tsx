'use client';

import React from 'react';
import { RestaurantSettings } from '@/services/settingsService';

export interface PurchaseReturnItem {
    ingredient_name?: string;
    quantity: number;
    unit?: string;
    unit_display?: string;
    unit_price: number;
    reason?: string;
}

export interface PurchaseReturnData {
    id: number | string;
    return_number: string;
    invoice_number?: string;
    supplier_name: string;
    supplier_company?: string;
    supplier_phone?: string;
    return_date?: string;
    created_at?: string;
    refund_method: 'CASH' | 'DEBT_REDUCTION' | string;
    reason?: string;
    items: PurchaseReturnItem[];
    total_amount: number;
}

interface PurchaseReturnDocumentProps {
    settings: RestaurantSettings | null;
    returnData: PurchaseReturnData;
    templateOverride?: 'standard_voucher' | 'detailed_voucher';
    isPrintPreview?: boolean;
}

export default function PurchaseReturnDocument({
    settings,
    returnData,
    templateOverride,
    isPrintPreview = false,
}: PurchaseReturnDocumentProps) {
    const template = templateOverride || settings?.purchase_return_template || 'standard_voucher';
    const showLogo = settings?.show_logo_returns !== false;
    const currency = settings?.currency || 'د.ل';

    const getFullLogoUrl = (path?: string) => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const backendBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
        return `${backendBase}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    // ==========================================
    // 1. DETAILED VOUCHER TEMPLATE (Advanced)
    // ==========================================
    if (template === 'detailed_voucher') {
        return (
            <div
                className={`mx-auto bg-white text-gray-900 font-sans ${
                    isPrintPreview ? 'shadow-xl border border-gray-200 rounded-2xl p-6 sm:p-8 max-w-3xl' : 'w-full p-8'
                }`}
                style={{ direction: 'rtl', minHeight: '650px' }}
            >
                {/* Header */}
                <div className="flex items-start justify-between pb-6 border-b-2 border-rose-600 mb-6">
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
                        {settings?.phone && <p className="text-xs text-gray-500 font-semibold">هاتف: {settings.phone}</p>}
                        {settings?.tax_number && (
                            <p className="text-xs text-gray-700 font-bold">الرقم الضريبي: {settings.tax_number}</p>
                        )}
                    </div>

                    <div className="text-left space-y-1.5">
                        <span className="inline-block px-3 py-1 bg-rose-50 text-rose-700 font-black text-xs rounded-lg border border-rose-200">
                            إشعار مدين / سند مرتجع مشتريات رسمي
                        </span>
                        <div className="text-base font-black text-gray-900">
                            رقم السند: <span className="font-mono text-rose-600">#{returnData.return_number}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-semibold">
                            تاريخ السند: {returnData.return_date || returnData.created_at}
                        </div>
                        {returnData.invoice_number && (
                            <div className="text-xs text-gray-700 font-bold">
                                مرجع الفاتورة الأصلية: <span className="font-mono">#{returnData.invoice_number}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details Banner */}
                <div className="grid grid-cols-2 gap-4 bg-rose-50/50 p-4 rounded-xl border border-rose-100 mb-6 text-xs">
                    <div>
                        <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block mb-1">
                            بيانات المورد المستلم
                        </span>
                        <div className="font-black text-sm text-gray-900">{returnData.supplier_name}</div>
                        {returnData.supplier_company && (
                            <div className="text-gray-600 font-medium">{returnData.supplier_company}</div>
                        )}
                        {returnData.supplier_phone && (
                            <div className="text-gray-600 font-mono" dir="ltr">هاتف: {returnData.supplier_phone}</div>
                        )}
                    </div>

                    <div>
                        <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block mb-1">
                            طريقة التسوية المحاسبية
                        </span>
                        <div className="font-black text-sm text-gray-900">
                            {returnData.refund_method === 'CASH'
                                ? 'استرداد نقدي فوري (إيداع بالخزينة)'
                                : 'خصم من رصيد ومستحقات المورد (آجل)'}
                        </div>
                        {returnData.reason && (
                            <div className="text-gray-600 text-xs mt-1">
                                سبب الإرجاع الرئيسي: {returnData.reason}
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-rose-600 text-white font-bold">
                            <tr>
                                <th className="p-3 w-10 text-center">#</th>
                                <th className="p-3">المادة الخام المرتجعة</th>
                                <th className="p-3 text-center">الكمية</th>
                                <th className="p-3 text-center">سعر الوحدة</th>
                                <th className="p-3 text-left">قيمة الاسترداد</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {returnData.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                                    <td className="p-3 font-bold text-gray-900">
                                        {item.ingredient_name}
                                        {item.reason && (
                                            <span className="block text-[10px] text-rose-600 font-normal">
                                                * سبب الإرجاع: {item.reason}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center font-bold font-mono">
                                        {item.quantity} {item.unit_display || item.unit || ''}
                                    </td>
                                    <td className="p-3 text-center font-bold font-mono">
                                        {Number(item.unit_price).toFixed(2)}
                                    </td>
                                    <td className="p-3 text-left font-black font-mono text-rose-600">
                                        {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)} {currency}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-rose-50 font-black border-t-2 border-rose-200">
                            <tr>
                                <td colSpan={4} className="p-3.5 text-left text-sm text-gray-900">
                                    إجمالي قيمة المرتجع المسترد:
                                </td>
                                <td className="p-3.5 text-left text-base text-rose-600 font-mono">
                                    {Number(returnData.total_amount).toFixed(2)} {currency}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Terms / Policy */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 mb-8 leading-relaxed">
                    <p className="font-bold text-gray-800 mb-0.5">شروط واعتماد السند:</p>
                    <p>{settings?.purchase_return_terms || 'يعتبر هذا السند إشعار خصم رسمي معتمد لتسوية حساب المورد وخصم المواد من المخزون.'}</p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-600">
                    <div>
                        <p className="font-bold mb-10 text-gray-800">توقيع المسؤول / أمين المستودع</p>
                        <div className="border-b border-gray-400 w-44 mx-auto" />
                    </div>
                    <div>
                        <p className="font-bold mb-10 text-gray-800">توقيع واستلام مندوب المورد</p>
                        <div className="border-b border-gray-400 w-44 mx-auto" />
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. STANDARD VOUCHER TEMPLATE (Default)
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
                    <span className="inline-block px-3 py-1 bg-rose-100 text-rose-700 font-black text-xs rounded-md">
                        سند مرتجع مشتريات (إشعار خصم)
                    </span>
                    <div className="text-sm font-bold text-gray-700">
                        رقم السند: <span className="font-mono text-black font-black">#{returnData.return_number}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">التاريخ: {returnData.return_date || returnData.created_at || ''}</div>
                    {returnData.invoice_number && (
                        <div className="text-xs text-gray-600">مرجع الفاتورة: #{returnData.invoice_number}</div>
                    )}
                </div>
            </div>

            {/* Supplier Banner */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-xs">
                <div>
                    <span className="text-gray-400 font-bold block mb-1">المورد المستلم:</span>
                    <span className="font-black text-sm text-gray-900 block">{returnData.supplier_name}</span>
                    {returnData.supplier_company && (
                        <span className="text-gray-500 block">{returnData.supplier_company}</span>
                    )}
                </div>
                <div>
                    <span className="text-gray-400 font-bold block mb-1">طريقة التسوية:</span>
                    <span className="font-bold text-gray-800 block">
                        {returnData.refund_method === 'CASH' ? 'استرداد نقدي (كاش)' : 'خصم من رصيد المورد'}
                    </span>
                    {returnData.reason && (
                        <span className="text-gray-500 block mt-0.5">السبب: {returnData.reason}</span>
                    )}
                </div>
            </div>

            {/* Items Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 text-xs">
                <table className="w-full text-right">
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
                        {returnData.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                                <td className="p-3">
                                    <span className="font-bold text-gray-900 block">{item.ingredient_name}</span>
                                    {item.reason && <span className="text-[10px] text-gray-400 block">{item.reason}</span>}
                                </td>
                                <td className="p-3 text-center font-mono font-bold">
                                    {item.quantity} {item.unit_display || item.unit || ''}
                                </td>
                                <td className="p-3 text-center font-mono">
                                    {Number(item.unit_price).toFixed(2)}
                                </td>
                                <td className="p-3 text-left font-black font-mono text-rose-600">
                                    {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)} {currency}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-black border-t border-gray-200">
                        <tr>
                            <td colSpan={4} className="p-3 text-left text-sm">
                                إجمالي قيمة المرتجع المسترد:
                            </td>
                            <td className="p-3 text-left text-sm text-rose-600 font-mono">
                                {Number(returnData.total_amount).toFixed(2)} {currency}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-center text-xs text-gray-600 mt-8">
                <div>
                    <p className="font-bold mb-10">توقيع المسؤول / أمين المخزن</p>
                    <div className="border-b border-gray-300 w-44 mx-auto" />
                </div>
                <div>
                    <p className="font-bold mb-10">توقيع واستلام المورد</p>
                    <div className="border-b border-gray-300 w-44 mx-auto" />
                </div>
            </div>
        </div>
    );
}
