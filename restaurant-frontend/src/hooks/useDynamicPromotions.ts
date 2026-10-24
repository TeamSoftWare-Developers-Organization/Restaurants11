import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { useCartStore } from '@/store/useCartStore';
import { AIPromotionsResponse, AIPromotionSuggestion } from '@/types';

export function useDynamicPromotions(initialExpanded: boolean = true) {
  const { addItem } = useCartStore();
  const [data, setData] = useState<AIPromotionsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingPromoId, setApplyingPromoId] = useState<string | null>(null);
  const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/ai/promotions/suggestions/');
      setData(res.data);
    } catch (err: any) {
      console.error('فشل جلب اقتراحات العروض الذكية:', err);
      setError(err?.message || 'فشل جلب اقتراحات العروض الذكية');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const applyPromo = useCallback(async (promo: AIPromotionSuggestion) => {
    try {
      setApplyingPromoId(promo.id);
      const action = promo.is_active ? 'deactivate' : 'activate';
      const res = await api.post('/ai/promotions/apply/', {
        promotion_id: promo.id,
        action,
      });

      if (res.data?.success) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            promotions: prev.promotions.map((p) =>
              p.id === promo.id ? { ...p, is_active: !promo.is_active } : p
            ),
          };
        });
      }
    } catch (err: any) {
      console.error('فشل تفعيل العرض الترويجي:', err);
      throw err;
    } finally {
      setApplyingPromoId(null);
    }
  }, []);

  const addPromoToCart = useCallback(
    (promo: AIPromotionSuggestion) => {
      promo.items.forEach((item) => {
        addItem({
          id: item.item_id,
          name: `${item.name} (${promo.badge})`,
          price: item.discounted_price,
          notes: `عرض ذكي: ${promo.title}`,
        });
      });

      setAddedSuccessId(promo.id);
      setTimeout(() => setAddedSuccessId(null), 2500);
    },
    [addItem]
  );

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return {
    data,
    loading,
    error,
    applyingPromoId,
    addedSuccessId,
    isExpanded,
    toggleExpanded,
    fetchSuggestions,
    applyPromo,
    addPromoToCart,
  };
}
