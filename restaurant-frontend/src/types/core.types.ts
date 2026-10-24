/**
 * Core Domain Types
 * Unified types for Licenses, Restaurant Settings, Shift Reconciliation, and Employees
 */

// 1. License & Activation
export type LicenseType = 'TRIAL' | 'LIFETIME';

export interface LicenseStatus {
  machine_id: string;
  installed_at: string;
  trial_days: number;
  trial_hours?: number;
  trial_duration_seconds?: number;
  is_activated: boolean;
  license_type: LicenseType;
  product_key?: string | null;
  activated_at?: string | null;
  is_trial_active: boolean;
  remaining_trial_days: number;
  remaining_trial_seconds?: number;
  remaining_trial_minutes?: number;
  remaining_trial_formatted?: string;
  is_valid: boolean;
}

export interface ActivateResponse {
  success: boolean;
  message: string;
  license_status?: LicenseStatus | null;
}

// 2. Restaurant Settings
export interface RestaurantSettings {
  name: string;
  owner_name?: string;
  logo?: string;
  address?: string;
  phone?: string;
  secondary_phone?: string;
  email?: string;
  tax_number?: string;
  commercial_record?: string;
  bio?: string;
  website?: string;
  currency: string;
  tax_rate: number;
  invoice_footer_message?: string;
  is_delivery_enabled: boolean;
  default_delivery_fee: number;

  // Invoice & Printing Customizations
  sales_invoice_template?: 'thermal_80mm' | 'thermal_58mm' | 'detailed_a4';
  purchase_invoice_template?: 'classic_clean' | 'corporate_table';
  purchase_return_template?: 'standard_voucher' | 'detailed_voucher';
  auto_print_on_checkout?: boolean;
  show_logo_sales?: boolean;
  show_logo_purchases?: boolean;
  show_logo_returns?: boolean;
  show_qr_code?: boolean;
  sales_invoice_terms?: string;
  purchase_invoice_terms?: string;
  purchase_return_terms?: string;

  // Biometric Device Network Configuration
  biometric_device_ip?: string;
  biometric_device_port?: number;

  // Attendance & Penalty Policy
  default_work_start_time?: string;
  default_work_end_time?: string;
  default_late_grace_period_minutes?: number;
  default_late_deduction_amount?: number;
  default_absence_deduction_amount?: number;
}

// 3. Shift Reconciliation & Variance
export type VarianceStatus = 'BALANCED' | 'SURPLUS' | 'DEFICIT' | 'EMPTY';

export interface ShiftSummary {
  id: number;
  user_name: string;
  start_time: string;
  end_time?: string;
  status: 'OPEN' | 'CLOSED';
  starting_cash: number;
  actual_cash?: number;
  calculated_cash: number;
  variance?: number;
  variance_status?: VarianceStatus;
  total_orders_count?: number;
  total_sales?: number;
  cash_sales?: number;
  card_sales?: number;
  expenses?: number;
  notes?: string;
}

export interface ShiftDeficitItem {
  shift_id: number;
  cashier_name: string;
  shift_date: string;
  start_time: string;
  end_time?: string;
  starting_cash: number;
  total_cash_sales: number;
  expected_cash: number;
  actual_cash: number;
  deficit_amount: number;
  is_settled: boolean;
  settled_at?: string;
  settled_by_name?: string;
  notes?: string;
}

// 4. Employees & Permissions
export interface UserPermissions {
  dashboard?: boolean;
  pos?: boolean;
  orders?: boolean;
  tables?: boolean;
  reservations?: boolean;
  menu?: boolean;
  recipes?: boolean;
  inventory?: boolean;
  payments?: boolean;
  treasury?: boolean;
  expenses?: boolean;
  salaries?: boolean;
  employees?: boolean;
  attendance?: boolean;
  settings?: boolean;
  [key: string]: boolean | undefined;
}

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  phone_number?: string;
  basic_salary?: number;
  hire_date: string;
  username: string;
  permissions?: UserPermissions;
  has_fingerprint?: boolean;
  work_start_time?: string;
  work_end_time?: string;
  late_grace_period_minutes?: number;
  late_deduction_amount?: number;
  absence_deduction_amount?: number;
}
