// src/services/licenseService.ts

import api from '@/lib/api';

export interface LicenseStatus {
    machine_id: string;
    installed_at: string;
    trial_days: number;
    is_activated: boolean;
    license_type: 'TRIAL' | 'LIFETIME';
    product_key?: string | null;
    activated_at?: string | null;
    is_trial_active: boolean;
    remaining_trial_days: number;
    is_valid: boolean;
}

export interface ActivateResponse {
    success: boolean;
    message: string;
    license_status?: LicenseStatus | null;
}

export const licenseService = {
    /**
     * جلب حالة الترخيص الحالية، معرف الجهاز، الأيام التجريبية المتبقية وصلاحية النظام.
     */
    getLicenseStatus: async (): Promise<LicenseStatus> => {
        const response = await api.get<LicenseStatus>('/core/license/status/');
        return response.data;
    },

    /**
     * تفعيل النظام عبر مفتاح المنتج (Product Key).
     */
    activateProductKey: async (productKey: string): Promise<ActivateResponse> => {
        const response = await api.post<ActivateResponse>('/core/license/activate/', {
            product_key: productKey,
        });
        return response.data;
    },
};
