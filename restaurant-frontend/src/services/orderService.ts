import api from '@/lib/api';
import { MenuItem } from './menuService';

export interface OrderItem {
    id: number;
    menu_item: MenuItem;
    quantity: number;
    unit_price: number;
    notes?: string;
}

export interface OrderPayment {
    id: number;
    amount: number;
    payment_method: string;
    card_provider?: string;
    payment_date_time: string;
}

export interface Order {
    id: number;
    employee?: any;
    table_number?: string;
    order_date_time: string;
    status: string;
    total_amount: number;
    discount_amount: number;
    items: OrderItem[];
    payments?: OrderPayment[];
}

export const orderService = {
    getOrders: async (): Promise<Order[]> => {
        const response = await api.get('/orders/');
        return response.data;
    },
    getOrder: async (id: number): Promise<Order> => {
        const response = await api.get(`/orders/${id}`);
        return response.data;
    },
    createOrder: async (data: any): Promise<Order> => {
        const response = await api.post('/orders/', data);
        return response.data;
    },
    updateOrder: async (id: number, data: any): Promise<Order> => {
        const response = await api.put(`/orders/${id}`, data);
        return response.data;
    },
    deleteOrder: async (id: number): Promise<void> => {
        await api.delete(`/orders/${id}`);
    }
};
