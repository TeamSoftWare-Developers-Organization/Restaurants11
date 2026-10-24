"use client";

import { useReservationRisk } from "@/hooks/useReservationRisk";
import { RISK_LEVEL_MAP } from "@/constants";

export default function AIReservationRiskWidget() {
  const { risks, loading } = useReservationRisk();

  // Guard Clause: الخروج المبكر إذا كانت البيانات غير متوفرة أو في وضع التحميل
  if (loading || risks.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#131b2e] border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-4 sm:p-5 mb-6 shadow-xs transition-colors duration-300" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-lg">🎯</span>
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">تنبؤات الحضور الذكية (AI No-Show Guard)</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-bold mt-0.5">كشف الحجوزات المعرضة للإلغاء أو التخلف لحماية إشغال الصالة</p>
          </div>
        </div>
        <span className="text-xs bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-transparent px-3 py-1 rounded-full font-black w-fit">
          {risks.length} حجوزات معرضة للإلغاء
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {risks.map((item) => {
          const riskConfig = RISK_LEVEL_MAP[item.risk_level];

          return (
            <div
              key={item.reservation_id}
              className="p-3.5 bg-gray-50 dark:bg-[#0b1120] border border-gray-200 dark:border-slate-800 rounded-xl flex flex-col justify-between shadow-xs transition-colors"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">{item.guest_name}</span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-black border whitespace-nowrap ${
                      riskConfig?.className || "bg-amber-100 text-amber-800 border-amber-200"
                    }`}
                  >
                    احتمال التخلف: {item.no_show_probability}%
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.risk_factors.map((factor, i) => (
                    <span key={i} className="text-[11px] bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded font-medium">
                      • {factor}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-200/80 dark:border-indigo-900/40 mt-2 font-medium leading-relaxed">
                💡 {item.suggested_action}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
