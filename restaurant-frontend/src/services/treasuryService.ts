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

export interface SalaryPayment {
    id: number;
    employee_id: number;
    employee_name?: string;
    amount: number;
    basic_salary?: number;
    absence_days?: number;
    daily_rate?: number;
    absence_deduction?: number;
    bonus_amount?: number;
    deduction_reason?: string;
    deduction_approved_by_name?: string;
    payment_date: string;
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
    bonus_amount?: number;
    deduction_reason?: string;
    admin_username?: string;
    admin_password?: string;
    notes?: string;
}

export interface AbsenceCalculation {
    employee_id: number;
    employee_name: string;
    month: string;
    basic_salary: number;
    total_days: number;
    effective_days: number;
    attended_days: number;
    absence_days: number;
    daily_rate: number;
    suggested_deduction: number;
    suggested_net: number;
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
    }
};
