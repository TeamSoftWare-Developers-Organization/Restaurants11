'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { shiftService, ShiftReconciliation } from '@/services/shiftService';
import { useAuthStore } from '@/store/authStore';

export type VarianceStatus = 'BALANCED' | 'SURPLUS' | 'DEFICIT' | 'EMPTY';

export interface UseShiftReconciliationOptions {
  isOpen: boolean;
  shiftId?: number;
  expectedCash?: number;
  onSuccess?: (report: any) => void;
}

export function useShiftReconciliation({
  isOpen,
  shiftId,
  expectedCash: initialExpectedCash,
  onSuccess
}: UseShiftReconciliationOptions) {
  const { activeShift, setActiveShift, user } = useAuthStore();
  const [countedCash, setCountedCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingRecon, setIsFetchingRecon] = useState<boolean>(false);
  const [reconData, setReconData] = useState<ShiftReconciliation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closingReport, setClosingReport] = useState<any | null>(null);

  const currentShiftId = shiftId || activeShift?.id;

  // Load current live reconciliation when modal opens
  useEffect(() => {
    // Guard clause: Early exit if modal closed, reset form state
    if (!isOpen) {
      setCountedCash('');
      setNotes('');
      setError(null);
      setClosingReport(null);
      return;
    }

    let isMounted = true;

    const fetchReconciliation = async () => {
      setIsFetchingRecon(true);
      try {
        const data = currentShiftId
          ? await shiftService.getShiftReconciliation(currentShiftId)
          : await shiftService.getCurrentPosShiftReconciliation();

        if (isMounted) {
          setReconData(data);
        }
      } catch (err: any) {
        console.warn('Could not fetch pre-closing reconciliation:', err);
      } finally {
        if (isMounted) {
          setIsFetchingRecon(false);
        }
      }
    };

    fetchReconciliation();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentShiftId]);

  // Numerical calculations & memoized metrics
  const countedVal = parseFloat(countedCash) || 0;
  const expectedVal = reconData?.expected_drawer_cash ?? initialExpectedCash ?? Number(activeShift?.opening_balance || 0);
  const hasEnteredCount = countedCash.trim() !== '';
  const variance = hasEnteredCount ? Math.round((countedVal - expectedVal) * 100) / 100 : 0;

  const varianceStatus: VarianceStatus = useMemo(() => {
    if (!hasEnteredCount) return 'EMPTY';
    if (Math.abs(variance) < 0.01) return 'BALANCED';
    if (variance > 0) return 'SURPLUS';
    return 'DEFICIT';
  }, [hasEnteredCount, variance]);

  // Confirm close shift action with clean guard clauses
  const handleConfirmClose = useCallback(async () => {
    // Guard clause 1: Counted amount required
    if (!hasEnteredCount) {
      setError('يرجى إدخال المبلغ الفعلي المعدود في الدرج');
      return;
    }

    const targetId = currentShiftId || activeShift?.id;

    // Guard clause 2: Valid active shift target required
    if (!targetId) {
      setError('لا توجد وردية نشطة محددة للإغلاق');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const report = await shiftService.closeShiftWithVariance(targetId, countedVal, notes);

      setClosingReport(report);
      if (setActiveShift) {
        setActiveShift(null);
      }
      if (onSuccess) {
        onSuccess(report);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل إغلاق الوردية');
    } finally {
      setIsLoading(false);
    }
  }, [hasEnteredCount, currentShiftId, activeShift?.id, countedVal, notes, setActiveShift, onSuccess]);

  const handlePrintSummary = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  return {
    countedCash,
    setCountedCash,
    notes,
    setNotes,
    isLoading,
    isFetchingRecon,
    reconData,
    error,
    setError,
    closingReport,
    currentShiftId,
    countedVal,
    expectedVal,
    hasEnteredCount,
    variance,
    varianceStatus,
    activeShift,
    user,
    handleConfirmClose,
    handlePrintSummary
  };
}
