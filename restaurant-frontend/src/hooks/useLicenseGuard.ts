'use client';

import { useState, useEffect, useCallback, useMemo, ChangeEvent, FormEvent } from 'react';
import { licenseService, LicenseStatus } from '@/services/licenseService';

export function useLicenseGuard() {
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [productKey, setProductKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // حساب التوقيت المطلق لانتهاء التجربة
  const expirationTimestamp = useMemo(() => {
    if (!license?.installed_at) return null;
    const installedMs = new Date(license.installed_at).getTime();
    const durationMs = (license.trial_duration_seconds || 3600) * 1000;
    return installedMs + durationMs;
  }, [license?.installed_at, license?.trial_duration_seconds]);

  // فحص حالة الترخيص عند تحميل المكون
  const fetchStatus = useCallback(async (retryCount = 1) => {
    try {
      const data = await licenseService.getLicenseStatus();
      setLicense(data);
    } catch (err: any) {
      console.warn('[ActivationGuard] Could not fetch license status:', err?.message || err);
      if (retryCount > 0) {
        setTimeout(() => fetchStatus(retryCount - 1), 3000);
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // دالة لمزامنة الثواني المتبقية مع التوقيت الفعلي للجهاز
  const syncRemainingTime = useCallback(() => {
    // Guard clause: Early exit if trial not active or no expiration
    if (!license || !license.is_trial_active || !expirationTimestamp) return;

    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expirationTimestamp - now) / 1000));
    setSecondsLeft(remaining);

    if (remaining <= 0) {
      fetchStatus();
    }
  }, [license, expirationTimestamp, fetchStatus]);

  // مزامنة فورية عند جلب بيانات الترخيص
  useEffect(() => {
    syncRemainingTime();
  }, [syncRemainingTime]);

  // عداد تنازلي حي يتزامن لحظياً وكل ثانية ومع عودة الجهاز من الإغلاق أو وضع السكون
  useEffect(() => {
    if (!license || !license.is_trial_active || !expirationTimestamp) return;

    syncRemainingTime();

    // 1. نبضة كل ثانية لحساب الوقت الحقيقي المنقضي
    const interval = setInterval(() => {
      syncRemainingTime();
    }, 1000);

    // 2. تحديث فوري عند استئناف الجهاز أو فتح الشاشة أو عودة التركيز للنافذة
    const handleWakeOrFocus = () => {
      syncRemainingTime();
      fetchStatus();
    };

    document.addEventListener('visibilitychange', handleWakeOrFocus);
    window.addEventListener('focus', handleWakeOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleWakeOrFocus);
      window.removeEventListener('focus', handleWakeOrFocus);
    };
  }, [license, expirationTimestamp, syncRemainingTime, fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const formatCountdown = useCallback((secs: number) => {
    if (secs <= 0) return 'انتهت مدة التجربة';
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours} ساعة و ${mins} دقيقة و ${s} ثانية`;
    }
    return `${mins} دقيقة و ${s} ثانية`;
  }, []);

  // نسخ معرف الجهاز مع Guard Clause
  const handleCopyMachineId = useCallback(() => {
    if (!license?.machine_id) return;
    navigator.clipboard.writeText(license.machine_id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  }, [license?.machine_id]);

  // معالجة إدخال مفتاح المنتج وتنسيقه XXXX-XXXX-XXXX-XXXX
  const handleKeyChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 16) val = val.slice(0, 16);
    const parts = val.match(/.{1,4}/g);
    setProductKey(parts ? parts.join('-') : val);
    setErrorMessage(null);
  }, []);

  // إرسال كود التفعيل
  const handleActivate = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();

      // Guard clause: Empty product key
      if (!productKey.trim()) {
        setErrorMessage('يرجى إدخال مفتاح المنتج المكون من 16 حرفاً.');
        return;
      }

      setIsActivating(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const res = await licenseService.activateProductKey(productKey);
        if (res.success) {
          setSuccessMessage(res.message);
          if (res.license_status) {
            setLicense(res.license_status);
          }
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }, 1500);
        } else {
          setErrorMessage(res.message);
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || 'فشل التحقق من المفتاح، يرجى المحاولة لاحقاً.';
        setErrorMessage(msg);
      } finally {
        setIsActivating(false);
      }
    },
    [productKey]
  );

  const isLocked = Boolean(license && !license.is_valid);

  return {
    license,
    isLoading,
    productKey,
    setProductKey,
    isActivating,
    errorMessage,
    setErrorMessage,
    successMessage,
    isCopied,
    isBannerDismissed,
    setIsBannerDismissed,
    secondsLeft,
    isLocked,
    formatCountdown,
    handleCopyMachineId,
    handleKeyChange,
    handleActivate,
    fetchStatus
  };
}
