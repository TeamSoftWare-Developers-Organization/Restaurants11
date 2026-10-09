"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

interface Anomaly {
  shift_id: number;
  cashier_name: string;
  risk_score: number;
  risk_status: "HIGH" | "MEDIUM" | "LOW";
  flags: string[];
  cash_variance: number;
}

export default function AIAnomalyWidget() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/payments/ai/cash-anomalies/")
      .then((res) => setAnomalies(res.data))
      .catch((err) => console.error("فشل استرجاع تنبيهات الرقابة المالية", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || anomalies.length === 0) return null;

  return (
    <div className="bg-[#131b2e] border border-rose-500/30 rounded-2xl p-5 mb-6 shadow-xl" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-rose-500/10 text-rose-400 rounded-lg text-lg">🛡️</span>
          <div>
            <h3 className="text-base font-bold text-white">الرقابة المالية الذكية (كشف التلاعب والشذوذ)</h3>
            <p className="text-xs text-slate-400">رصد فوري للعمليات المشبوهة والفروقات غير المبررة في الخزينة</p>
          </div>
        </div>
        <span className="text-xs bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full font-bold">
          {anomalies.length} ورديات مشبوهة
        </span>
      </div>

      <div className="space-y-3">
        {anomalies.map((item) => (
          <div
            key={item.shift_id}
            className="p-3.5 bg-[#0b1120] border border-slate-800 rounded-xl flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">الكاشير: {item.cashier_name}</span>
                <span className="text-xs text-slate-500">| وردية #{item.shift_id}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.flags.map((flag, idx) => (
                  <span key={idx} className="text-xs text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/50">
                    {flag}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-left">
              <span className="text-xs text-slate-400 block">درجة الخطورة</span>
              <span className={`text-base font-bold ${item.risk_status === "HIGH" ? "text-rose-500" : "text-amber-500"}`}>
                %{item.risk_score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
