// src/services/aiRosteringService.ts

import api from '@/lib/api';

export interface HourlyForecastItem {
    hour: string;
    hour_int: number;
    predicted_orders: number;
    is_peak: boolean;
    is_super_peak: boolean;
    load_label: string;
    recommended_chefs: number;
    recommended_cashiers: number;
    recommended_waiters: number;
    recommended_total_staff: number;
}

export interface DemandForecastResponse {
    target_date: string;
    weekday_name: string;
    total_predicted_orders: number;
    peak_hours_count: number;
    historical_sample_orders: number;
    demand_multiplier: number;
    timeline: HourlyForecastItem[];
}

export interface ShiftPlanInfo {
    name: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    total_predicted_orders: number;
    peak_hours: number;
    max_orders_in_single_hour: number;
    required_chefs: number;
    required_cashiers: number;
    required_waiters: number;
    total_staff_needed: number;
}

export interface AssignedMember {
    employee_id: number;
    employee_name: string;
    role: string;
    role_key: string;
    station: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    hourly_wage: number;
    estimated_shift_cost: number;
}

export interface ShiftAllocationGroup {
    shift_info: ShiftPlanInfo;
    assigned_members: AssignedMember[];
    coverage_gap: number;
    is_fully_staffed: boolean;
}

export interface FinancialOptimization {
    hourly_wage_rate: number;
    traditional_labor_cost: number;
    optimized_labor_cost: number;
    daily_savings: number;
    monthly_projected_savings: number;
    savings_percentage: number;
    projected_revenue: number;
    labor_cost_ratio_percentage: number;
    efficiency_rating: string;
}

export interface OptimizedRosterResponse {
    target_date: string;
    weekday_name: string;
    total_predicted_orders: number;
    peak_hours_count: number;
    demand_multiplier?: number;
    hourly_timeline: HourlyForecastItem[];
    shifts: ShiftAllocationGroup[];
    total_assigned_staff_count: number;
    saved_to_db: boolean;
    saved_records_count: number;
    financial_optimization: FinancialOptimization;
}

export const aiRosteringService = {
    getForecast: async (targetDate?: string): Promise<DemandForecastResponse> => {
        const params = targetDate ? { target_date: targetDate } : {};
        const response = await api.get('/ai/rostering/forecast/', { params });
        return response.data;
    },

    getPreview: async (targetDate?: string): Promise<OptimizedRosterResponse> => {
        const params = targetDate ? { target_date: targetDate } : {};
        const response = await api.get('/ai/rostering/preview/', { params });
        return response.data;
    },

    applyRoster: async (targetDate?: string): Promise<{ success: boolean; message: string; roster: OptimizedRosterResponse }> => {
        const response = await api.post('/ai/rostering/apply/', { target_date: targetDate });
        return response.data;
    }
};
