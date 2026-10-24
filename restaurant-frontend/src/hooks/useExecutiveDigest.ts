'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  executiveDigestService,
  ExecutiveDigestResponse,
  ActionableInsight
} from '@/services/executiveDigestService';

export function useExecutiveDigest() {
  const router = useRouter();
  const [digest, setDigest] = useState<ExecutiveDigestResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadDigest = useCallback(async (showRefreshSpinner = false) => {
    try {
      if (showRefreshSpinner) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const data = await executiveDigestService.getExecutiveBrief();
      setDigest(data);
    } catch (err) {
      console.error('Failed to load executive operations digest', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDigest();
  }, [loadDigest]);

  const navigateTo = useCallback(
    (path: string) => {
      // Guard clause: Early exit on invalid path
      if (!path) return;
      router.push(path);
    },
    [router]
  );

  const getPriorityBadgeStyle = useCallback((priority: ActionableInsight['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/50';
      case 'warning':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50';
      case 'info':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/50';
      case 'success':
      default:
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';
    }
  }, []);

  return {
    digest,
    isLoading,
    isRefreshing,
    loadDigest,
    navigateTo,
    getPriorityBadgeStyle
  };
}
