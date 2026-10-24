/**
 * AI Domain Types
 * Unified types and interfaces for AI features across the application
 */

// 1. Menu Matrix & Engineering
export type MenuCategoryClass = 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';

export interface AIMenuMatrixItem {
  item_id: number;
  name: string;
  selling_price: number;
  item_cost: number;
  profit_margin: number;
  food_cost_percentage: number;
  sold_count: number;
  classification: MenuCategoryClass;
  badge: string;
  recommendation: string;
}

// 2. Risk Levels & Reservation Risk
export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AIReservationRisk {
  reservation_id: number;
  guest_name: string;
  no_show_probability: number;
  risk_level: RiskLevel;
  risk_factors: string[];
  suggested_action: string;
}

// 3. Smart Kitchen & KDS Queue
export type KitchenLoadStatus = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AIKDSItem {
  item_id: number;
  name: string;
  quantity: number;
  duration_minutes: number;
  fire_delay_minutes: number;
  station_name?: string;
  station_icon?: string;
}

export interface AIKDSOrder {
  order_id: number;
  order_number: string;
  table_number: string | null;
  total_prep_time_minutes: number;
  estimated_ready_at: string;
  kitchen_load_factor: number;
  kitchen_load_status?: string;
  elapsed_minutes?: number;
  remaining_minutes?: number;
  items: AIKDSItem[];
}

// 4. Dynamic Promotions & Happy Hour
export type PromotionType = 'FLASH_DISCOUNT' | 'SMART_COMBO' | 'VOLUME_BOOSTER';

export interface AIPromoItem {
  item_id: number;
  name: string;
  original_price: number;
  discounted_price: number;
  discount_amount?: number;
  item_cost: number;
  margin_before?: number;
  margin_after?: number;
  classification: string;
  classification_badge: string;
}

export interface AIPromotionSuggestion {
  id: string;
  title: string;
  type: PromotionType;
  discount_percentage: number;
  time_window: string;
  badge: string;
  rationale: string;
  projected_sales_boost: string;
  projected_revenue_lift: string;
  items: AIPromoItem[];
  bundle_original_price?: number;
  bundle_discounted_price?: number;
  bundle_profit_margin?: number;
  is_active: boolean;
  start_hour: number;
  end_hour: number;
}

export interface AIPromotionsResponse {
  status: string;
  current_hour: number;
  is_currently_off_peak: boolean;
  off_peak_windows: Array<{
    start_hour: number;
    end_hour: number;
    label: string;
    name: string;
  }>;
  promotions: AIPromotionSuggestion[];
  active_promotions_count: number;
  generated_at: string;
}

// 5. Staff Rostering & Demand Forecast
export interface AIHourlyForecastItem {
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

export interface AIDemandForecastResponse {
  target_date: string;
  weekday_name: string;
  total_predicted_orders: number;
  peak_hours_count: number;
  historical_sample_orders: number;
  demand_multiplier: number;
  timeline: AIHourlyForecastItem[];
}

export interface AIShiftPlanInfo {
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

export interface AIAssignedMember {
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

export interface AIShiftAllocationGroup {
  shift_info: AIShiftPlanInfo;
  assigned_members: AIAssignedMember[];
  coverage_gap: number;
  is_fully_staffed: boolean;
}

export interface AIFinancialOptimization {
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

export interface AIOptimizedRosterResponse {
  target_date: string;
  weekday_name: string;
  total_predicted_orders: number;
  peak_hours_count: number;
  demand_multiplier?: number;
  hourly_timeline: AIHourlyForecastItem[];
  shifts: AIShiftAllocationGroup[];
  total_assigned_staff_count: number;
  saved_to_db: boolean;
  saved_records_count: number;
  financial_optimization: AIFinancialOptimization;
}

// 6. Executive Digest & Anomaly Detection
export interface AIActionableInsight {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'warning' | 'info' | 'success';
  category: 'inventory' | 'shifts' | 'kitchen' | 'reservations' | 'finance' | 'general';
  action_label: string;
  action_url: string;
  icon?: string;
}

export interface AIAnomalyShiftItem {
  shift_id: number;
  cashier_name: string;
  risk_score: number;
  risk_status: RiskLevel;
  flags: string[];
  cash_variance: number;
}

export interface AIExecutiveDigestResponse {
  timestamp: string;
  target_date: string;
  health_score: number;
  health_label: string;
  inventory: {
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
  };
  shifts: {
    status: 'safe' | 'warning' | 'critical';
    open_count: number;
    suspicious_count: number;
    pending_overtime_count: number;
    anomalies: AIAnomalyShiftItem[];
  };
  kitchen: {
    active_orders: number;
    delayed_orders: number;
    load_factor: number;
    load_status: string;
  };
  reservations: {
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
  };
  sales_and_savings: {
    today_revenue: number;
    today_completed_orders: number;
    daily_ai_savings: number;
    monthly_projected_savings: number;
    savings_percentage: number;
    efficiency_rating: string;
  };
  insights: AIActionableInsight[];
}
