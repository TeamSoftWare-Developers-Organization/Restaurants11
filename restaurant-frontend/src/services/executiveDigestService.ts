// src/services/executiveDigestService.ts

import api from '@/lib/api';

export interface ActionableInsight {
    id: string;
    title: string;
    description: string;
    priority: 'critical' | 'warning' | 'info' | 'success';
    category: 'inventory' | 'shifts' | 'kitchen' | 'reservations' | 'finance' | 'general';
    action_label: string;
    action_url: string;
    icon?: string;
}

export interface InventoryDigest {
    status: 'safe' | 'warning' | 'critical';
    critical_count: number;
    items: Array<{
        id: number;
        name: string;
        current_stock: number;
        unit: string;
        days_left: number;
        daily_burn_rate: number;
        risk_level: string;
    }>;
}

export interface ShiftsDigest {
    status: 'safe' | 'warning' | 'critical';
    open_count: number;
    suspicious_count: number;
    pending_overtime_count: number;
    anomalies: Array<{
        shift_id: number;
        cashier_name: string;
        risk_score: number;
        risk_status: 'HIGH' | 'MEDIUM' | 'LOW';
        flags: string[];
        cash_variance: number;
    }>;
}

export interface KitchenDigest {
    active_orders: number;
    delayed_orders: number;
    load_factor: number;
    load_status: string;
}

export interface ReservationsDigest {
    today_count: number;
    high_risk_count: number;
    high_risk_items: Array<{
        id: number;
        customer_name: string;
        party_size: number;
        table_number: string;
        risk_score: number;
        risk_level: string;
        factors: string[];
    }>;
}

export interface SalesAndSavingsDigest {
    today_revenue: number;
    today_completed_orders: number;
    daily_ai_savings: number;
    monthly_projected_savings: number;
    savings_percentage: number;
    efficiency_rating: string;
}

export interface ExecutiveDigestResponse {
    timestamp: string;
    target_date: string;
    health_score: number;
    health_label: string;
    inventory: InventoryDigest;
    shifts: ShiftsDigest;
    kitchen: KitchenDigest;
    reservations: ReservationsDigest;
    sales_and_savings: SalesAndSavingsDigest;
    actionable_insights: ActionableInsight[];
}

export const executiveDigestService = {
    getExecutiveBrief: async (): Promise<ExecutiveDigestResponse> => {
        const response = await api.get('/core/ai/executive-brief/');
        return response.data;
    }
};
