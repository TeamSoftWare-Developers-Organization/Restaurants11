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

export interface DatabaseStatus {
    engine: string;
    is_postgres: boolean;
    db_name: string;
    db_host: string;
    db_port: string;
    db_user: string;
    port_open: boolean;
    status: 'connected_postgres' | 'postgres_port_detected' | 'sqlite_fallback';
    message: string;
}

export interface AutoSetupPostgresPayload {
    db_name?: string;
    db_user?: string;
    db_password?: string;
    db_host?: string;
    db_port?: string;
}

export interface AutoSetupPostgresResponse {
    success: boolean;
    db_created: boolean;
    db_name: string;
    message: string;
    details?: string;
    engine: string;
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

    /**
     * فحص حالة قاعدة البيانات الحالية وسيرفر PostgreSQL.
     */
    getDatabaseStatus: async (): Promise<DatabaseStatus> => {
        const response = await api.get<DatabaseStatus>('/core/license/db-status/');
        return response.data;
    },

    /**
     * إنشاء وتهيئة قاعدة بيانات PostgreSQL وتطبيق الجداول تلقائياً بضغطة زر واحدة.
     */
    autoSetupPostgres: async (payload?: AutoSetupPostgresPayload): Promise<AutoSetupPostgresResponse> => {
        const response = await api.post<AutoSetupPostgresResponse>('/core/license/superdev/auto-setup-postgres/', payload || {});
        return response.data;
    },

    /**
     * اعتماد هذا الجهاز كجهاز رسمي للمطورين الفائقين (ظافر أو أيوب).
     */
    authorizeSuperDevDevice: async (passcode: string, developerName?: string): Promise<{ success: boolean; device_token: string; message: string }> => {
        const response = await api.post<{ success: boolean; device_token: string; message: string }>('/core/license/superdev/authorize-device/', {
            passcode,
            developer_name: developerName || 'superdev'
        });
        if (response.data?.device_token && typeof window !== 'undefined') {
            localStorage.setItem('resto_superdev_device_token', response.data.device_token);
        }
        return response.data;
    },
};




