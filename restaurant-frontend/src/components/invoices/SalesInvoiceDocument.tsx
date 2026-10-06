'use client';

import React from 'react';
import { RestaurantSettings } from '@/services/settingsService';
import InvoiceQRCode from './InvoiceQRCode';

function generateZatcaBase64TLV(
    sellerName: string,
    vatNumber: string,
    timestamp: string,
    total: number,
    taxAmount: number
): string {
    const fields = [sellerName, vatNumber, timestamp, total.toFixed(2), taxAmount.toFixed(2)];
    const bytes: number[] = [];

    fields.forEach((value, index) => {
        const encoded = new TextEncoder().encode(value);
        bytes.push(index + 1, encoded.length, ...encoded);
    });

    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
}

export interface SalesInvoiceItem {
    id: number | string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
}

export interface SalesInvoiceData {
    orderId: number | string;
    orderDate?: string;
    cashierName?: string;
    orderType?: string; // 'dine_in' | 'takeaway' | 'delivery'
    tableNumber?: string;
    items: SalesInvoiceItem[];
    subtotal: number;
    taxRate?: number;
    taxAmount?: number;
    discount?: number;
    deliveryFee?: number;
    total: number;
    paymentMethod?: string;
    cardProvider?: string;
}

interface SalesInvoiceDocumentProps {
    settings: RestaurantSettings | null;
    invoiceData: SalesInvoiceData;
    templateOverride?: 'thermal_80mm' | 'thermal_58mm' | 'detailed_a4';
    isPrintPreview?: boolean;
}

export default function SalesInvoiceDocument({
    settings,
    invoiceData,
    templateOverride,
    isPrintPreview = false,
}: SalesInvoiceDocumentProps) {
    const template = templateOverride || settings?.sales_invoice_template || 'thermal_80mm';
    const showLogo = settings?.show_logo_sales !== false;
    const showQR = settings?.show_qr_code !== false;
    const currency = settings?.currency || 'د.ل';
    const orderDate = invoiceData.orderDate || new Date().toISOString();

    const getFullLogoUrl = (path?: string) => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const backendBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
        return `${backendBase}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    // Calculate tax if not explicitly provided
    const taxRate = invoiceData.taxRate !== undefined ? invoiceData.taxRate : (settings?.tax_rate || 0);
    const taxAmount = invoiceData.taxAmount !== undefined 
        ? invoiceData.taxAmount 
        : (taxRate > 0 ? (invoiceData.subtotal * taxRate) / 100 : 0);

    // Generate ZATCA TLV Base64
    const tlvBase64 = generateZatcaBase64TLV(
        settings?.name || 'مطعمنا',
        settings?.tax_number || '300000000000003',
        orderDate,
        invoiceData.total,
        taxAmount
    );

    // ==========================================
    // 1. THERMAL 58MM TEMPLATE (Mobile POS)
    // ==========================================
    if (template === 'thermal_58mm') {
        return (
            <div
                className={`mx-auto bg-white text-black font-mono select-none ${
                    isPrintPreview ? 'shadow-lg border border-gray-300 rounded-lg p-2.5 max-w-[58mm]' : 'w-[58mm] p-1'
                }`}
                style={{ width: '58mm', fontSize: '10px', direction: 'rtl', color: '#000000' }}
            >
                {/* Logo & Header */}
                <div className="text-center pb-2 border-b border-dashed border-gray-400">
                    {showLogo && settings?.logo && (
                        <img
                            src={getFullLogoUrl(settings.logo)}
                            alt="Logo"
                            className="h-10 mx-auto object-contain mb-1"
                        />
                    )}
                    <h2 className="font-black text-xs">{settings?.name || 'مطعمنا'}</h2>
                    {settings?.phone && <div className="text-[9px]">{settings.phone}</div>}
                    {settings?.tax_number && <div className="text-[8px]">الرقم الضريبي: {settings.tax_number}</div>}
                    <div className="mt-1 font-bold text-[9px] bg-black text-white px-1 py-0.5 rounded">
                        فاتورة مبيعات
                    </div>
                </div>

                {/* Meta */}
                <div className="text-[9px] py-1.5 border-b border-dashed border-gray-400 space-y-0.5">
                    <div className="flex justify-between">
                        <span>رقم الطلب:</span>
                        <span className="font-bold">#{invoiceData.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>التاريخ:</span>
                        <span>{new Date(orderDate).toLocaleDateString('ar-LY')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>الوقت:</span>
                        <span>{new Date(orderDate).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {invoiceData.tableNumber && (
                        <div className="flex justify-between font-bold">
                            <span>الطاولة:</span>
                            <span>{invoiceData.tableNumber}</span>
                        </div>
                    )}
                </div>

                {/* Items */}
                <div className="py-1.5 border-b border-dashed border-gray-400">
                    <div className="flex justify-between font-bold text-[9px] border-b pb-0.5 mb-1">
                        <span>الصنف</span>
                        <span>الإجمالي</span>
                    </div>
                    <div className="space-y-1">
                        {invoiceData.items.map((item, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-[9px] leading-tight">
                                    <span className="font-bold truncate max-w-[34mm]">{item.name}</span>
                                    <span>{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-[8px] text-gray-600">
                                    <span>{item.quantity} × {item.price.toFixed(2)}</span>
                                    {item.notes && <span className="italic truncate">({item.notes})</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="py-1.5 border-b border-dashed border-gray-400 space-y-0.5 text-[9px]">
                    <div className="flex justify-between">
                        <span>المجموع:</span>
                        <span>{invoiceData.subtotal.toFixed(2)} {currency}</span>
                    </div>
                    {taxAmount > 0 && (
                        <div className="flex justify-between">
                            <span>الضريبة ({taxRate}%):</span>
                            <span>{taxAmount.toFixed(2)} {currency}</span>
                        </div>
                    )}
                    {invoiceData.discount ? (
                        <div className="flex justify-between text-red-600">
                            <span>الخصم:</span>
                            <span>-{invoiceData.discount.toFixed(2)} {currency}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
                        <span>الإجمالي:</span>
                        <span>{invoiceData.total.toFixed(2)} {currency}</span>
                    </div>
                </div>

                {/* QR Code */}
                {showQR && (
                    <div className="py-2 text-center border-b border-dashed border-gray-400">
                        <InvoiceQRCode value={tlvBase64} size={75} className="mx-auto" />
                        <div className="text-[7px] text-gray-500 mt-0.5">رمز التحقق الضريبي</div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center pt-2 text-[8px] space-y-0.5">
                    <p className="font-bold">{settings?.invoice_footer_message || 'شكراً لزيارتكم!'}</p>
                    {settings?.sales_invoice_terms && (
                        <p className="text-[7px] text-gray-500 leading-tight">{settings.sales_invoice_terms}</p>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. DETAILED A4/A5 TAX TEMPLATE (Corporate)
    // ==========================================
    if (template === 'detailed_a4') {
        return (
            <div
                className={`mx-auto bg-white text-gray-900 font-sans ${
                    isPrintPreview ? 'shadow-xl border border-gray-200 rounded-2xl p-6 sm:p-8 max-w-2xl' : 'w-full p-8'
                }`}
                style={{ direction: 'rtl', minHeight: '600px' }}
            >
                {/* Header Banner */}
                <div className="flex items-start justify-between pb-6 border-b-2 border-indigo-600 mb-6">
                    <div className="space-y-1">
                        {showLogo && settings?.logo && (
                            <img
                                src={getFullLogoUrl(settings.logo)}
                                alt="Logo"
                                className="h-14 object-contain mb-2"
                            />
                        )}
                        <h1 className="text-2xl font-black text-indigo-950">{settings?.name || 'مطعمنا'}</h1>
                        <p className="text-xs text-gray-600 font-semibold">{settings?.address || 'العنوان الرئيسي'}</p>
                        {settings?.phone && <p className="text-xs text-gray-600 font-semibold">هاتف: {settings.phone}</p>}
                        {settings?.tax_number && (
                            <p className="text-xs font-bold text-gray-700">الرقم الضريبي: {settings.tax_number}</p>
                        )}
                        {settings?.commercial_record && (
                            <p className="text-xs font-bold text-gray-700">السجل التجاري: {settings.commercial_record}</p>
                        )}
                    </div>

                    <div className="text-left space-y-2">
                        <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-black text-xs rounded-lg border border-indigo-200">
                            فاتورة ضريبية مبسطة
                        </span>
                        <div className="text-sm font-black text-gray-800">
                            رقم الفاتورة: <span className="font-mono text-indigo-600">#{invoiceData.orderId}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-semibold">
                            التاريخ: {new Date(orderDate).toLocaleDateString('ar-LY')}
                        </div>
                        <div className="text-xs text-gray-500 font-semibold">
                            الوقت: {new Date(orderDate).toLocaleTimeString('ar-LY')}
                        </div>
                        {invoiceData.tableNumber && (
                            <div className="text-xs font-bold text-gray-700">
                                الطاولة: {invoiceData.tableNumber}
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                            <tr>
                                <th className="p-3 w-10 text-center">#</th>
                                <th className="p-3">الصنف / الوجبة</th>
                                <th className="p-3 text-center">الكمية</th>
                                <th className="p-3 text-center">سعر الوحدة</th>
                                <th className="p-3 text-left">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {invoiceData.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                                    <td className="p-3 font-black text-gray-900">
                                        {item.name}
                                        {item.notes && (
                                            <span className="block text-[10px] text-gray-500 font-normal">
                                                * {item.notes}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center font-bold font-mono">{item.quantity}</td>
                                    <td className="p-3 text-center font-bold font-mono">{item.price.toFixed(2)}</td>
                                    <td className="p-3 text-left font-black font-mono text-gray-900">
                                        {(item.price * item.quantity).toFixed(2)} {currency}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Bottom Row: Summary & QR */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200 items-start">
                    {/* QR Code and Terms */}
                    <div className="flex items-start gap-4">
                        {showQR && (
                            <div className="p-2 border border-gray-200 rounded-xl bg-gray-50 shrink-0">
                                <InvoiceQRCode value={tlvBase64} size={95} />
                            </div>
                        )}
                        <div className="space-y-1.5 text-xs text-gray-600">
                            <p className="font-bold text-gray-800">{settings?.invoice_footer_message || 'شكراً لزيارتكم ونسعد بخدمتكم دائماً!'}</p>
                            <p className="text-[11px] leading-relaxed text-gray-500">
                                {settings?.sales_invoice_terms || 'الأسعار تشمل ضريبة القيمة المضافة إن وجدت.'}
                            </p>
                        </div>
                    </div>

                    {/* Totals Box */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                        <div className="flex justify-between font-semibold text-gray-600">
                            <span>المجموع الفرعي:</span>
                            <span className="font-mono font-bold">{invoiceData.subtotal.toFixed(2)} {currency}</span>
                        </div>
                        {taxAmount > 0 && (
                            <div className="flex justify-between font-semibold text-gray-600">
                                <span>ضريبة القيمة المضافة ({taxRate}%):</span>
                                <span className="font-mono font-bold">{taxAmount.toFixed(2)} {currency}</span>
                            </div>
                        )}
                        {invoiceData.discount ? (
                            <div className="flex justify-between font-semibold text-rose-600">
                                <span>قيمة الخصم:</span>
                                <span className="font-mono font-bold">-{invoiceData.discount.toFixed(2)} {currency}</span>
                            </div>
                        ) : null}
                        {invoiceData.deliveryFee ? (
                            <div className="flex justify-between font-semibold text-gray-600">
                                <span>رسوم التوصيل:</span>
                                <span className="font-mono font-bold">{invoiceData.deliveryFee.toFixed(2)} {currency}</span>
                            </div>
                        ) : null}
                        <div className="flex justify-between items-center pt-2 border-t-2 border-indigo-600 text-sm font-black text-indigo-950">
                            <span>المبلغ الإجمالي المستحق:</span>
                            <span className="font-mono text-base font-black text-indigo-600">
                                {invoiceData.total.toFixed(2)} {currency}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // 3. THERMAL 80MM TEMPLATE (Standard Cashier Default)
    // ==========================================
    return (
        <div
            className={`mx-auto bg-white text-black font-mono select-none ${
                isPrintPreview ? 'shadow-xl border border-gray-300 rounded-xl p-4 max-w-[80mm]' : 'w-[80mm] p-2'
            }`}
            style={{ width: '80mm', fontSize: '11px', direction: 'rtl', color: '#000000' }}
        >
            {/* Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-gray-400 space-y-1">
                {showLogo && settings?.logo && (
                    <img
                        src={getFullLogoUrl(settings.logo)}
                        alt="Logo"
                        className="h-14 mx-auto object-contain mb-1.5"
                    />
                )}
                <h1 className="font-black text-sm tracking-tight">{settings?.name || 'مطعمنا'}</h1>
                {settings?.address && <div className="text-[10px] text-gray-700">{settings.address}</div>}
                {settings?.phone && <div className="text-[10px] font-bold">هاتف: {settings.phone}</div>}
                {settings?.tax_number && (
                    <div className="text-[9px] font-bold">الرقم الضريبي: {settings.tax_number}</div>
                )}
                {settings?.commercial_record && (
                    <div className="text-[9px] text-gray-700">السجل التجاري: {settings.commercial_record}</div>
                )}
                <div className="mt-1 font-black text-[10px] border border-black px-2 py-0.5 rounded inline-block">
                    فاتورة ضريبية مبسطة
                </div>
            </div>

            {/* Order Details */}
            <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-1">
                <div className="flex justify-between">
                    <span>رقم الفاتورة:</span>
                    <span className="font-bold">#{invoiceData.orderId}</span>
                </div>
                <div className="flex justify-between">
                    <span>التاريخ والوقت:</span>
                    <span>{new Date(orderDate).toLocaleString('ar-LY', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                {invoiceData.cashierName && (
                    <div className="flex justify-between">
                        <span>الكاشير:</span>
                        <span>{invoiceData.cashierName}</span>
                    </div>
                )}
                {invoiceData.tableNumber && (
                    <div className="flex justify-between font-bold">
                        <span>الموقع / الطاولة:</span>
                        <span>{invoiceData.tableNumber}</span>
                    </div>
                )}
                {invoiceData.orderType && (
                    <div className="flex justify-between">
                        <span>نوع الطلب:</span>
                        <span className="font-bold">
                            {invoiceData.orderType === 'dine_in' ? 'محلي' : invoiceData.orderType === 'takeaway' ? 'سفري' : 'توصيل'}
                        </span>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="py-2 border-b-2 border-dashed border-gray-400">
                <div className="flex justify-between font-bold text-[10px] border-b border-gray-300 pb-1 mb-1.5">
                    <span>الصنف والكمية</span>
                    <span>الإجمالي</span>
                </div>
                <div className="space-y-1.5">
                    {invoiceData.items.map((item, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-[11px] leading-tight font-bold">
                                <span className="truncate max-w-[48mm]">{item.name}</span>
                                <span>{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[9px] text-gray-600">
                                <span>{item.quantity} × {item.price.toFixed(2)} {currency}</span>
                                {item.notes && <span className="italic truncate max-w-[30mm]">*{item.notes}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Totals */}
            <div className="py-2 border-b-2 border-dashed border-gray-400 space-y-1 text-[10px]">
                <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span className="font-bold">{invoiceData.subtotal.toFixed(2)} {currency}</span>
                </div>
                {taxAmount > 0 && (
                    <div className="flex justify-between">
                        <span>ضريبة القيمة المضافة ({taxRate}%):</span>
                        <span className="font-bold">{taxAmount.toFixed(2)} {currency}</span>
                    </div>
                )}
                {invoiceData.discount ? (
                    <div className="flex justify-between text-red-600">
                        <span>الخصم:</span>
                        <span className="font-bold">-{invoiceData.discount.toFixed(2)} {currency}</span>
                    </div>
                ) : null}
                {invoiceData.deliveryFee ? (
                    <div className="flex justify-between">
                        <span>خدمة التوصيل:</span>
                        <span className="font-bold">{invoiceData.deliveryFee.toFixed(2)} {currency}</span>
                    </div>
                ) : null}
                <div className="flex justify-between text-sm font-black pt-1.5 border-t border-black mt-1">
                    <span>الإجمالي المستحق:</span>
                    <span>{invoiceData.total.toFixed(2)} {currency}</span>
                </div>
                {invoiceData.paymentMethod && (
                    <div className="flex justify-between text-[9px] text-gray-700 pt-0.5">
                        <span>طريقة الدفع:</span>
                        <span className="font-bold">
                            {invoiceData.paymentMethod === 'card'
                                ? `بطاقة مصرفية (${invoiceData.cardProvider || 'إلكتروني'})`
                                : invoiceData.paymentMethod === 'debt'
                                ? 'آجل'
                                : 'نقدي'}
                        </span>
                    </div>
                )}
            </div>

            {/* QR Code */}
            {showQR && (
                <div className="py-3 text-center border-b border-dashed border-gray-400">
                    <InvoiceQRCode value={tlvBase64} size={90} className="mx-auto" />
                    <div className="text-[8px] text-gray-500 mt-1 font-sans">
                        رمز التحقق الضريبي المعتمد (ZATCA TLV)
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center pt-2 text-[9px] space-y-1">
                <p className="font-bold text-[10px]">{settings?.invoice_footer_message || 'شكراً لزيارتكم، نتمنى لكم يوماً سعيداً!'}</p>
                {settings?.sales_invoice_terms && (
                    <p className="text-[8px] text-gray-600 leading-tight">{settings.sales_invoice_terms}</p>
                )}
                <p className="text-[7px] text-gray-400 pt-1">نظام إدارة المطاعم الذكي</p>
            </div>
        </div>
    );
}
