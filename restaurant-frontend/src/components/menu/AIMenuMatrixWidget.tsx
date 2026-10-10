"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

interface MatrixItem {
  item_id: number;
  name: string;
  selling_price: number;
  item_cost: number;
  profit_margin: number;
  food_cost_percentage: number;
  sold_count: number;
  classification: "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG";
  badge: string;
  recommendation: string;
}

export default function AIMenuMatrixWidget() {
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/menu/ai/menu-matrix/")
      .then((res) => setItems(res.data))
      .catch((err) => console.error("فشل جلب مصفوفة المنيو", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || items.length === 0) return null;

  const filteredItems = selectedFilter === "ALL" 
    ? items 
    : items.filter((i) => i.classification === selectedFilter);

  return (
    <div className="bg-white dark:bg-[#131b2e] border border-blue-200 dark:border-blue-600/30 rounded-2xl p-4 sm:p-6 mb-8 shadow-xs transition-colors duration-300" dir="rtl">
      {/* الترويسة والأزرار */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2 text-gray-900 dark:text-white">
            <span>📊</span> هندسة وتطوير المنيو بالذكاء الاصطناعي (Menu Matrix)
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-bold mt-1">
            تحليل دقيق للربحية الفعلية وتكلفة الغذاء ومعدل المبيعات لكل طبق
          </p>
        </div>

        {/* فلاتر التصنيف */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "ALL", label: "الكل" },
            { id: "STAR", label: "النجوم ⭐" },
            { id: "PLOWHORSE", label: "أحصنة العمل 🐎" },
            { id: "PUZZLE", label: "الألغاز 🧩" },
            { id: "DOG", label: "الراكدة ⚠️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer active:scale-95 ${
                selectedFilter === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-[#0b1120] dark:text-slate-400 dark:hover:text-white border border-gray-200 dark:border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* شبكة البطاقات التحليلية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.item_id}
            className="p-4 bg-gray-50/80 dark:bg-[#0b1120] border border-gray-200/80 dark:border-slate-800 rounded-xl flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-2 gap-2">
                <span className="font-black text-sm text-gray-900 dark:text-white">{item.name}</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-bold whitespace-nowrap shadow-2xs">
                  {item.badge}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-gray-200 dark:border-slate-800/60 text-center">
                <div>
                  <span className="text-[11px] text-gray-400 dark:text-slate-400 block font-bold">السعر</span>
                  <span className="text-xs font-black text-gray-900 dark:text-white">{item.selling_price} د.ل</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 dark:text-slate-400 block font-bold">التكلفة</span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">{item.item_cost} د.ل</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 dark:text-slate-400 block font-bold">صافي الربح</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">+{item.profit_margin} د.ل</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-slate-400 my-2 font-medium">
                <span>المبيعات: <strong className="text-gray-900 dark:text-white">{item.sold_count}</strong> طلب</span>
                <span>نسبة التكلفة: <strong className="text-gray-900 dark:text-white">%{item.food_cost_percentage}</strong></span>
              </div>
            </div>

            <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-200/80 dark:border-blue-900/40 mt-3 font-medium leading-relaxed">
              💡 {item.recommendation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
