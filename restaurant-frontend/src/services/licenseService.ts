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

export interface SuperDevCheckResponse {
    is_superdev: boolean;
    developer_name?: string;
}

export interface SuperDevGenerateKeyPayload {
    machine_id: string;
    client_name?: string;
    notes?: string;
}

export interface SuperDevGenerateKeyResponse {
    success: boolean;
    machine_id: string;
    product_key: string;
    generated_by: string;
    message: string;
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

    /**
     * فحص ما إذا كان المستخدم الحالي SuperDev (ظافر أو أيوب).
     */
    checkSuperDevAccess: async (): Promise<SuperDevCheckResponse> => {
        const response = await api.get<SuperDevCheckResponse>('/core/license/superdev/check/');
        return response.data;
    },

    /**
     * توليد كود التفعيل لأي جهاز حاسوب بواسطة المطور الفائق حصرياً.
     */
    generateKeyForMachine: async (payload: SuperDevGenerateKeyPayload): Promise<SuperDevGenerateKeyResponse> => {
        const response = await api.post<SuperDevGenerateKeyResponse>('/core/license/superdev/generate-key/', payload);
        return response.data;
    },
};

