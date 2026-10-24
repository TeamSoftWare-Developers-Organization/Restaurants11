"use client";

import { useDynamicPromotions } from "@/hooks/useDynamicPromotions";
import {
  Zap,
  Clock,
  TrendingUp,
  CheckCircle2,
  Plus,
  Loader2,
  RefreshCw,
  Flame,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface AIDynamicPromotionsWidgetProps {
  className?: string;
  compact?: boolean;
}

export default function AIDynamicPromotionsWidget({
  className = "",
  compact = false
}: AIDynamicPromotionsWidgetProps) {
  const {
    data,
    loading,
    applyingPromoId,
    addedSuccessId,
    isExpanded,
    toggleExpanded,
    fetchSuggestions,
    applyPromo,
    addPromoToCart,
  } = useDynamicPromotions(!compact);

  // Guard Clause: Loading without previous data
  if (loading && !data) {
    return (
      <div className={`p-4 bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-center gap-2 text-xs text-gray-400 ${className}`} dir="rtl">
        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        <span>جاري تحليل ساعات الركود وهندسة العروض الذكية...</span>
      </div>
    );
  }

  // Guard Clause: Empty or null data
  if (!data || data.promotions.length === 0) return null;

  return (
    <div
      className={`bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800/90 rounded-2xl p-4 shadow-sm transition-all ${className}`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                عروض وتسعير الساعات الهادئة (AI Happy Hour)
              </h3>
              {data.is_currently_off_peak ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                  <Flame className="w-3 h-3 fill-white" />
                  ساعة ركود نشطة حالياً!
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  فترة الاستعداد
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-400 font-semibold mt-0.5">
              تنشيط أصناف الألغاز (Puzzles) في ساعات الهدوء لحماية الإيراد وهامش الربح
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchSuggestions}
            disabled={loading}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="تحديث الاقتراحات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          {compact && (
            <button
              onClick={toggleExpanded}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Promotion Cards */}
      {isExpanded && (
        <div className="mt-3.5 space-y-3">
          {data.promotions.map((promo) => (
            <div
              key={promo.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                promo.is_active
                  ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-400/60 dark:border-amber-600/40 shadow-sm"
                  : "bg-gray-50/50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-800"
              }`}
            >
              {/* Card Title & Badges */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900 dark:text-white">
                      {promo.title}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {promo.badge}
                    </span>
                    {promo.is_active && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        مفعل بالـ POS
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    💡 {promo.rationale}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-gray-400 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{promo.time_window}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-white/80 dark:bg-gray-900/60 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800/60 mb-2.5">
                <div className="space-y-1.5">
                  {promo.items.map((item) => (
                    <div
                      key={item.item_id}
                      className="flex items-center justify-between text-xs font-bold"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-800 dark:text-gray-200">{item.name}</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          ({item.classification_badge})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="line-through text-gray-400 text-[11px]">
                          {item.original_price.toFixed(2)} د.ل
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">
                          {item.discounted_price.toFixed(2)} د.ل
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Projected Impact Footer */}
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    الأثر المتوقع:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {promo.projected_sales_boost}
                    </span>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {promo.projected_revenue_lift}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                {/* زر إضافة العرض للسلة مباشرة */}
                <button
                  type="button"
                  onClick={() => addPromoToCart(promo)}
                  className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95"
                  title="إضافة أصناف هذا العرض مباشرة لسلة المبيعات"
                >
                  {addedSuccessId === promo.id ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">تمت الإضافة للسلة!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة للسلة 🛒</span>
                    </>
                  )}
                </button>

                {/* زر تفعيل العرض في الـ POS بنقرة واحدة */}
                <button
                  type="button"
                  onClick={() => applyPromo(promo)}
                  disabled={applyingPromoId === promo.id}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs transition active:scale-95 disabled:opacity-50 shadow-sm ${
                    promo.is_active
                      ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20"
                  }`}
                >
                  {applyingPromoId === promo.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>
                    {promo.is_active ? "إيقاف العرض" : "تطبيق العرض على الـ POS ⚡"}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
