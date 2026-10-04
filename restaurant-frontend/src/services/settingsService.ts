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

    // Invoice & Printing Customizations
    sales_invoice_template?: 'thermal_80mm' | 'thermal_58mm' | 'detailed_a4';
    purchase_invoice_template?: 'classic_clean' | 'corporate_table';
    purchase_return_template?: 'standard_voucher' | 'detailed_voucher';
    auto_print_on_checkout?: boolean;
    show_logo_sales?: boolean;
    show_logo_purchases?: boolean;
    show_logo_returns?: boolean;
    show_qr_code?: boolean;
    sales_invoice_terms?: string;
    purchase_invoice_terms?: string;
    purchase_return_terms?: string;
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
