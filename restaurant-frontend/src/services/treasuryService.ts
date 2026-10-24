import api from '@/lib/api';
import { Shift } from '@/store/authStore';

export interface TreasuryTransaction {
    id: number;
    shift_id: number;
    amount: number;
    transaction_type: 'in' | 'out';
    reference_type: 'order' | 'expense' | 'general_expense' | 'salary' | 'refund';
    reference_id?: number;
    description?: string;
    created_at: string;
}

export interface AbsenceDayItem {
    date: string;
    day_name: string;
    is_friday?: boolean;
}

export interface ShiftDeficitItem {
    shift_id: number;
    shift_name: string;
    cashier_id?: number;
    cashier_name?: string;
    start_time?: string;
    end_time?: string;
    date?: string;
    expected_cash: number;
    actual_cash: number;
    variance?: number;
    deficit_amount: number;
    is_settled?: boolean;
    status?: string;
    status_display?: string;
    notes?: string;
}

export interface ProfitMarginStatement {
    total_sales: number;
    total_cogs: number;
    gross_profit: number;
    gross_margin_percentage: number;
    total_expenses: number;
    total_salaries: number;
    total_unsettled_deficits: number;
    total_settled_deficits: number;
    total_surplus: number;
    net_profit: number;
    net_profit_margin_percentage: number;
    deficits_list: ShiftDeficitItem[];
    treasury_current_balance: number;
}

export interface SalaryPayment {
    id: number;
    employee_id: number;
    employee_name?: string;
    amount: number;
    basic_salary?: number;
    absence_days?: number;
    daily_rate?: number;
    absence_deduction?: number;
    late_deduction?: number;
    late_minutes?: number;
    shortage_deduction?: number;
    shortage_reason?: string;
    bonus_amount?: number;
    deduction_reason?: string;
    absence_dates_detail?: string;
    deduction_approved_by_name?: string;
    payment_date: string;
    payment_day_name?: string;
    month_covered: string;
    notes?: string;
}

export interface SalaryPaymentPayload {
    employee_id: number;
    amount: number;
    month_covered: string;
    basic_salary?: number;
    absence_days?: number;
    daily_rate?: number;
    absence_deduction?: number;
    late_deduction?: number;
    late_minutes?: number;
    shortage_deduction?: number;
    shortage_reason?: string;
    bonus_amount?: number;
    deduction_reason?: string;
    absence_dates_detail?: string;
    payment_day_name?: string;
    admin_username?: string;
    admin_password?: string;
    notes?: string;
}

export interface AbsenceCalculation {
    employee_id: number;
    employee_name: string;
    month: string;
    today_date?: string;
    current_day_name?: string;
    basic_salary: number;
    total_days: number;
    effective_days: number;
    attended_days: number;
    absence_days: number;
    daily_rate: number;
    suggested_deduction: number;
    suggested_net: number;
    absence_dates_list?: AbsenceDayItem[];
    total_uncovered_shortage?: number;
    detected_shortages?: ShiftDeficitItem[];
    total_late_minutes?: number;
    total_late_days?: number;
    suggested_late_deduction?: number;
    late_deduction_rate_per_day?: number;
}

export interface AdminVerifyResult {
    success: boolean;
    admin_id?: number;
    admin_name?: string;
    message?: string;
}

export const treasuryService = {
    getCurrentShift: async (): Promise<Shift | null> => {
        const response = await api.get('/payments/shifts/current');
        return response.data;
    },
    openShift: async (openingBalance: number): Promise<Shift> => {
        const response = await api.post('/payments/shifts/open', { opening_balance: openingBalance });
        return response.data;
    },
    closeShift: async (closingBalance: number): Promise<Shift> => {
        const response = await api.post('/payments/shifts/close', { closing_balance: closingBalance });
        return response.data;
    },
    recordExpense: async (data: { amount: number; description: string; reference_type: string; reference_id?: number }): Promise<TreasuryTransaction> => {
        const response = await api.post('/payments/transactions/expense', data);
        return response.data;
    },
    recordGeneralExpense: async (data: { amount: number; description: string; reference_type: string; reference_id?: number }): Promise<TreasuryTransaction> => {
        const response = await api.post('/payments/transactions/general-expense', data);
        return response.data;
    },
    getTreasurySummary: async (): Promise<any> => {
        const response = await api.get('/payments/treasury/summary');
        return response.data;
    },
    listGeneralTransactions: async (): Promise<TreasuryTransaction[]> => {
        const response = await api.get('/payments/transactions/general');
        return response.data;
    },
    getSalaries: async (): Promise<SalaryPayment[]> => {
        const response = await api.get('/payments/salaries');
        return response.data;
    },
    calculateAbsence: async (employeeId: number, month: string): Promise<AbsenceCalculation> => {
        const response = await api.get(`/payments/salaries/calculate-absence?employee_id=${employeeId}&month=${month}`);
        return response.data;
    },
    verifyAdminApproval: async (credentials: { admin_username: string; admin_password: string }): Promise<AdminVerifyResult> => {
        const response = await api.post('/payments/salaries/verify-admin', credentials);
        return response.data;
    },
    recordSalaryPayment: async (data: SalaryPaymentPayload): Promise<SalaryPayment> => {
        const response = await api.post('/payments/salaries', data);
        return response.data;
    },
    getProfitMarginAndDeficits: async (): Promise<ProfitMarginStatement> => {
        const response = await api.get('/payments/dashboard/profit-margin-and-deficits');
        return response.data;
    },
    settleShiftDeficit: async (shiftId: number, notes?: string): Promise<{ success: boolean; message: string; transaction_id?: number }> => {
        const response = await api.post('/payments/dashboard/settle-shift-deficit', { shift_id: shiftId, notes });
        return response.data;
    },
    settleAllDeficits: async (): Promise<{ success: boolean; settled_count: number; total_amount: number; message: string }> => {
        const response = await api.post('/payments/dashboard/settle-all-deficits');
        return response.data;
    },
    transferProfitToTreasury: async (amount: number, description?: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/payments/dashboard/transfer-profit-to-treasury', { amount, description });
        return response.data;
    }
};
