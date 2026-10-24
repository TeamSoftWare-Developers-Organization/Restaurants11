'use client';

import { useState, useCallback } from 'react';
import api from '@/services/api';

export interface DepletedItemPreview {
  ingredient_id: number;
  name: string;
  unit: string;
  current_stock: number;
  suggested_qty: number;
  unit_price: number;
  estimated_total: number;
  risk_level: string;
  days_left: number | null;
}

export interface SupplierOption {
  id: number;
  name: string;
  company_name?: string;
}

export interface AutoPurchaseNotification {
  type: 'success' | 'error';
  message: string;
}

export interface UseAutoPurchaseOptions {
  onSuccess?: () => void | Promise<void>;
}

export function useAutoPurchase(options: UseAutoPurchaseOptions = {}) {
  const { onSuccess } = options;

  const [isAutoPOModalOpen, setIsAutoPOModalOpen] = useState(false);
  const [isLoadingAutoPOPreview, setIsLoadingAutoPOPreview] = useState(false);
  const [isSubmittingAutoPO, setIsSubmittingAutoPO] = useState(false);
  const [autoPOItems, setAutoPOItems] = useState<DepletedItemPreview[]>([]);
  const [suppliersList, setSuppliersList] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [receivingInvoiceId, setReceivingInvoiceId] = useState<number | null>(null);
  const [notification, setNotification] = useState<AutoPurchaseNotification | null>(null);

  const openAutoPOModal = useCallback(async () => {
    setIsAutoPOModalOpen(true);
    setIsLoadingAutoPOPreview(true);

    try {
      const [previewRes, suppliersRes] = await Promise.all([
        api.get('/purchases/auto-generate/preview/'),
        api.get('/suppliers/')
      ]);

      const items: DepletedItemPreview[] = previewRes.data || [];
      const sups: SupplierOption[] = suppliersRes.data || [];

      setAutoPOItems(items);
      setSuppliersList(sups);

      if (sups.length > 0) {
        setSelectedSupplierId(sups[0].id);
      }
    } catch (err) {
      console.error('Failed to load auto PO preview', err);
      setNotification({
        type: 'error',
        message: 'تعذر تحميل بيانات معاينة أمر الشراء الآلي. يرجى المحاولة لاحقاً.'
      });
    } finally {
      setIsLoadingAutoPOPreview(false);
    }
  }, []);

  const closeAutoPOModal = useCallback(() => {
    setIsAutoPOModalOpen(false);
  }, []);

  const handleQuantityChange = useCallback((index: number, newQty: number) => {
    const validQty = Math.max(0.1, Number(newQty) || 0.1);
    setAutoPOItems((prev) => {
      if (!prev[index]) return prev;
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        suggested_qty: validQty,
        estimated_total: Math.round(validQty * updated[index].unit_price * 100) / 100
      };
      return updated;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setAutoPOItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirmAutoPO = useCallback(async () => {
    // Guard clause: Early exit if no items
    if (autoPOItems.length === 0) {
      setNotification({ type: 'error', message: 'لا توجد مواد محددة في أمر الشراء.' });
      return;
    }

    setIsSubmittingAutoPO(true);
    try {
      const payload = {
        supplier_id: selectedSupplierId ? Number(selectedSupplierId) : undefined,
        items: autoPOItems.map((item) => ({
          ingredient_id: item.ingredient_id,
          quantity: item.suggested_qty,
          unit_price: item.unit_price
        }))
      };

      const res = await api.post('/purchases/auto-generate/', payload);
      setIsAutoPOModalOpen(false);
      setNotification({
        type: 'success',
        message: res.data?.message || 'تم إنشاء مسودة أمر الشراء الآلي بنجاح!'
      });

      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error('Failed to generate auto PO', err);
      setNotification({
        type: 'error',
        message: 'حدث خطأ أثناء توليد أمر الشراء الآلي. يرجى التحقق وإعادة المحاولة.'
      });
    } finally {
      setIsSubmittingAutoPO(false);
    }
  }, [autoPOItems, selectedSupplierId, onSuccess]);

  const handleReceiveInvoice = useCallback(
    async (invoiceId: number, onReceivedCallback?: () => void) => {
      // Guard clause: Invalid ID
      if (!invoiceId) return;

      setReceivingInvoiceId(invoiceId);
      try {
        const res = await api.post(`/purchases/${invoiceId}/receive/`);
        setNotification({
          type: 'success',
          message: res.data?.message || 'تم اعتماد واستلام الفاتورة وترحيل الكميات للمخزن بنجاح!'
        });

        if (onSuccess) {
          await onSuccess();
        }
        if (onReceivedCallback) {
          onReceivedCallback();
        }
      } catch (err) {
        console.error('Failed to receive invoice', err);
        setNotification({
          type: 'error',
          message: 'حدث خطأ أثناء ترحيل الفاتورة للمخزن.'
        });
      } finally {
        setReceivingInvoiceId(null);
      }
    },
    [onSuccess]
  );

  return {
    isAutoPOModalOpen,
    setIsAutoPOModalOpen,
    isLoadingAutoPOPreview,
    isSubmittingAutoPO,
    autoPOItems,
    suppliersList,
    selectedSupplierId,
    setSelectedSupplierId,
    receivingInvoiceId,
    notification,
    setNotification,
    openAutoPOModal,
    closeAutoPOModal,
    handleQuantityChange,
    handleRemoveItem,
    handleConfirmAutoPO,
    handleReceiveInvoice
  };
}
