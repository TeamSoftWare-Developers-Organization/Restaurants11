// src/services/shiftService.ts

import api from '@/lib/api';

export interface ShiftTemplate {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    overtime_hourly_rate: number;
    color: string;
    description?: string;
    is_active: boolean;
}

export interface ShiftAllocation {
    id: number;
    employee_id: number;
    employee_name: string;
    employee_role: string;
    shift_template_id?: number | null;
    shift_name: string;
    date: string;
    start_time: string;
    end_time: string;
    pos_station: string;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    status_display: string;
    actual_pos_shift_id?: number | null;
    is_pos_active: boolean;
    // Overtime
    has_overtime: boolean;
    overtime_hours: number;
    overtime_hourly_rate: number;
    overtime_total_cost: number;
    extra_duties?: string;
    overtime_status: 'none' | 'pending' | 'approved' | 'paid';
    overtime_status_display: string;
    notes?: string;
    created_at: string;
}

export interface ShiftSummary {
    total_shifts_today: number;
    active_pos_shifts: number;
    total_overtime_hours: number;
    total_overtime_cost: number;
    scheduled_count: number;
    completed_count: number;
}

export interface CreateAllocationPayload {
    employee_id: number;
    shift_template_id?: number;
    shift_name: string;
    date: string;
    start_time: string;
    end_time: string;
    pos_station?: string;
    overtime_hourly_rate?: number;
    notes?: string;
    has_overtime?: boolean;
    overtime_hours?: number;
    extra_duties?: string;
    overtime_status?: 'none' | 'pending' | 'approved' | 'paid';
}

export interface OvertimePayload {
    has_overtime: boolean;
    overtime_hours: number;
    overtime_hourly_rate?: number;
    extra_duties: string;
    overtime_status?: 'pending' | 'approved' | 'paid';
}

export interface StandaloneOvertimePayload {
    employee_id: number;
    date: string;
    overtime_hours: number;
    overtime_hourly_rate?: number;
    extra_duties: string;
    overtime_status?: 'pending' | 'approved' | 'paid';
    notes?: string;
}

export const shiftService = {
    // Templates
    getTemplates: async (): Promise<ShiftTemplate[]> => {
        const res = await api.get('/shifts/templates/');
        return res.data;
    },

    createTemplate: async (payload: Partial<ShiftTemplate>): Promise<ShiftTemplate> => {
        const res = await api.post('/shifts/templates/', payload);
        return res.data;
    },

    deleteTemplate: async (id: number): Promise<{ success: boolean }> => {
        const res = await api.delete(`/shifts/templates/${id}/`);
        return res.data;
    },

    // Allocations
    getAllocations: async (dateStr?: string, employeeId?: number, status?: string): Promise<ShiftAllocation[]> => {
        const params: any = {};
        if (dateStr) params.date_str = dateStr;
        if (employeeId) params.employee_id = employeeId;
        if (status && status !== 'all') params.status = status;
        const res = await api.get('/shifts/allocations/', { params });
        return res.data;
    },

    createAllocation: async (payload: CreateAllocationPayload): Promise<ShiftAllocation> => {
        const res = await api.post('/shifts/allocations/', payload);
        return res.data;
    },

    updateAllocation: async (id: number, payload: Partial<ShiftAllocation>): Promise<ShiftAllocation> => {
        const res = await api.put(`/shifts/allocations/${id}/`, payload);
        return res.data;
    },

    deleteAllocation: async (id: number): Promise<{ success: boolean }> => {
        const res = await api.delete(`/shifts/allocations/${id}/`);
        return res.data;
    },

    // Overtime
    recordOvertime: async (allocationId: number, payload: OvertimePayload): Promise<ShiftAllocation> => {
        const res = await api.post(`/shifts/allocations/${allocationId}/overtime/`, payload);
        return res.data;
    },

    createStandaloneOvertime: async (payload: StandaloneOvertimePayload): Promise<ShiftAllocation> => {
        const res = await api.post('/shifts/overtime/create/', payload);
        return res.data;
    },

    // Summary
    getSummary: async (dateStr?: string): Promise<ShiftSummary> => {
        const params = dateStr ? { date_str: dateStr } : {};
        const res = await api.get('/shifts/summary/', { params });
        return res.data;
    },

    // POS Active Session
    getPosActiveSession: async (): Promise<any> => {
        const res = await api.get('/shifts/pos/active-session/');
        return res.data;
    },

    startPosShift: async (openingBalance: number, allocationId?: number, customShiftName?: string) => {
        const res = await api.post('/shifts/pos/start/', null, {
            params: {
                opening_balance: openingBalance,
                allocation_id: allocationId,
                custom_shift_name: customShiftName
            }
        });
        return res.data;
    },

    finishPosShift: async (
        closingBalance: number,
        hasOvertime: boolean = false,
        overtimeHours: number = 0,
        overtimeRate: number = 15,
        extraDuties?: string
    ) => {
        const res = await api.post('/shifts/pos/finish/', null, {
            params: {
                closing_balance: closingBalance,
                has_overtime: hasOvertime,
                overtime_hours: overtimeHours,
                overtime_rate: overtimeRate,
                extra_duties: extraDuties
            }
        });
        return res.data;
    }
};
