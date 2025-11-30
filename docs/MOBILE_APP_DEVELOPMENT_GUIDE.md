# Glanz Rental - Mobile App Development Guide

**Version:** 1.0.0  
**Last Updated:** 2025-01-XX  
**Purpose:** Comprehensive guide for mobile app developers to implement the Glanz Rental mobile application

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints & Logic](#api-endpoints--logic)
5. [User Flows](#user-flows)
6. [Business Logic](#business-logic)
7. [State Management](#state-management)
8. [Component Structure](#component-structure)
9. [Authentication & Authorization](#authentication--authorization)
10. [Real-time Updates](#real-time-updates)
11. [Error Handling](#error-handling)
12. [Testing Guidelines](#testing-guidelines)

---

## Overview

Glanz Rental is a rental management system that allows staff members to:
- Create and manage rental orders
- Track customer information and KYC verification
- Manage rental items with photos
- Calculate rental costs with GST support
- Track order status (active, pending return, completed, cancelled)
- Generate invoices

### Key Features

- **Order Management**: Create, view, edit, and cancel orders
- **Customer Management**: Search, create, and manage customers with KYC verification
- **Item Management**: Add items with photos, quantities, and pricing
- **GST Calculation**: Configurable GST rates (included/excluded)
- **Real-time Updates**: Live order status updates
- **Multi-branch Support**: Branch-based access control

---

## Architecture

### Technology Stack (Web Reference)

- **Frontend**: Next.js 16, React, TypeScript
- **Backend**: Supabase (PostgreSQL + Real-time)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **UI Components**: Tailwind CSS, shadcn/ui

### Mobile App Architecture Recommendations

```
┌─────────────────────────────────────┐
│         Mobile App (React Native)   │
│  ┌─────────────────────────────────┐ │
│  │   UI Layer (Components)         │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │   State Management (Zustand)   │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │   API Layer (Supabase Client)   │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │   Data Layer (PostgreSQL)       │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Key Design Principles

1. **Reusable Components**: All UI components should be reusable and platform-agnostic
2. **State Management**: Centralized state management for orders, customers, and user data
3. **Offline Support**: Cache data locally for offline access
4. **Real-time Sync**: Use Supabase real-time subscriptions for live updates
5. **Error Handling**: Comprehensive error handling with user-friendly messages

---

## Database Schema

### Tables Overview

```
branches
├── customers
├── profiles (staff/users)
└── orders
    └── order_items
```

### Table Definitions

#### 1. `branches`

Stores branch/location information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique branch identifier |
| `name` | TEXT | NOT NULL | Branch name |
| `address` | TEXT | NOT NULL | Branch address |
| `phone` | TEXT | NULLABLE | Branch phone number |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_branches_id` on `id`

**RLS Policies:**
- Staff can view branches they belong to
- Super admins can view all branches

---

#### 2. `customers`

Stores customer information and KYC data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique customer identifier |
| `customer_number` | TEXT | UNIQUE, NULLABLE | Format: GLA-00001 |
| `name` | TEXT | NOT NULL | Customer full name |
| `phone` | TEXT | UNIQUE, NOT NULL | 10-digit phone number |
| `email` | TEXT | NULLABLE | Customer email |
| `address` | TEXT | NULLABLE | Customer address |
| `id_proof_type` | TEXT | NULLABLE | Values: 'aadhar', 'passport', 'voter', 'others' |
| `id_proof_number` | TEXT | NULLABLE | ID proof number |
| `id_proof_front_url` | TEXT | NULLABLE | Front side image URL |
| `id_proof_back_url` | TEXT | NULLABLE | Back side image URL |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_customers_phone` on `phone` (UNIQUE)
- `idx_customers_customer_number` on `customer_number` (UNIQUE)

**RLS Policies:**
- Staff can view/create customers in their branch
- Super admins can view all customers

**KYC Verification Logic:**
```typescript
function isCustomerVerified(customer: Customer): boolean {
  return !!(
    customer.id_proof_number ||
    customer.id_proof_front_url ||
    customer.id_proof_back_url
  );
}
```

---

#### 3. `profiles`

Stores staff/user profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, FK to auth.users | User ID from auth |
| `username` | TEXT | UNIQUE, NOT NULL | Unique username |
| `role` | TEXT | NOT NULL, CHECK | Values: 'super_admin', 'branch_admin', 'staff' |
| `branch_id` | UUID | FK to branches, NULLABLE | Associated branch |
| `full_name` | TEXT | NOT NULL | Staff full name |
| `phone` | TEXT | NOT NULL | Staff phone number |
| `gst_number` | TEXT | NULLABLE | GST registration number |
| `gst_enabled` | BOOLEAN | DEFAULT false | Whether GST is enabled |
| `gst_rate` | NUMERIC(5,2) | DEFAULT 5.00 | GST rate percentage |
| `gst_included` | BOOLEAN | DEFAULT false | Whether GST is included in price |
| `upi_id` | TEXT | NULLABLE | UPI ID for payments |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_profiles_branch_id` on `branch_id`
- `idx_profiles_role` on `role`
- `idx_profiles_username` on `username` (UNIQUE)

**RLS Policies:**
- Users can view their own profile
- Staff can view profiles in their branch
- Super admins can view all profiles

---

#### 4. `orders`

Stores rental order information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique order identifier |
| `branch_id` | UUID | FK to branches, NOT NULL | Order branch |
| `staff_id` | UUID | FK to profiles, NOT NULL | Staff who created order |
| `customer_id` | UUID | FK to customers, NOT NULL | Customer for order |
| `invoice_number` | TEXT | UNIQUE, NOT NULL | Invoice number (e.g., GLZ-2025-0123) |
| `start_date` | DATE | NOT NULL | Legacy: Rental start date |
| `end_date` | DATE | NOT NULL | Legacy: Rental end date |
| `start_datetime` | TIMESTAMP | NULLABLE | Rental start date & time |
| `end_datetime` | TIMESTAMP | NULLABLE | Rental end date & time |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | Values: 'active', 'pending_return', 'completed', 'cancelled' |
| `total_amount` | NUMERIC(10,2) | NOT NULL | Grand total amount |
| `subtotal` | NUMERIC(10,2) | NULLABLE | Subtotal before GST |
| `gst_amount` | NUMERIC(10,2) | NULLABLE | GST amount |
| `late_fee` | NUMERIC(10,2) | NULLABLE | Late return fee |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_orders_branch_id` on `branch_id`
- `idx_orders_staff_id` on `staff_id`
- `idx_orders_customer_id` on `customer_id`
- `idx_orders_status` on `status`
- `idx_orders_created_at` on `created_at` (DESC)
- `idx_orders_invoice_number` on `invoice_number` (UNIQUE)

**RLS Policies:**
- Staff can view/create orders in their branch
- Super admins can view all orders

**Status Transitions:**
```
active → pending_return → completed
active → cancelled
```

---

#### 5. `order_items`

Stores individual items within an order.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique item identifier |
| `order_id` | UUID | FK to orders, NOT NULL | Parent order |
| `photo_url` | TEXT | NOT NULL | Product photo URL |
| `product_name` | TEXT | NULLABLE | Product name |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | Item quantity |
| `price_per_day` | NUMERIC(10,2) | NOT NULL | Price per day |
| `days` | INTEGER | NOT NULL | Rental duration in days |
| `line_total` | NUMERIC(10,2) | NOT NULL | Calculated: quantity × price_per_day |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_order_items_order_id` on `order_id`

**RLS Policies:**
- Staff can view/create items for orders in their branch
- Super admins can view all items

**Line Total Calculation:**
```typescript
line_total = quantity × price_per_day
// Note: days is stored but not used in calculation
```

---

### Relationships

```
branches (1) ──→ (many) profiles
branches (1) ──→ (many) orders
customers (1) ──→ (many) orders
profiles (1) ──→ (many) orders
orders (1) ──→ (many) order_items
```

---

## API Endpoints & Logic

### Supabase Client Setup

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Authentication

#### Login

```typescript
async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, branch:branches(*)')
    .eq('id', data.user.id)
    .single();
  
  return { user: data.user, profile };
}
```

#### Logout

```typescript
async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

#### Get Current User

```typescript
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, branch:branches(*)')
    .eq('id', user.id)
    .single();
  
  return { user, profile };
}
```

---

### Customers API

#### List Customers (Paginated)

```typescript
interface ListCustomersParams {
  searchQuery?: string; // Search by name or phone
  page?: number; // Default: 1
  pageSize?: number; // Default: 20
}

async function listCustomers(params: ListCustomersParams) {
  const { searchQuery, page = 1, pageSize = 20 } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (searchQuery?.trim()) {
    query = query.or(
      `name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
    );
  }
  
  const { data, error, count } = await query;
  if (error) throw error;
  
  return {
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}
```

#### Get Customer by ID

```typescript
async function getCustomer(customerId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();
  
  if (error) throw error;
  return data;
}
```

#### Create Customer

```typescript
interface CreateCustomerData {
  name: string;
  phone: string; // Exactly 10 digits
  email?: string;
  address?: string;
  id_proof_type?: 'aadhar' | 'passport' | 'voter' | 'others';
  id_proof_number?: string;
  id_proof_front_url?: string;
  id_proof_back_url?: string;
}

async function createCustomer(data: CreateCustomerData) {
  // Validate phone number
  const phoneDigits = data.phone.replace(/\D/g, '');
  if (phoneDigits.length !== 10) {
    throw new Error('Phone number must be exactly 10 digits');
  }
  
  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      ...data,
      phone: phoneDigits,
    })
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error('Phone number already exists');
    }
    throw error;
  }
  
  return customer;
}
```

#### Update Customer

```typescript
async function updateCustomer(customerId: string, updates: Partial<CreateCustomerData>) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

---

### Orders API

#### List Orders (Paginated)

```typescript
interface ListOrdersParams {
  branchId: string;
  status?: 'all' | 'active' | 'pending' | 'completed' | 'cancelled';
  searchQuery?: string; // Client-side search
  dateRange?: { start: Date; end: Date };
  page?: number;
  pageSize?: number;
}

async function listOrders(params: ListOrdersParams) {
  const { branchId, status, dateRange, page = 1, pageSize = 20 } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, name, phone, customer_number),
      staff:profiles(id, full_name),
      branch:branches(id, name),
      items:order_items(*)
    `, { count: 'exact' })
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  // Filter by status
  if (status && status !== 'all') {
    if (status === 'pending') {
      query = query.eq('status', 'pending_return');
    } else {
      query = query.eq('status', status);
    }
  }
  
  // Filter by date range
  if (dateRange) {
    const startDate = dateRange.start.toISOString().split('T')[0];
    const endDate = dateRange.end.toISOString().split('T')[0];
    query = query
      .gte('created_at', startDate)
      .lte('created_at', `${endDate}T23:59:59`);
  }
  
  const { data, error, count } = await query;
  if (error) throw error;
  
  return {
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}
```

#### Get Order by ID

```typescript
async function getOrder(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      staff:profiles(*),
      branch:branches(*),
      items:order_items(*)
    `)
    .eq('id', orderId)
    .single();
  
  if (error) throw error;
  return data;
}
```

#### Create Order

```typescript
interface CreateOrderData {
  branch_id: string;
  staff_id: string;
  customer_id: string;
  invoice_number: string;
  start_date: string; // ISO string
  end_date: string; // ISO string
  total_amount: number;
  subtotal?: number;
  gst_amount?: number;
  items: Array<{
    photo_url: string;
    product_name?: string;
    quantity: number;
    price_per_day: number;
    days: number;
    line_total: number;
  }>;
}

async function createOrder(data: CreateOrderData) {
  // Prepare order data
  const startDateOnly = data.start_date.split('T')[0];
  const endDateOnly = data.end_date.split('T')[0];
  
  const orderInsert = {
    branch_id: data.branch_id,
    staff_id: data.staff_id,
    customer_id: data.customer_id,
    invoice_number: data.invoice_number,
    start_date: startDateOnly,
    end_date: endDateOnly,
    start_datetime: data.start_date,
    end_datetime: data.end_date,
    status: 'active' as const,
    total_amount: data.total_amount,
    subtotal: data.subtotal ?? null,
    gst_amount: data.gst_amount ?? null,
  };
  
  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderInsert)
    .select('id')
    .single();
  
  if (orderError) throw orderError;
  
  // Create order items
  const itemsWithOrderId = data.items.map(item => ({
    ...item,
    order_id: order.id,
    product_name: item.product_name || null,
  }));
  
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsWithOrderId);
  
  if (itemsError) throw itemsError;
  
  // Return order with items
  return getOrder(order.id);
}
```

#### Update Order

```typescript
interface UpdateOrderData {
  orderId: string;
  invoice_number?: string;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'pending_return' | 'completed' | 'cancelled';
  total_amount?: number;
  subtotal?: number;
  gst_amount?: number;
}

async function updateOrder(data: UpdateOrderData) {
  const { orderId, ...updates } = data;
  
  const updateData: any = {};
  if (updates.start_date) {
    updateData.start_date = updates.start_date.split('T')[0];
    updateData.start_datetime = updates.start_date;
  }
  if (updates.end_date) {
    updateData.end_date = updates.end_date.split('T')[0];
    updateData.end_datetime = updates.end_date;
  }
  if (updates.invoice_number) updateData.invoice_number = updates.invoice_number;
  if (updates.status) updateData.status = updates.status;
  if (updates.total_amount !== undefined) updateData.total_amount = updates.total_amount;
  if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
  if (updates.gst_amount !== undefined) updateData.gst_amount = updates.gst_amount;
  
  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

#### Cancel Order

```typescript
async function cancelOrder(orderId: string) {
  return updateOrder({
    orderId,
    status: 'cancelled',
  });
}
```

#### Mark Order as Returned

```typescript
async function markOrderReturned(orderId: string) {
  return updateOrder({
    orderId,
    status: 'completed',
  });
}
```

---

### File Upload (Images)

#### Upload Customer ID Proof

```typescript
async function uploadIdProof(file: File, customerId: string, side: 'front' | 'back') {
  const fileExt = file.name.split('.').pop();
  const fileName = `${customerId}/${side}_${Date.now()}.${fileExt}`;
  const filePath = `id-proofs/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('customer-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('customer-documents')
    .getPublicUrl(filePath);
  
  return publicUrl;
}
```

#### Upload Order Item Photo

```typescript
async function uploadItemPhoto(file: File, orderId: string, itemIndex: number) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${orderId}/item_${itemIndex}_${Date.now()}.${fileExt}`;
  const filePath = `order-items/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('order-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('order-photos')
    .getPublicUrl(filePath);
  
  return publicUrl;
}
```

---

## User Flows

### 1. Login Flow

```
1. User enters email and password
2. Call login API
3. On success:
   - Store auth token
   - Fetch user profile with branch info
   - Store user data in state
   - Navigate to dashboard
4. On error:
   - Display error message
   - Stay on login screen
```

### 2. Create Order Flow

```
1. Navigate to "New Order" screen
2. Select Customer:
   a. Search existing customer by name/phone
   b. OR click "Add New Customer"
      - Fill customer form
      - Upload ID proof (optional)
      - Save customer
      - Auto-select new customer
3. Set Rental Dates:
   - Select start date & time (default: now)
   - Select end date & time (default: next day, same time)
   - Validate: end > start, no past dates
4. Add Items:
   - Click "Add Item" button
   - Take/select photo
   - Enter product name (optional)
   - Enter quantity (default: 1)
   - Enter price per day
   - Line total auto-calculates: quantity × price_per_day
   - Can remove items
5. View Order Summary:
   - Subtotal: Sum of all line totals
   - GST (if enabled): Calculate based on GST settings
   - Grand Total: Subtotal + GST (or included)
6. Enter Invoice Number:
   - Required field
   - Format: GLZ-YYYY-XXXX
7. Click "Save Order":
   - Validate all required fields
   - Call createOrder API
   - On success:
     - Show success message
     - Clear draft state
     - Navigate to orders list
   - On error:
     - Show error message
     - Stay on form
```

### 3. Create Customer Flow (from Order Form)

```
1. Click "Add New Customer" button
2. Fill Basic Information:
   - Name (required)
   - Phone (required, 10 digits)
   - Address (optional)
3. Fill ID Proof (optional):
   - Select ID proof type
   - Enter ID proof number
   - Upload front side photo
   - Upload back side photo
4. Click "Save Customer":
   - Validate phone number
   - Call createCustomer API
   - On success:
     - Close modal/form
     - Auto-select new customer in order form
   - On error:
     - Show error message
     - Stay on form
```

### 4. View Orders Flow

```
1. Navigate to Orders List
2. View Orders:
   - List shows: Invoice #, Customer, Schedule, Status, Phone, Actions
   - Pagination: 20 orders per page
   - Filter by status: All, Active, Pending, Completed, Cancelled
   - Search by invoice number or customer name/phone
   - Filter by date range
3. Click Order:
   - Navigate to order detail screen
   - View full order information
   - View order items with photos
   - Actions: Edit, Cancel, Mark as Returned
```

### 5. Edit Order Flow

```
1. Navigate to order detail
2. Click "Edit" button
3. Edit Order Form:
   - Can change: Invoice number, Start date, End date
   - Cannot change: Customer, Items (items are immutable)
4. Click "Save Changes":
   - Call updateOrder API
   - On success: Navigate back to order detail
   - On error: Show error message
```

### 6. Cancel Order Flow

```
1. Navigate to order detail (or from list)
2. Click "Cancel Order" button
3. Confirm cancellation
4. Call cancelOrder API
5. On success:
   - Update order status to 'cancelled'
   - Show success message
   - Refresh order list
```

### 7. Mark Order as Returned Flow

```
1. Navigate to order detail (or from list)
2. Click "Mark as Returned" button
3. Confirm return
4. Call markOrderReturned API
5. On success:
   - Update order status to 'completed'
   - Show success message
   - Refresh order list
```

---

## Business Logic

### Order Status Logic

```typescript
enum OrderStatus {
  ACTIVE = 'active',
  PENDING_RETURN = 'pending_return',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

function getOrderCategory(order: Order): 'scheduled' | 'ongoing' | 'late' | 'returned' | 'cancelled' {
  if (order.status === 'cancelled') return 'cancelled';
  if (order.status === 'completed') return 'returned';
  
  const now = new Date();
  const startDate = new Date(order.start_datetime || order.start_date);
  const endDate = new Date(order.end_datetime || order.end_date);
  
  if (now < startDate) return 'scheduled';
  if (now > endDate) return 'late';
  return 'ongoing';
}

function canCancelOrder(order: Order): boolean {
  return order.status === 'active' || order.status === 'pending_return';
}

function canMarkReturned(order: Order): boolean {
  const category = getOrderCategory(order);
  return category === 'ongoing' || category === 'late';
}
```

### GST Calculation Logic

```typescript
interface GSTSettings {
  enabled: boolean;
  rate: number; // Percentage (e.g., 5.00 for 5%)
  included: boolean; // true = GST included in price, false = GST added on top
}

function calculateGST(subtotal: number, settings: GSTSettings): {
  gstAmount: number;
  grandTotal: number;
} {
  if (!settings.enabled) {
    return { gstAmount: 0, grandTotal: subtotal };
  }
  
  const gstRate = settings.rate / 100;
  
  if (settings.included) {
    // GST is included in the price
    // If price is ₹105 with 5% GST included:
    // GST = 105 × (5/105) = 5
    // Base = 105 - 5 = 100
    const gstAmount = subtotal * (gstRate / (1 + gstRate));
    const grandTotal = subtotal; // Price already includes GST
    return { gstAmount, grandTotal };
  } else {
    // GST is added on top
    // If base is ₹100 with 5% GST:
    // GST = 100 × 0.05 = 5
    // Total = 100 + 5 = 105
    const gstAmount = subtotal * gstRate;
    const grandTotal = subtotal + gstAmount;
    return { gstAmount, grandTotal };
  }
}

// Example usage:
const subtotal = 1000;
const settings = {
  enabled: true,
  rate: 5.00,
  included: false, // GST added on top
};

const { gstAmount, grandTotal } = calculateGST(subtotal, settings);
// gstAmount = 50
// grandTotal = 1050
```

### Rental Duration Calculation

```typescript
function calculateDays(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Inclusive of both start and end days
}

// Example:
// Start: 2025-01-01 10:00
// End: 2025-01-03 10:00
// Days: 3 (Jan 1, 2, 3)
```

### Line Total Calculation

```typescript
function calculateLineTotal(quantity: number, pricePerDay: number): number {
  // Note: days is stored but not used in calculation
  // Line total = quantity × price_per_day
  return quantity * pricePerDay;
}

// Example:
// Quantity: 2
// Price per day: ₹500
// Line total: ₹1000
```

### Order Total Calculation

```typescript
function calculateOrderTotal(items: OrderItem[], gstSettings: GSTSettings): {
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
} {
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    return sum + item.line_total;
  }, 0);
  
  // Calculate GST and grand total
  const { gstAmount, grandTotal } = calculateGST(subtotal, gstSettings);
  
  return { subtotal, gstAmount, grandTotal };
}
```

### Date/Time Validation

```typescript
function validateRentalDates(startDate: string, endDate: string): {
  valid: boolean;
  error?: string;
} {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  // Cannot select past dates
  if (start < now) {
    return { valid: false, error: 'Cannot select past date or time' };
  }
  
  if (end < now) {
    return { valid: false, error: 'Cannot select past date or time' };
  }
  
  // End date must be after start date
  if (end <= start) {
    return { valid: false, error: 'End date must be after start date' };
  }
  
  return { valid: true };
}
```

---

## State Management

### User Store

```typescript
interface UserState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  logout: () => void;
}

// Implementation (Zustand example)
const useUserStore = create<UserState>((set) => ({
  user: null,
  profile: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  logout: () => {
    supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));
```

### Order Draft Store

```typescript
interface OrderDraftState {
  draft: OrderDraft;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setInvoiceNumber: (number: string) => void;
  addItem: (item: OrderItem) => void;
  updateItem: (index: number, updates: Partial<OrderItem>) => void;
  removeItem: (index: number) => void;
  clearDraft: () => void;
}

interface OrderDraft {
  customer_id: string | null;
  start_date: string;
  end_date: string;
  invoice_number: string;
  items: OrderItem[];
  grand_total: number;
}
```

### Orders Query Cache

```typescript
// Use React Query or similar for caching
const useOrders = (branchId: string, filters?: OrderFilters) => {
  return useQuery({
    queryKey: ['orders', branchId, filters],
    queryFn: () => listOrders({ branchId, ...filters }),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
};
```

---

## Component Structure

### Reusable Components

#### 1. OrderFormSection

**Purpose:** Customer selection and branch/staff display

**Props:**
```typescript
interface OrderFormSectionProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  branchName?: string;
  staffName?: string;
}
```

**Usage:**
```tsx
<OrderFormSection
  selectedCustomer={customer}
  onSelectCustomer={setCustomer}
  branchName="Main Branch"
  staffName="John Doe"
/>
```

#### 2. OrderDateTimeSection

**Purpose:** Rental date/time selection

**Props:**
```typescript
interface OrderDateTimeSectionProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (value: string | null) => void;
  onEndDateChange: (value: string | null) => void;
  minStartDate?: string;
}
```

#### 3. OrderItemsSection

**Purpose:** Items management (add, update, remove)

**Props:**
```typescript
interface OrderItemsSectionProps {
  items: OrderItem[];
  onAddItem: (item: OrderItem) => void;
  onUpdateItem: (index: number, field: keyof OrderItem, value: any) => void;
  onRemoveItem: (index: number) => void;
  onImageClick?: (imageUrl: string) => void;
  days?: number;
}
```

#### 4. OrderSummarySection

**Purpose:** Display order totals

**Props:**
```typescript
interface OrderSummarySectionProps {
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  gstEnabled?: boolean;
  gstRate?: number;
  gstIncluded?: boolean;
}
```

#### 5. OrderInvoiceSection

**Purpose:** Invoice number input

**Props:**
```typescript
interface OrderInvoiceSectionProps {
  invoiceNumber: string;
  onInvoiceNumberChange: (value: string) => void;
  placeholder?: string;
}
```

#### 6. CustomerSearch

**Purpose:** Customer search and selection

**Props:**
```typescript
interface CustomerSearchProps {
  onSelectCustomer: (customer: Customer) => void;
  selectedCustomer: Customer | null;
}
```

#### 7. CustomerForm

**Purpose:** Create/edit customer form

**Props:**
```typescript
interface CustomerFormProps {
  onSuccess: (customer: Customer) => void;
  onCancel: () => void;
}
```

---

## Authentication & Authorization

### Roles

1. **super_admin**: Can access all branches and all data
2. **branch_admin**: Can access their branch and manage staff
3. **staff**: Can access their branch and create/manage orders

### RLS Policies (Row Level Security)

All tables have RLS enabled. Policies are enforced at the database level.

**Example Policy (Orders):**
```sql
-- Staff can view orders in their branch
CREATE POLICY "Staff can view orders in their branch"
ON orders FOR SELECT
USING (
  branch_id IN (
    SELECT branch_id FROM profiles WHERE id = auth.uid()
  )
);

-- Staff can create orders in their branch
CREATE POLICY "Staff can create orders in their branch"
ON orders FOR INSERT
WITH CHECK (
  branch_id IN (
    SELECT branch_id FROM profiles WHERE id = auth.uid()
  )
);
```

### Authorization Checks

```typescript
function canAccessBranch(user: User, branchId: string): boolean {
  if (user.role === 'super_admin') return true;
  return user.branch_id === branchId;
}

function canManageStaff(user: User): boolean {
  return user.role === 'super_admin' || user.role === 'branch_admin';
}
```

---

## Real-time Updates

### Supabase Real-time Subscriptions

```typescript
// Subscribe to orders changes
const ordersSubscription = supabase
  .channel('orders')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'orders',
      filter: `branch_id=eq.${branchId}`,
    },
    (payload) => {
      // Handle order change
      if (payload.eventType === 'INSERT') {
        // New order created
      } else if (payload.eventType === 'UPDATE') {
        // Order updated
      } else if (payload.eventType === 'DELETE') {
        // Order deleted
      }
    }
  )
  .subscribe();

// Cleanup
ordersSubscription.unsubscribe();
```

### Real-time Order Status Updates

When an order status changes, all connected clients receive the update automatically.

---

## Error Handling

### Error Types

1. **Network Errors**: Connection issues, timeout
2. **Authentication Errors**: Invalid credentials, expired token
3. **Authorization Errors**: Insufficient permissions
4. **Validation Errors**: Invalid input data
5. **Business Logic Errors**: Duplicate invoice number, etc.

### Error Handling Strategy

```typescript
async function handleApiCall<T>(
  apiCall: () => Promise<T>
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await apiCall();
    return { data };
  } catch (error: any) {
    // Handle different error types
    if (error.code === 'PGRST116') {
      // Not found
      return { error: 'Resource not found' };
    } else if (error.code === '23505') {
      // Unique violation
      return { error: 'Duplicate entry' };
    } else if (error.message?.includes('JWT')) {
      // Auth error
      return { error: 'Session expired. Please login again.' };
    } else {
      return { error: error.message || 'An error occurred' };
    }
  }
}
```

### User-Friendly Error Messages

```typescript
const ERROR_MESSAGES = {
  NETWORK: 'Please check your internet connection',
  AUTH: 'Session expired. Please login again.',
  PERMISSION: 'You do not have permission to perform this action',
  VALIDATION: 'Please check your input and try again',
  DUPLICATE_PHONE: 'Phone number already exists',
  DUPLICATE_INVOICE: 'Invoice number already exists',
  INVALID_DATE: 'Invalid date selection',
  REQUIRED_FIELD: 'This field is required',
};
```

---

## Testing Guidelines

### Unit Tests

Test business logic functions:

```typescript
describe('GST Calculation', () => {
  it('should calculate GST correctly when included', () => {
    const result = calculateGST(105, { enabled: true, rate: 5, included: true });
    expect(result.gstAmount).toBe(5);
    expect(result.grandTotal).toBe(105);
  });
  
  it('should calculate GST correctly when added on top', () => {
    const result = calculateGST(100, { enabled: true, rate: 5, included: false });
    expect(result.gstAmount).toBe(5);
    expect(result.grandTotal).toBe(105);
  });
});
```

### Integration Tests

Test API calls:

```typescript
describe('Order API', () => {
  it('should create order successfully', async () => {
    const orderData = { /* ... */ };
    const result = await createOrder(orderData);
    expect(result.id).toBeDefined();
    expect(result.status).toBe('active');
  });
});
```

### E2E Tests

Test user flows:

```typescript
describe('Create Order Flow', () => {
  it('should create order end-to-end', async () => {
    // 1. Login
    await login('staff@example.com', 'password');
    
    // 2. Navigate to new order
    await navigateToNewOrder();
    
    // 3. Select customer
    await selectCustomer('John Doe');
    
    // 4. Add item
    await addItem({ photo: 'test.jpg', quantity: 1, price: 100 });
    
    // 5. Save order
    await saveOrder();
    
    // 6. Verify order created
    expect(await orderExists()).toBe(true);
  });
});
```

---

## Additional Notes

### Invoice Number Format

- Format: `GLZ-YYYY-XXXX`
- Example: `GLZ-2025-0123`
- Must be unique across all orders

### Customer Phone Number

- Exactly 10 digits
- No spaces or special characters
- Must be unique

### Image Storage

- Customer ID proofs: `customer-documents/{customerId}/{side}_{timestamp}.{ext}`
- Order item photos: `order-photos/{orderId}/item_{index}_{timestamp}.{ext}`

### Date/Time Handling

- Always use ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Store both `start_date`/`end_date` (DATE) and `start_datetime`/`end_datetime` (TIMESTAMP)
- Use `start_datetime`/`end_datetime` for calculations and display
- Use `start_date`/`end_date` for legacy compatibility

### Pagination

- Default page size: 20 items
- Use cursor-based or offset-based pagination
- Always include total count for pagination UI

---

## Support & Contact

For questions or issues, contact the development team.

**Document Version:** 1.0.0  
**Last Updated:** 2025-01-XX

