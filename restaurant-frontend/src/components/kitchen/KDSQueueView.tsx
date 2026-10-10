"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

interface KDSItem {
  item_id: number;
  name: string;
  quantity: number;
  duration_minutes: number;
  fire_delay_minutes: number;
}

interface KDSOrder {
  order_id: number;
  order_number: string;
  table_number: string | null;
  total_prep_time_minutes: number;
  estimated_ready_at: string;
  kitchen_load_factor: number;
  items: KDSItem[];
}

export default function KDSQueueView() {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKDS = async () => {
    try {
      const res = await api.get("/orders/kitchen/ai/kds-queue/");
      setOrders(res.data);
    } catch (err) {
      console.error("فشل جلب بيانات شاشة المطبخ", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    try {
      await api.post(`/orders/kitchen/ai/kds-queue/${orderId}/complete/`);
    } catch (err) {
      console.error("فشل تحديث حالة الطلب", err);
    }
    fetchKDS();
  };

  useEffect(() => {
    fetchKDS();
    const interval = setInterval(fetchKDS, 10000); // تحديث دوري كل 10 ثوانٍ
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 dark:text-slate-400 font-bold text-sm">
        جاري تحميل مهام المطبخ...
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 bg-transparent text-gray-900 dark:text-slate-100 min-h-full transition-colors duration-300" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <span>🍳</span> شاشة المطبخ الذكية (AI KDS Dispatcher)
          </h1>
          <p className="text-xs sm:text-[13px] text-gray-500 dark:text-slate-400 font-bold opacity-80 mt-1">
            جدولة الطهي المتزامن لضمان تسليم الوجبات ساخنة في نفس الوقت
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchKDS}
            className="flex-1 sm:flex-none bg-white dark:bg-[#131b2e] hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer text-center"
          >
            تحديث فوري 🔄
          </button>
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-blue-400 shadow-xs whitespace-nowrap">
            عدد الطلبات النشطة: {orders.length}
          </div>
        </div>
      </div>

      {/* الحالة الفارغة */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800/80 rounded-2xl text-center shadow-xs">
          <span className="text-5xl mb-3">👨‍🍳</span>
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">لا توجد طلبات معلقة في المطبخ حالياً</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">جميع الطلبات جاهزة وتم تسليمها</p>
        </div>
      ) : (
        /* شبكة بطاقات الطلبات */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((ord) => (
            <div
              key={ord.order_id}
              className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* ترويسة الطلب */}
              <div className="bg-gray-50/90 dark:bg-[#1a233a] p-4 flex justify-between items-center border-b border-gray-200 dark:border-slate-800">
                <div>
                  <span className="font-black text-gray-900 dark:text-white text-base">{ord.order_number}</span>
                  {ord.table_number && (
                    <span className="text-xs text-gray-500 dark:text-slate-400 mr-2 font-medium">| طاولة {ord.table_number}</span>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-black block">جاهز عند {ord.estimated_ready_at}</span>
                  <span className="text-[11px] text-gray-400 dark:text-slate-400 font-bold">{ord.total_prep_time_minutes} دقيقة</span>
                </div>
              </div>

              {/* بنود الطلب مع توقيت البدء (Firing Schedule) */}
              <div className="p-4 space-y-3 flex-1 bg-white dark:bg-[#131b2e]">
                {ord.items.map((item) => (
                  <div
                    key={item.item_id}
                    className="bg-gray-50 dark:bg-[#0b1120] p-3.5 rounded-xl border border-gray-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-sm text-gray-900 dark:text-slate-200">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-500 block font-medium mt-0.5">
                        وقت الطهي: {item.duration_minutes} دقيقة
                      </span>
                    </div>

                    {item.fire_delay_minutes === 0 ? (
                      <span className="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 text-xs px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 font-black animate-pulse whitespace-nowrap">
                        ابدأ التحضير الآن 🔥
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 text-xs px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20 font-bold whitespace-nowrap">
                        انتظر {item.fire_delay_minutes} دقيقة ⏳
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* شريط الإجراء السريع */}
              <div className="p-3 bg-gray-50/60 dark:bg-[#0f172a] border-t border-gray-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => handleCompleteOrder(ord.order_id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-xl font-black shadow-xs shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  اكتمال الطلب بالكامل ✓
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
