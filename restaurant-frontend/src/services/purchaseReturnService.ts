import api from "@/services/api";

export interface ReturnItem {
  id?: number;
  ingredient_id: number;
  ingredient_name?: string;
  unit?: string;
  unit_display?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  reason?: string;
}

export interface PurchaseReturn {
  id: number;
  return_number: string;
  supplier_id: number;
  supplier_name: string;
  supplier_company: string;
  supplier_phone: string;
  invoice_id?: number | null;
  invoice_number?: string;
  total_amount: number;
  refund_method: "DEBT_REDUCTION" | "CASH" | string;
  refund_method_display: string;
  reason: string;
  status: string;
  status_display: string;
  return_date: string;
  created_at: string;
  items_count: number;
  items: ReturnItem[];
}

export interface CreatePurchaseReturnInput {
  supplier_id: number;
  invoice_id?: number | null;
  return_number?: string;
  refund_method: "DEBT_REDUCTION" | "CASH";
  reason?: string;
  return_date?: string;
  items: {
    ingredient_id: number;
    quantity: number;
    unit_price: number;
    reason?: string;
  }[];
}

export const purchaseReturnService = {
  getReturns: async (): Promise<PurchaseReturn[]> => {
    const res = await api.get("/purchases/returns/");
    return res.data;
  },

  createReturn: async (data: CreatePurchaseReturnInput): Promise<{ status: string; return_id: number; return_number: string; total: number }> => {
    const res = await api.post("/purchases/returns/", data);
    return res.data;
  },

  getSuppliers: async () => {
    const res = await api.get("/suppliers/");
    return res.data;
  },

  getInvoices: async () => {
    const res = await api.get("/purchases/");
    return res.data;
  },

  getIngredients: async () => {
    const res = await api.get("/inventory/ingredients/");
    return res.data;
  }
};
