import { MenuCategoryClass, RiskLevel, VarianceStatus, OrderStatus } from '@/types';

export interface UIStatusConfig {
  label: string;
  badge: string;
  className: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon?: string;
  description?: string;
}

/**
 * Menu Category Classification UI Map (Boston Consulting Group Matrix)
 */
export const MENU_CLASSIFICATION_MAP: Record<MenuCategoryClass, UIStatusConfig> = {
  STAR: {
    label: 'النجوم',
    badge: '⭐ النجوم',
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50',
    bgClass: 'bg-amber-500/10 dark:bg-amber-950/30',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800/60',
    icon: '⭐',
    description: 'أطباق ذات ربحية عالية ومبيعات مرتفعة',
  },
  PLOWHORSE: {
    label: 'أحصنة العمل',
    badge: '🐎 حصان عمل',
    className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/50',
    bgClass: 'bg-blue-500/10 dark:bg-blue-950/30',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800/60',
    icon: '🐎',
    description: 'أطباق شائعة جداً ومبيعاتها عالية ولكن بهامش ربح منخفض',
  },
  PUZZLE: {
    label: 'الألغاز',
    badge: '🧩 لغز',
    className: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700/50',
    bgClass: 'bg-purple-500/10 dark:bg-purple-950/30',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-200 dark:border-purple-800/60',
    icon: '🧩',
    description: 'أطباق ذات ربحية مرتفعة ولكن مبيعاتها منخفضة تحتاج ترويجاً',
  },
  DOG: {
    label: 'الراكدة',
    badge: '⚠️ راكد',
    className: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/50',
    bgClass: 'bg-rose-500/10 dark:bg-rose-950/30',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-200 dark:border-rose-800/60',
    icon: '⚠️',
    description: 'أطباق منخفضة الربحية ومنخفضة المبيعات يوصى بإزالتها أو تعديلها',
  },
};

/**
 * Risk Level UI Map (for No-show, cash audits, inventory depletion)
 */
export const RISK_LEVEL_MAP: Record<RiskLevel, UIStatusConfig> = {
  HIGH: {
    label: 'مخاطرة عالية',
    badge: 'عالية',
    className: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30',
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    textClass: 'text-rose-700 dark:text-rose-400',
    borderClass: 'border-rose-300 dark:border-rose-800',
    icon: '🚨',
  },
  MEDIUM: {
    label: 'مخاطرة متوسطة',
    badge: 'متوسطة',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-800',
    icon: '⚠️',
  },
  LOW: {
    label: 'مخاطرة منخفضة',
    badge: 'آمن',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    borderClass: 'border-emerald-300 dark:border-emerald-800',
    icon: '✅',
  },
};

/**
 * Variance Status UI Map (Shift cash audits & settlement)
 */
export const VARIANCE_STATUS_MAP: Record<VarianceStatus, UIStatusConfig> = {
  BALANCED: {
    label: 'متطابقة تماماً',
    badge: 'متطابق ✅',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/20',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    borderClass: 'border-emerald-300 dark:border-emerald-800',
    icon: '✅',
  },
  SURPLUS: {
    label: 'فائض نقدي',
    badge: 'فائض 🟢',
    className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    bgClass: 'bg-blue-50 dark:bg-blue-950/20',
    textClass: 'text-blue-700 dark:text-blue-400',
    borderClass: 'border-blue-300 dark:border-blue-800',
    icon: '📈',
  },
  DEFICIT: {
    label: 'عجز نقدي',
    badge: 'عجز ⚠️',
    className: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    bgClass: 'bg-rose-50 dark:bg-rose-950/20',
    textClass: 'text-rose-700 dark:text-rose-400',
    borderClass: 'border-rose-300 dark:border-rose-800',
    icon: '📉',
  },
  EMPTY: {
    label: 'غير مدخل',
    badge: 'قيد الانتظار ⏳',
    className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    bgClass: 'bg-gray-50 dark:bg-gray-900/20',
    textClass: 'text-gray-600 dark:text-gray-400',
    borderClass: 'border-gray-300 dark:border-gray-700',
    icon: '⏳',
  },
};

/**
 * Kitchen Peak & Load Status UI Map
 */
export type PeakStatusType = 'LIGHT' | 'MODERATE' | 'PEAK' | 'SUPER_PEAK';

export const PEAK_STATUS_MAP: Record<PeakStatusType, UIStatusConfig> = {
  LIGHT: {
    label: 'ضغط خفيف',
    badge: 'ضغط خفيف 🟢',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    icon: '🟢',
  },
  MODERATE: {
    label: 'ضغط متوسط',
    badge: 'ضغط معتدل 🟡',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800',
    icon: '🟡',
  },
  PEAK: {
    label: 'ساعة ذروة',
    badge: 'ساعة ذروة 🔥',
    className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    textClass: 'text-orange-600 dark:text-orange-400',
    borderClass: 'border-orange-200 dark:border-orange-800',
    icon: '🔥',
  },
  SUPER_PEAK: {
    label: 'ذروة قصوى',
    badge: 'ذروة قصوى ⚡',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50',
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    textClass: 'text-rose-600 dark:text-rose-400',
    borderClass: 'border-rose-200 dark:border-rose-800',
    icon: '⚡',
  },
};

/**
 * Order Status UI Map
 */
export const ORDER_STATUS_MAP: Record<OrderStatus, UIStatusConfig> = {
  PENDING: {
    label: 'قيد الانتظار',
    badge: 'معلق ⏳',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    bgClass: 'bg-amber-50 dark:bg-amber-950/20',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800',
    icon: '⏳',
  },
  CONFIRMED: {
    label: 'مؤكد',
    badge: 'مؤكد 📋',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    bgClass: 'bg-blue-50 dark:bg-blue-950/20',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800',
    icon: '📋',
  },
  PREPARING: {
    label: 'قيد التحضير',
    badge: 'في المطبخ 🍳',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/20',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-200 dark:border-indigo-800',
    icon: '🍳',
  },
  READY: {
    label: 'جاهز للاستلام',
    badge: 'جاهز 🍽️',
    className: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    bgClass: 'bg-teal-50 dark:bg-teal-950/20',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-200 dark:border-teal-800',
    icon: '🍽️',
  },
  COMPLETED: {
    label: 'مكتمل',
    badge: 'مكتمل ✅',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/20',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    icon: '✅',
  },
  CANCELLED: {
    label: 'ملغي',
    badge: 'ملغي ❌',
    className: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    bgClass: 'bg-rose-50 dark:bg-rose-950/20',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-200 dark:border-rose-800',
    icon: '❌',
  },
};
