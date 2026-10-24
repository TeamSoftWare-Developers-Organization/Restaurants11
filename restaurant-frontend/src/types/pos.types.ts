/**
 * POS Domain Types
 * Unified types and interfaces for Orders, Cart, Payments, Thermal Printing and QR Code
 */

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'TADAWUL'
  | 'MOBICASH'
  | 'SADAD'
  | 'SPLIT'
  | 'OTHER';

export interface POSCartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  category?: string | null;
  notes?: string;
}

export interface POSOrderItem {
  id: number;
  menu_item: {
    id: number;
    name: string;
    price: number;
    category?: any;
    image?: string;
  };
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface POSOrderPayment {
  id: number;
  amount: number;
  payment_method: PaymentMethod | string;
  card_provider?: string;
  payment_date_time: string;
}

export interface POSOrder {
  id: number;
  order_number?: string;
  employee?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    user?: {
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  } | null;
  table_number?: string | null;
  order_date_time: string;
  status: OrderStatus | string;
  total_amount: number;
  discount_amount: number;
  tax_amount?: number;
  items: POSOrderItem[];
  payments?: POSOrderPayment[];
}

export interface ThermalReceiptItem {
  id?: number | string;
  name?: string;
  quantity: number;
  unit_price?: number;
  price?: number;
  notes?: string;
  menu_item?: {
    name: string;
    price: number;
  };
}

export interface ThermalReceiptData {
  id: number | string;
  order_number?: string;
  order_date_time?: string;
  table_number?: string | null;
  status?: string;
  cashier_name?: string;
  shift_id?: number | string | null;
  employee?: {
    id?: number;
    user?: {
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  } | null;
  items: ThermalReceiptItem[];
  total_amount: number;
  discount_amount?: number;
  tax_amount?: number;
  tax_rate?: number;
  payment_method?: string;
  card_provider?: string;
  qr_code_base64?: string;
  qr_image_url?: string;
}
