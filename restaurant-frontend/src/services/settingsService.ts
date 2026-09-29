import api from '@/lib/api';

export interface RestaurantSettings {
    name: string;
    owner_name?: string;
    logo?: string;
    address?: string;
    phone?: string;
    secondary_phone?: string;
    email?: string;
    tax_number?: string;
    commercial_record?: string;
    bio?: string;
    website?: string;
    currency: string;
    tax_rate: number;
    invoice_footer_message?: string;
    is_delivery_enabled: boolean;
    default_delivery_fee: number;
}

export const settingsService = {
    getSettings: async (): Promise<RestaurantSettings> => {
        const response = await api.get('/settings/');
        return response.data;
    },
    updateSettings: async (data: RestaurantSettings): Promise<RestaurantSettings> => {
        const response = await api.put('/settings/', data);
        return response.data;
    },
    uploadLogo: async (file: File): Promise<RestaurantSettings> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/settings/logo/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    removeLogo: async (): Promise<RestaurantSettings> => {
        const response = await api.delete('/settings/logo/');
        return response.data;
    },
};
