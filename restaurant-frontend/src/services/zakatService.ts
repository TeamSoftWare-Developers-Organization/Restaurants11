import api from "@/services/api";

export interface LiveZakatSummary {
  cash_in_hand: number;
  cash_in_bank: number;
  inventory_value: number;
  accounts_receivable: number;
  accounts_payable: number;
  accrued_expenses: number;
  suggested_gold_gram_price: number;
  nisab_threshold: number;
  total_assets: number;
  total_liabilities: number;
  net_zakat_base: number;
  hijri_zakat_due: number;
  gregorian_zakat_due: number;
  currency: string;
}

export interface ZakatDisbursement {
  id: number;
  amount: number;
  recipient_category: string;
  recipient_name?: string;
  disbursed_at: string;
  payment_method: string;
  notes?: string;
  created_at: string;
}

export interface ZakatCalculation {
  id: number;
  title: string;
  date_calculated: string;
  year_type: "HIJRI" | "GREGORIAN" | string;
  gold_gram_price: number;
  nisab_threshold: number;
  is_nisab_reached: boolean;
  cash_in_hand: number;
  cash_in_bank: number;
  inventory_value: number;
  accounts_receivable: number;
  other_zakatable_assets: number;
  total_assets: number;
  accounts_payable: number;
  accrued_expenses: number;
  other_liabilities: number;
  total_liabilities: number;
  net_zakat_base: number;
  zakat_percentage: number;
  zakat_due: number;
  zakat_paid: number;
  remaining_due: number;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | string;
  notes?: string;
  created_at: string;
  disbursements: ZakatDisbursement[];
}

export interface CreateZakatInput {
  title: string;
  date_calculated?: string;
  year_type: "HIJRI" | "GREGORIAN";
  gold_gram_price: number;
  cash_in_hand: number;
  cash_in_bank?: number;
  inventory_value: number;
  accounts_receivable?: number;
  other_zakatable_assets?: number;
  accounts_payable: number;
  accrued_expenses?: number;
  other_liabilities?: number;
  notes?: string;
}

export interface RecordDisbursementInput {
  zakat_calc_id: number;
  amount: number;
  recipient_category: string;
  recipient_name?: string;
  disbursed_at?: string;
  payment_method?: string;
  notes?: string;
  record_in_treasury?: boolean;
}

export const zakatService = {
  getLiveSummary: async (): Promise<LiveZakatSummary> => {
    const res = await api.get("/zakat/live-summary/");
    return res.data;
  },

  getCalculations: async (): Promise<ZakatCalculation[]> => {
    const res = await api.get("/zakat/calculations/");
    return res.data;
  },

  createCalculation: async (data: CreateZakatInput): Promise<ZakatCalculation> => {
    const res = await api.post("/zakat/calculations/", data);
    return res.data;
  },

  recordDisbursement: async (data: RecordDisbursementInput) => {
    const res = await api.post("/zakat/disbursements/", data);
    return res.data;
  },

  deleteCalculation: async (id: number) => {
    const res = await api.delete(`/zakat/calculations/${id}/`);
    return res.data;
  }
};
