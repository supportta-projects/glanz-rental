// Core Type Definitions for Glanz Rental

export type UserRole = "super_admin" | "branch_admin" | "staff";

export type OrderStatus = "scheduled" | "active" | "pending_return" | "completed" | "cancelled" | "partially_returned";

export type OrderItemReturnStatus = "not_yet_returned" | "returned" | "missing";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  branch_id: string | null;
  full_name: string;
  phone: string;
  is_active?: boolean; // Whether the staff account is active (can log in)
  gst_number?: string;
  gst_enabled?: boolean; // true = GST enabled, false = GST disabled
  gst_rate?: number; // GST rate as percentage (e.g., 5.00 for 5%)
  gst_included?: boolean; // true = GST included in price, false = GST added on top
  upi_id?: string; // UPI ID for payment QR codes
  branch?: Branch;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  logo_url?: string;
}

export interface Customer {
  id: string;
  customer_number?: string; // Format: GLA-00001
  name: string;
  phone: string;
  email?: string;
  address?: string;
  id_proof_type?: "aadhar" | "passport" | "voter" | "others";
  id_proof_number?: string;
  id_proof_front_url?: string;
  id_proof_back_url?: string;
  created_at?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  photo_url: string;
  product_name?: string;
  quantity: number;
  price_per_day: number;
  days: number;
  line_total: number;
  // Return tracking fields
  return_status?: OrderItemReturnStatus;
  actual_return_date?: string;
  late_return?: boolean;
  missing_note?: string;
}

export interface Order {
  id: string;
  branch_id: string;
  staff_id: string;
  customer_id: string;
  invoice_number: string;
  booking_date?: string; // When order was booked/created (different from start_date)
  start_date: string; // Legacy DATE field (for backward compatibility)
  end_date: string; // Legacy DATE field (for backward compatibility)
  start_datetime?: string; // New TIMESTAMP field with time
  end_datetime?: string; // New TIMESTAMP field with time
  status: OrderStatus;
  total_amount: number;
  subtotal?: number; // Subtotal before GST
  gst_amount?: number; // GST amount (5% of subtotal)
  late_fee?: number; // Late fee amount
  late_returned?: boolean; // True if order has any items returned late
  created_at: string;
  customer?: Customer;
  staff?: User;
  branch?: Branch;
  items?: OrderItem[];
}

// Audit log for return operations
export interface OrderReturnAudit {
  id: string;
  order_id: string;
  order_item_id?: string;
  action: string; // 'marked_returned', 'marked_missing', 'updated_return_date', 'order_status_updated', etc.
  previous_status?: string;
  new_status?: string;
  user_id: string;
  notes?: string;
  created_at: string;
}

export interface OrderDraft {
  customer_id: string | null;
  customer_name?: string;
  customer_phone?: string;
  start_date: string;
  end_date: string;
  invoice_number: string;
  items: OrderItem[];
  grand_total: number;
}

export interface DashboardStats {
  // Current Day Operational Stats
  scheduled_today: number;        // Orders scheduled for today
  ongoing: number;                 // Currently active rentals
  late_returns: number;            // Orders with late returns
  partial_returns: number;         // Partially returned orders
  
  // All-Time Business Metrics
  total_orders: number;            // Total orders ever created
  total_completed: number;         // Total completed/returned orders
  total_revenue: number;           // Total revenue from all completed orders
  total_customers: number;         // Total customers in system
  
  // Today's Activity
  today_collection: number;        // Revenue collected today
  today_completed: number;         // Orders completed today
  today_new_orders: number;       // New orders created today
  
  // Legacy fields for backward compatibility
  active?: number;
  pending_return?: number;
  completed?: number;
}

