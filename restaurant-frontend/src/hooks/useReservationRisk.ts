import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { AIReservationRisk } from '@/types';

export function useReservationRisk() {
  const [risks, setRisks] = useState<AIReservationRisk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reservations/ai/no-show-analysis/');
      // تصفية وعرض الحجوزات التي تحوي مخاطرة متوسطة أو عالية
      const flagList = (res.data || []).filter(
        (r: AIReservationRisk) => r.risk_level !== 'LOW'
      );
      setRisks(flagList);
    } catch (err: any) {
      console.error('فشل جلب تحليلات الحجوزات', err);
      setError(err?.message || 'فشل جلب تحليلات الحجوزات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  return {
    risks,
    loading,
    error,
    refetch: fetchRisks,
  };
}
