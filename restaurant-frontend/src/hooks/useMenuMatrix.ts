import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/services/api';
import { AIMenuMatrixItem, MenuCategoryClass } from '@/types';

export type MenuMatrixFilter = 'ALL' | MenuCategoryClass;

export function useMenuMatrix() {
  const [items, setItems] = useState<AIMenuMatrixItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<MenuMatrixFilter>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatrix = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/menu/ai/menu-matrix/');
      setItems(res.data);
    } catch (err: any) {
      console.error('فشل جلب مصفوفة المنيو:', err);
      setError(err?.message || 'فشل جلب مصفوفة المنيو');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'ALL') {
      return items;
    }
    return items.filter((item) => item.classification === selectedFilter);
  }, [items, selectedFilter]);

  return {
    items,
    filteredItems,
    selectedFilter,
    setSelectedFilter,
    loading,
    error,
    refetch: fetchMatrix,
  };
}
