import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { AIKDSOrder } from '@/types';

export function useKDSQueue(pollIntervalMs: number = 8000) {
  const [orders, setOrders] = useState<AIKDSOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKDS = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/orders/kitchen/ai/kds-queue/');
      setOrders(res.data);
    } catch (err: any) {
      console.error('فشل جلب بيانات شاشة المطبخ', err);
      setError(err?.message || 'فشل جلب بيانات شاشة المطبخ');
    } finally {
      setLoading(false);
    }
  }, []);

  const completeOrder = useCallback(
    async (orderId: number) => {
      try {
        await api.post(`/orders/kitchen/ai/kds-queue/${orderId}/complete/`);
        await fetchKDS();
      } catch (err: any) {
        console.error('فشل تحديث حالة الطلب', err);
        throw err;
      }
    },
    [fetchKDS]
  );

  useEffect(() => {
    fetchKDS();
    if (pollIntervalMs > 0) {
      const interval = setInterval(fetchKDS, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchKDS, pollIntervalMs]);

  const currentLoadStatus = orders[0]?.kitchen_load_status || 'ضغط خفيف 🟢';

  return {
    orders,
    loading,
    error,
    currentLoadStatus,
    fetchKDS,
    completeOrder,
  };
}
