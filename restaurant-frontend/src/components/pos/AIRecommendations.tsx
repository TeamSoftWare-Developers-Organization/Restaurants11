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
      className={`bg-slate-900/90 dark:bg-[#131b2e] border border-blue-500/30 dark:border-blue-900/50 rounded-2xl p-3.5 shadow-xl transition-all ${className}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
            <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              اقتراحات ذكية تكميلية للعميل
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono font-bold">
                AI
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              أصناف يفضل الزبائن طلبها معاً بناءً على تحليل السلة
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-1 text-xs text-blue-400 font-bold animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>جاري التحليل...</span>
          </div>
        )}
      </div>

      <div
        className={`grid gap-2 ${
          compact
            ? "grid-cols-2"
            : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        {recommendations.map((item) => (
          <div
            key={item.id}
            className="bg-[#0b1120] hover:border-blue-500/60 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-between transition-all group hover:shadow-md hover:scale-[1.02]"
          >
            <div>
              <p className="text-xs font-black text-slate-100 line-clamp-1 group-hover:text-blue-300 transition-colors">
                {item.name}
              </p>
              <p className="text-xs font-black text-emerald-400 mt-1 tabular-nums">
                {typeof item.price === "number" ? item.price.toFixed(2) : item.price} <span className="text-[10px] font-bold text-slate-400">د.ل</span>
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
              className="mt-2.5 w-full bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-black py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 active:scale-95 shadow-xs"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة للسلة</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
