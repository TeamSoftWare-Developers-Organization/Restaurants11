"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import api from "@/services/api";
import { Sparkles, Plus, Loader2 } from "lucide-react";

interface RecommendedProduct {
  id: number;
  name: string;
  price: number;
  category_id?: number;
  image_url?: string;
}

interface AIRecommendationsProps {
  className?: string;
  compact?: boolean;
}

export default function AIRecommendations({ className = "", compact = false }: AIRecommendationsProps) {
  const { items, addItem } = useCartStore();
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // تحديث الاقتراحات تلقائياً بمجرد تغير محتويات السلة
  useEffect(() => {
    let isMounted = true;
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const itemIds = items.map((item) => item.id);
        const res = await api.post("/ai/recommendations/", { item_ids: itemIds });
        if (isMounted && Array.isArray(res.data)) {
          setRecommendations(res.data);
        }
      } catch (err) {
        console.error("خطأ في جلب الاقتراحات الذكية:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // تقليل معدل الطلبات (Debounce) لضمان خفة وسرعة الواجهة
    const timer = setTimeout(fetchRecommendations, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [items]);

  if (recommendations.length === 0 && !loading) return null;

  return (
    <div
      className={`bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-4 shadow-sm transition-all ${className}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              اقتراحات ذكية تكميلية للعميل
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black shadow-xs">
                AI
              </span>
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-400 font-semibold mt-0.5">
              أصناف يفضل الزبائن طلبها معاً بناءً على تحليل السلة
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>جاري التحليل...</span>
          </div>
        )}
      </div>

      <div
        className={`grid gap-2.5 ${
          compact
            ? "grid-cols-2"
            : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        {recommendations.map((item) => (
          <div
            key={item.id}
            className="bg-gray-50/70 dark:bg-gray-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 border border-gray-100 dark:border-gray-700/60 hover:border-emerald-500/40 p-3 rounded-2xl flex flex-col justify-between transition-all group shadow-xs hover:shadow-md hover:scale-[1.01]"
          >
            <div>
              <p className="text-xs font-black text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-600 transition-colors">
                {item.name}
              </p>
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {typeof item.price === "number" ? item.price.toFixed(2) : item.price} <span className="text-[10px] font-bold text-gray-400">د.ل</span>
              </p>
            </div>

            <button
              onClick={() =>
                addItem({
                  id: item.id,
                  name: item.name,
                  price: Number(item.price),
                  image_url: item.image_url,
                })
              }
              className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة للسلة</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
