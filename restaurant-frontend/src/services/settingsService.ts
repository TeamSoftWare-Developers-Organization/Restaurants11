import api from '@/lib/api';

export interface RestaurantSettings {
    name: string;
    logo?: string;
    address?: string;
    phone?: string;
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
    }
};
