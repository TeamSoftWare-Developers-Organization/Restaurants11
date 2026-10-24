"use client";

import { useKDSQueue } from "@/hooks/useKDSQueue";
import { Clock, ChefHat, Flame, Hourglass, CheckCircle2, RotateCw } from "lucide-react";

export default function KDSQueueView() {
  const { orders, loading, currentLoadStatus, fetchKDS, completeOrder } = useKDSQueue(8000);

  // Guard Clause: Loading state
  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 dark:text-slate-400 font-bold text-sm flex items-center justify-center gap-2">
        <RotateCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span>جاري حساب أوقات تحضير الوجبات بالذكاء الاصطناعي...</span>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 bg-transparent text-gray-900 dark:text-slate-100 min-h-full transition-colors duration-300" dir="rtl">
      {/* رأس الصفحة ومؤشرات ضغط المطبخ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <ChefHat className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              شاشة المطبخ الذكية (AI KDS Dispatcher)
            </h1>
          </div>
          <p className="text-xs sm:text-[13px] text-gray-500 dark:text-slate-400 font-bold opacity-80 mt-1">
            حساب دقيق لأوقات طهي الوجبات وجدولة متزامنة لضمان تسليم الأصناف ساخنة معاً
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* مؤشر ضغط المطبخ */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-black text-gray-800 dark:text-gray-200 shadow-xs flex items-center gap-1.5">
            <span className="text-gray-400 text-[11px]">حالة المطبخ:</span>
            <span>{currentLoadStatus}</span>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3.5 py-2 rounded-xl text-xs font-black text-emerald-700 dark:text-emerald-300 shadow-xs whitespace-nowrap">
            الطلبات النشطة: {orders.length}
          </div>

          <button
            onClick={fetchKDS}
            className="flex-1 sm:flex-none bg-white dark:bg-[#131b2e] hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* الحالة الفارغة */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800/80 rounded-2xl text-center shadow-xs">
          <span className="text-5xl mb-3">👨‍🍳</span>
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">لا توجد طلبات معلقة في المطبخ حالياً</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">جميع الوجبات مكتملة وتم تسليمها للزبائن</p>
        </div>
      ) : (
        /* شبكة بطاقات الطلبات مع أوقات التحضير المحسوبة */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((ord) => {
            const isDelayed = typeof ord.remaining_minutes === "number" && ord.remaining_minutes <= 0 && (ord.elapsed_minutes || 0) > ord.total_prep_time_minutes;

            return (
              <div
                key={ord.order_id}
                className={`bg-white dark:bg-[#131b2e] border ${
                  isDelayed
                    ? "border-rose-400 dark:border-rose-800 ring-2 ring-rose-500/10"
                    : "border-gray-200 dark:border-slate-800"
                } rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between`}
              >
                {/* ترويسة الطلب ومؤقت التحضير */}
                <div className="bg-gray-50/90 dark:bg-[#1a233a] p-4 flex justify-between items-center border-b border-gray-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900 dark:text-white text-base">{ord.order_number}</span>
                      {ord.table_number && (
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-bold">
                          | {ord.table_number.includes("سفري") ? ord.table_number : `طاولة ${ord.table_number}`}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-400 font-medium mt-0.5 block">
                      الوقت اللازم للتحضير: <strong className="text-emerald-600 dark:text-emerald-400 font-black">{ord.total_prep_time_minutes} دقيقة</strong>
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-black block flex items-center gap-1 justify-end">
                      <Clock className="w-3.5 h-3.5" />
                      جاهز عند {ord.estimated_ready_at}
                    </span>
                    {typeof ord.remaining_minutes === "number" && (
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${
                          isDelayed
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {isDelayed
                          ? `تأخر ${Math.round((ord.elapsed_minutes || 0) - ord.total_prep_time_minutes)} دقيقة`
                          : `متبقي ~${Math.ceil(ord.remaining_minutes)} دقيقة`}
                      </span>
                    )}
                  </div>
                </div>

                {/* بنود الطلب مع وقت الطهي ومحطة التحضير */}
                <div className="p-4 space-y-3 flex-1 bg-white dark:bg-[#131b2e]">
                  {ord.items.map((item) => (
                    <div
                      key={item.item_id}
                      className="bg-gray-50/80 dark:bg-[#0b1120] p-3.5 rounded-xl border border-gray-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-gray-900 dark:text-slate-100">
                            {item.quantity}x {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 bg-gray-200/60 dark:bg-gray-800 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            <span>وقت الطهي: {item.duration_minutes} دقيقة</span>
                          </span>

                          {item.station_name && (
                            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-indigo-100 dark:border-indigo-900/50">
                              <span>{item.station_icon || "🍳"}</span>
                              <span>{item.station_name}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* توقيت أمر البدء (Fire Timing) */}
                      <div>
                        {item.fire_delay_minutes === 0 ? (
                          <span className="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 text-xs px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/30 font-black animate-pulse whitespace-nowrap flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-rose-600" />
                            <span>ابدأ التحضير الآن</span>
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 text-xs px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-500/20 font-bold whitespace-nowrap flex items-center gap-1">
                            <Hourglass className="w-3.5 h-3.5 text-amber-600" />
                            <span>انتظر {item.fire_delay_minutes} دقيقة</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* شريط الإجراء السريع */}
                <div className="p-3 bg-gray-50/60 dark:bg-[#0f172a] border-t border-gray-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[11px] text-gray-400 font-bold">
                    معامل ضغط: {ord.kitchen_load_factor}x
                  </span>
                  <button
                    onClick={() => completeOrder(ord.order_id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-xl font-black shadow-xs shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>اكتمال الطلب بالكامل</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
