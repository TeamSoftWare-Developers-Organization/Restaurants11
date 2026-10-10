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
    return <div className="p-8 text-center text-slate-400">جاري تحميل مهام المطبخ...</div>;
  }

  return (
    <div className="p-6 bg-[#0b1120] min-h-screen text-slate-100" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>🍳</span> شاشة المطبخ الذكية (AI KDS Dispatcher)
          </h1>
          <p className="text-xs text-slate-400 mt-1">جدولة الطهي المتزامن لضمان تسليم الوجبات ساخنة في نفس الوقت</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchKDS}
            className="bg-[#131b2e] hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 transition"
          >
            تحديث فوري 🔄
          </button>
          <div className="bg-[#131b2e] border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold text-blue-400">
            عدد الطلبات النشطة: {orders.length}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#131b2e] border border-slate-800 rounded-2xl text-center">
          <span className="text-5xl mb-3">👨‍🍳</span>
          <h3 className="text-lg font-bold text-white mb-1">لا توجد طلبات معلقة في المطبخ حالياً</h3>
          <p className="text-xs text-slate-400">جميع الطلبات جاهزة وتم تسليمها</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((ord) => (
            <div
              key={ord.order_id}
              className="bg-[#131b2e] border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between"
            >
              {/* الترويسة */}
              <div className="bg-[#1a233a] p-4 flex justify-between items-center border-b border-slate-800">
                <div>
                  <span className="font-bold text-white text-base">{ord.order_number}</span>
                  {ord.table_number && (
                    <span className="text-xs text-slate-400 mr-2">| طاولة {ord.table_number}</span>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-xs text-emerald-400 font-bold block">جاهز عند {ord.estimated_ready_at}</span>
                  <span className="text-[11px] text-slate-400">{ord.total_prep_time_minutes} دقيقة</span>
                </div>
              </div>

              {/* بنود الطلب مع توقيت البدء (Firing Schedule) */}
              <div className="p-4 space-y-3 flex-1">
                {ord.items.map((item) => (
                  <div
                    key={item.item_id}
                    className="bg-[#0b1120] p-3 rounded-xl border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-sm text-slate-200">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-xs text-slate-500 block">وقت الطهي: {item.duration_minutes} دقيقة</span>
                    </div>

                    {item.fire_delay_minutes === 0 ? (
                      <span className="bg-rose-500/20 text-rose-400 text-xs px-2.5 py-1 rounded-lg border border-rose-500/30 font-bold animate-pulse">
                        ابدأ التحضير الآن 🔥
                      </span>
                    ) : (
                      <span className="bg-amber-500/10 text-amber-300 text-xs px-2.5 py-1 rounded-lg border border-amber-500/20 font-medium">
                        انتظر {item.fire_delay_minutes} دقيقة ⏳
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* شريط الإجراء السريع */}
              <div className="p-3 bg-[#0f172a] border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => handleCompleteOrder(ord.order_id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-xl font-bold transition"
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
