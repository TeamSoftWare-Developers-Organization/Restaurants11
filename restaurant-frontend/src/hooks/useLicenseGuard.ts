'use client';

import { useState, useEffect, useCallback, useMemo, ChangeEvent, FormEvent } from 'react';
import api from '@/services/api';
import { licenseService } from '@/services/licenseService';
import { ILicenseStatus } from '@/types';

export function useLicenseGuard() {
  const [license, setLicense] = useState<ILicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [productKey, setProductKey] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // فحص حالة الترخيص مع مهلة أقصاها 3 ثوانٍ حتى لا تتجمد الواجهة نهائياً
  const checkLicense = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await api.get<ILicenseStatus>('/core/license/status/', {
        timeout: 3000,
      });

      setLicense(response.data);
      const isCloud = response.data.license_type === 'CLOUD' || Boolean((response.data as any).is_cloud);
      // إذا انتهت الفترة التجريبية ولم يتم التفعيل
      const isExpired = (response.data as any).is_expired || (!response.data.is_trial_active && !response.data.is_activated);
      if (!isCloud && isExpired && !response.data.is_activated) {
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
      }
    } catch (error: any) {
      console.error('فشل التحقق من الترخيص:', error);
      // في حال تعذر الوصول للسيرفر، ننهي التعليق فوراً ونظهر شاشة القفل/التفعيل
      setIsBlocked(true);
      setErrorMessage(
        error.code === 'ECONNABORTED'
          ? 'انتهت مهلة الاتصال بالخادم الداخلي.'
          : 'تعذر الاتصال بخادم النظام الداخلي (Django).'
      );
    } finally {
      // إيقاف مؤشر التحميل مهما كانت النتيجة لكسر الشاشة المعلقة
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLicense();
  }, [checkLicense]);

  // حساب التوقيت المطلق لانتهاء التجربة
  const expirationTimestamp = useMemo(() => {
    if (!license?.installed_at || license.license_type === 'CLOUD' || (license as any)?.is_cloud) return null;
    const installedMs = new Date(license.installed_at).getTime();
    const durationMs = (license.trial_duration_seconds || 3600) * 1000;
    return installedMs + durationMs;
  }, [license?.installed_at, license?.trial_duration_seconds, license?.license_type]);

  // دالة لمزامنة الثواني المتبقية مع التوقيت الفعلي للجهاز
  const syncRemainingTime = useCallback(() => {
    if (!license || !license.is_trial_active || !expirationTimestamp) return;

    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expirationTimestamp - now) / 1000));
    setSecondsLeft(remaining);

    if (remaining <= 0) {
      checkLicense();
    }
  }, [license, expirationTimestamp, checkLicense]);

  useEffect(() => {
    syncRemainingTime();
  }, [syncRemainingTime]);

  useEffect(() => {
    if (!license || !license.is_trial_active || !expirationTimestamp) return;

    syncRemainingTime();
    const interval = setInterval(() => {
      syncRemainingTime();
    }, 1000);

    const handleWakeOrFocus = () => {
      syncRemainingTime();
      checkLicense();
    };

    document.addEventListener('visibilitychange', handleWakeOrFocus);
    window.addEventListener('focus', handleWakeOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleWakeOrFocus);
      window.removeEventListener('focus', handleWakeOrFocus);
    };
  }, [license, expirationTimestamp, syncRemainingTime, checkLicense]);

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

  // نسخ معرف الجهاز
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
    setErrorMessage('');
  }, []);

  // إرسال كود التفعيل
  const handleActivate = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();

      if (!productKey.trim()) {
        setErrorMessage('يرجى إدخال مفتاح المنتج المكون من 16 حرفاً.');
        return;
      }

      setIsActivating(true);
      setErrorMessage('');
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

  const isCloud = license?.license_type === 'CLOUD' || Boolean((license as any)?.is_cloud);
  const isLocked = !isCloud && (isBlocked || Boolean(license && !license.is_valid));

  return {
    license,
    isLoading,
    isBlocked,
    isLocked,
    errorMessage,
    setErrorMessage,
    successMessage,
    productKey,
    setProductKey,
    isActivating,
    isCopied,
    isBannerDismissed,
    setIsBannerDismissed,
    secondsLeft,
    formatCountdown,
    handleCopyMachineId,
    handleKeyChange,
    handleActivate,
    retry: checkLicense,
    fetchStatus: checkLicense,
    connectionError: isBlocked && !license ? errorMessage : null,
  };
}
