import api from '@/lib/api';

export interface Payment {
    id: number;
    order_id: number;
    payment_date_time: string;
    amount: number;
    payment_method: string;
    card_provider?: string;
    transaction_id?: string;
}

export const paymentService = {
    getPayments: async (): Promise<Payment[]> => {
        const response = await api.get('/payments/');
        return response.data;
    },
    recordPayment: async (data: any): Promise<Payment> => {
        const response = await api.post('/payments/', data);
        return response.data;
    }
};
