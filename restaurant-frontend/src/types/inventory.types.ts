/**
 * Inventory Domain Types
 * Unified types for Ingredients, Recipes, Suppliers, and Automated Purchase Orders
 */

export interface Ingredient {
  id: number;
  name: string;
  barcode?: string;
  current_stock: number;
  unit: string;
  cost_per_unit: number;
  reorder_level: number;
  image?: string;
  last_updated: string;
}

export interface RecipeIngredient {
  id: number;
  menu_item: any;
  ingredient: Ingredient;
  quantity_needed: number;
}

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  notes?: string;
}

export type AutoPurchaseRiskLevel = 'CRITICAL' | 'WARNING' | 'SAFE';

export interface AutoPurchaseItem {
  id: number;
  name: string;
  current_stock: number;
  unit: string;
  cost_per_unit: number;
  reorder_level: number;
  daily_burn_rate: number;
  days_until_exhaustion: number;
  suggested_order_quantity: number;
  estimated_order_cost: number;
  risk_level: AutoPurchaseRiskLevel;
  supplier_id?: number | null;
  supplier_name?: string | null;
  supplier_phone?: string | null;
}

export interface AutoPurchaseOrderPlan {
  total_items_to_order: number;
  total_estimated_cost: number;
  critical_items_count: number;
  warning_items_count: number;
  items: AutoPurchaseItem[];
}

export interface StocktakeAuditItem {
  ingredient_id: number;
  name: string;
  unit: string;
  cost_per_unit: number;
  book_stock: number;
  actual_stock?: number;
  variance?: number;
  variance_cost?: number;
}

export interface StocktakeReconciliationPayload {
  session_date: string;
  notes?: string;
  items: Array<{
    ingredient_id: number;
    actual_stock: number;
    notes?: string;
  }>;
}
