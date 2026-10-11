"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import Link from "next/link";
import { Zap } from "lucide-react";

interface StockForecast {
  ingredient_id: number;
  name: string;
  unit: string;
  current_stock: number;
  daily_burn_rate: number;
  days_left: number | null;
  risk_level: "CRITICAL" | "WARNING" | "HEALTHY";
  suggested_reorder_qty: number;
}

export default function AIForecastCard() {
  const [forecasts, setForecasts] = useState<StockForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/inventory/ai/stock-forecast/")
      .then((res) => {
        // فلترة المواد التي تتطلب تدخلاً عاجلاً فقط
        const criticalItems = res.data.filter(
          (item: StockForecast) => item.risk_level === "CRITICAL" || item.risk_level === "WARNING"
        );
        setForecasts(criticalItems);
      })
      .catch((err) => console.error("فشل جلب تحليلات المخزون", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || forecasts.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#131b2e] border border-amber-500/30 rounded-2xl p-5 mb-6 shadow-xl" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-lg text-lg">⚠️</span>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">تنبيهات استباقية بالذكاء الاصطناعي (مخاطر النفاد)</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">تحليل معدل الاستهلاك والتنبؤ بالمواد التي ستنفد قريباً</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-full font-bold">
            {forecasts.length} مواد تتطلب إعادة الطلب
          </span>
          <Link
            href="/purchases?auto=true"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md transition active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-white animate-pulse" />
            <span>أمر شراء آلي ⚡</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {forecasts.map((item) => (
          <div
            key={item.ingredient_id}
            className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              item.risk_level === "CRITICAL"
                ? "bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200"
                : "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200"
            }`}
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm text-gray-900 dark:text-white">{item.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/10 dark:bg-black/40">
                  {item.days_left !== null ? `متبقي ${item.days_left} يوم` : "غير محدد"}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
                الرصيد: {item.current_stock} {item.unit} | الاستهلاك: {item.daily_burn_rate} {item.unit}/يوم
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-gray-600 dark:text-slate-300">الكمية المقترحة للشراء:</span>
              <span className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-slate-800 px-2 py-1 rounded">
                {item.suggested_reorder_qty} {item.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
