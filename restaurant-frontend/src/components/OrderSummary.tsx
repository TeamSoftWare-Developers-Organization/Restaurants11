'use client';

import { useCartStore } from '@/store/cartStore';

export default function OrderSummary() {
    const { items, getTotals } = useCartStore();
    const { subtotal, taxAmount, total } = getTotals();

    return (
        <div className="p-6 bg-card dark:bg-card rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-sm transition-all" dir="rtl">
            <h2 className="text-base font-black text-gray-900 dark:text-white mb-5">ملخص الطلب</h2>

            {/* عرض الأصناف - Comfortable */}
            <div className="space-y-3 mb-6">
                {items.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400 font-bold opacity-50 italic">لا توجد أصناف حالياً</div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-100/30 dark:border-gray-800/20">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-800 dark:text-gray-200 text-xs leading-tight">{item.name}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1.5 opacity-70">الكمية: {item.quantity}</span>
                            </div>
                            <span className="font-black text-indigo-600 text-sm tabular-nums">{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))
                )}
            </div>

            <div className="border-t border-gray-50 dark:border-gray-800/40 pt-5 space-y-2.5">
                <div className="flex justify-between text-gray-400 text-[11px] font-bold uppercase tracking-widest leading-none">
                    <span>الفرعي:</span>
                    <span className="text-gray-600 dark:text-gray-400">{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-4 border-t border-gray-100 dark:border-gray-800/40 mt-3">
                    <span className="text-sm font-black text-gray-900 dark:text-white">الإجمالي النهائي:</span>
                    <span className="text-xl font-black text-indigo-600 italic">{total.toFixed(2)} <span className="text-[10px] not-italic mr-0.5">د.ل</span></span>
                </div>
            </div>
        </div>
    );
}
