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
    getSalaries: async (): Promise<any[]> => {
        const response = await api.get('/payments/salaries');
        return response.data;
    },
    recordSalaryPayment: async (data: { employee_id: number; amount: number; month_covered: string; notes?: string }): Promise<any> => {
        const response = await api.post('/payments/salaries', data);
        return response.data;
    }
};
