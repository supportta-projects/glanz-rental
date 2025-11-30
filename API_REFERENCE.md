# 📚 Glanz Rental - API Reference

**Complete reference for all query hooks, mutations, stores, and utilities**

---

## 📋 Table of Contents

1. [Query Hooks](#query-hooks)
2. [Mutation Hooks](#mutation-hooks)
3. [Zustand Stores](#zustand-stores)
4. [Custom Hooks](#custom-hooks)
5. [Utility Functions](#utility-functions)
6. [Type Definitions](#type-definitions)
7. [Supabase Clients](#supabase-clients)

---

## 🔍 Query Hooks

### Customers

#### `useCustomers(searchQuery?, page?, pageSize?)`

Fetch paginated list of customers with search and due amount calculation.

**Location**: `lib/queries/customers.ts`

**Parameters**:
- `searchQuery?: string` - Search term for name/phone
- `page?: number` - Page number (default: 1)
- `pageSize?: number` - Items per page (default: 20)

**Returns**: `UseQueryResult<{ data: CustomerWithDues[], total: number, page: number, pageSize: number, totalPages: number }>`

**Features**:
- Real-time subscription enabled
- Calculates `due_amount` from pending orders
- Server-side search filtering
- Automatic refetch on window focus
- 30-second polling fallback

**Example**:
```typescript
const { data, isLoading, error } = useCustomers("john", 1, 20);
// data.data: CustomerWithDues[]
// data.total: number
```

---

#### `useCustomer(customerId)`

Fetch single customer by ID.

**Parameters**:
- `customerId: string` - Customer UUID

**Returns**: `UseQueryResult<Customer>`

**Example**:
```typescript
const { data: customer } = useCustomer("uuid-here");
```

---

#### `useCustomerOrders(customerId)`

Fetch all orders for a specific customer.

**Parameters**:
- `customerId: string` - Customer UUID

**Returns**: `UseQueryResult<Order[]>`

**Example**:
```typescript
const { data: orders } = useCustomerOrders("uuid-here");
```

---

### Orders

#### `useOrders(branchId, page?, pageSize?, filters?)`

Fetch paginated list of orders with filtering.

**Location**: `lib/queries/orders.ts`

**Parameters**:
- `branchId: string | null` - Branch ID (null for super admin)
- `page?: number` - Page number (default: 1)
- `pageSize?: number` - Items per page (default: 20)
- `filters?: { status?: "all" | "active" | "pending" | "completed", searchQuery?: string, dateRange?: { start: Date, end: Date } }`

**Returns**: `UseQueryResult<{ data: Order[], total: number, page: number, pageSize: number, totalPages: number }>`

**Features**:
- Real-time subscription enabled
- Server-side filtering (status, date range, search)
- Optimized field selection
- Automatic refetch on window focus

**Example**:
```typescript
const { data } = useOrders(branchId, 1, 20, {
  status: "active",
  searchQuery: "INV-001",
  dateRange: { start: new Date("2024-01-01"), end: new Date("2024-12-31") }
});
```

---

#### `useOrder(orderId)`

Fetch single order with full details including items.

**Parameters**:
- `orderId: string` - Order UUID

**Returns**: `UseQueryResult<Order>`

**Features**:
- Includes customer, staff, branch, and items
- Real-time subscriptions for order and items
- Detailed error logging
- No retry on 404/RLS errors

**Example**:
```typescript
const { data: order, isLoading } = useOrder("uuid-here");
// order.items: OrderItem[]
// order.customer: Customer
```

---

### Dashboard

#### `useDashboardStats(branchId, dateRange?)`

Fetch dashboard statistics.

**Location**: `lib/queries/dashboard.ts`

**Parameters**:
- `branchId: string | null` - Branch ID
- `dateRange?: { start: Date, end: Date }` - Date range (default: today)

**Returns**: `UseQueryResult<DashboardStats>`

**Stats Included**:
- `active`: Number of active orders
- `pending_return`: Number of pending return orders
- `today_collection`: Total collection for date range
- `completed`: Number of completed orders

**Example**:
```typescript
const { data: stats } = useDashboardStats(branchId, {
  start: new Date("2024-01-01"),
  end: new Date("2024-01-31")
});
```

---

#### `useRecentOrders(branchId)`

Fetch 8 most recent orders.

**Parameters**:
- `branchId: string | null` - Branch ID

**Returns**: `UseQueryResult<Order[]>`

**Example**:
```typescript
const { data: recentOrders } = useRecentOrders(branchId);
```

---

## ✏️ Mutation Hooks

### Customers

#### `useCreateCustomer()`

Create a new customer.

**Location**: `lib/queries/customers.ts`

**Returns**: `UseMutationResult<Customer, Error, CustomerData>`

**Mutation Function**:
```typescript
{
  name: string;
  phone: string;
  address?: string | null;
  id_proof_type?: "aadhar" | "passport" | "voter" | "others" | null;
  id_proof_number?: string | null;
  id_proof_front_url?: string | null;
  id_proof_back_url?: string | null;
}
```

**Auto-invalidates**: `["customers"]`, `["customer"]`, `["orders"]`

**Example**:
```typescript
const createCustomer = useCreateCustomer();

createCustomer.mutate({
  name: "John Doe",
  phone: "+91 1234567890",
  address: "123 Main St"
});
```

---

#### `useUpdateCustomer()`

Update existing customer.

**Parameters**:
- `customerId: string`
- `updates: Partial<Customer>`

**Auto-invalidates**: `["customers"]`, `["customer", customerId]`, `["orders"]`

**Example**:
```typescript
const updateCustomer = useUpdateCustomer();

updateCustomer.mutate({
  customerId: "uuid",
  updates: { name: "Jane Doe" }
});
```

---

#### `useDeleteCustomer()`

Delete a customer.

**Parameters**:
- `customerId: string`

**Auto-invalidates**: `["customers"]`, `["customer"]`, `["orders"]`

**Example**:
```typescript
const deleteCustomer = useDeleteCustomer();

deleteCustomer.mutate("uuid");
```

---

### Orders

#### `useCreateOrder()`

Create a new order with items.

**Location**: `lib/queries/orders.ts`

**Mutation Function**:
```typescript
{
  branch_id: string;
  staff_id: string;
  customer_id: string;
  invoice_number: string;
  start_date: string; // ISO datetime string
  end_date: string; // ISO datetime string
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
```

**Features**:
- Batch inserts order items
- Handles both `start_date`/`end_date` (DATE) and `start_datetime`/`end_datetime` (TIMESTAMP)
- Optimized for performance

**Auto-invalidates**: `["orders"]`, `["dashboard-stats"]`

**Example**:
```typescript
const createOrder = useCreateOrder();

createOrder.mutate({
  branch_id: "uuid",
  staff_id: "uuid",
  customer_id: "uuid",
  invoice_number: "INV-001",
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  total_amount: 1000,
  subtotal: 950,
  gst_amount: 50,
  items: [{
    photo_url: "https://...",
    product_name: "Product 1",
    quantity: 1,
    price_per_day: 100,
    days: 7,
    line_total: 700
  }]
});
```

---

#### `useUpdateOrder()`

Update existing order (before return).

**Mutation Function**:
```typescript
{
  orderId: string;
  invoice_number: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  subtotal?: number;
  gst_amount?: number;
  items: Array<{ ... }>; // Same as create
}
```

**Features**:
- Deletes old items and inserts new ones
- Updates both DATE and TIMESTAMP fields

**Auto-invalidates**: `["orders"]`, `["order", orderId]`, `["dashboard-stats"]`

---

#### `useUpdateOrderStatus()`

Update order status (mark as returned, etc.).

**Mutation Function**:
```typescript
{
  orderId: string;
  status: "active" | "pending_return" | "completed";
  lateFee?: number; // Default: 0
}
```

**Features**:
- Calculates new total with late fee
- Handles late fee addition/subtraction

**Auto-invalidates**: `["orders"]`, `["order"]`, `["dashboard-stats"]`, `["recent-orders"]`, `["customer-orders"]`, `["customers"]`

**Example**:
```typescript
const updateStatus = useUpdateOrderStatus();

updateStatus.mutate({
  orderId: "uuid",
  status: "completed",
  lateFee: 100
});
```

---

## 🗄️ Zustand Stores

### `useUserStore`

User authentication and profile state.

**Location**: `lib/stores/useUserStore.ts`

**State**:
```typescript
{
  user: User | null;
}
```

**Actions**:
- `setUser(user: User | null)`: Set current user
- `clearUser()`: Clear user (logout)

**Usage**:
```typescript
const { user, setUser, clearUser } = useUserStore();

// Access user
if (user?.role === "super_admin") { ... }

// Update user
setUser(newUser);
```

---

### `useOrderDraftStore`

Order creation draft state (multi-step form).

**Location**: `lib/stores/useOrderDraftStore.ts`

**State**:
```typescript
{
  draft: OrderDraft;
}
```

**OrderDraft**:
```typescript
{
  customer_id: string | null;
  customer_name?: string;
  customer_phone?: string;
  start_date: string; // ISO datetime
  end_date: string; // ISO datetime
  invoice_number: string;
  items: OrderItem[];
  grand_total: number;
}
```

**Actions**:
- `setCustomer(customerId, name?, phone?)`: Set customer
- `setStartDate(date: string)`: Set start date
- `setEndDate(date: string)`: Set end date
- `setInvoiceNumber(number: string)`: Set invoice number
- `addItem(item: OrderItem)`: Add item to draft
- `updateItem(index: number, updates: Partial<OrderItem>)`: Update item
- `removeItem(index: number)`: Remove item
- `calculateSubtotal()`: Calculate subtotal (returns number)
- `calculateGst()`: Calculate GST (returns number, respects user GST settings)
- `calculateGrandTotal()`: Calculate grand total (returns number)
- `clearDraft()`: Reset draft to initial state
- `loadOrder(order: Order)`: Load existing order into draft

**GST Calculation**:
- Reads GST settings from `useUserStore().user`
- Supports `gst_enabled`, `gst_rate`, `gst_included`
- Returns 0 if GST disabled

**Example**:
```typescript
const { draft, addItem, calculateGrandTotal, clearDraft } = useOrderDraftStore();

// Add item
addItem({
  photo_url: "https://...",
  product_name: "Product",
  quantity: 1,
  price_per_day: 100,
  days: 7,
  line_total: 700
});

// Calculate total
const total = calculateGrandTotal();

// Clear draft
clearDraft();
```

---

## 🪝 Custom Hooks

### `useRealtimeSubscription(table, branchId?)`

Set up Supabase Realtime subscription for automatic cache updates.

**Location**: `lib/hooks/use-realtime-subscription.ts`

**Parameters**:
- `table: "orders" | "customers" | "order_items"` - Table to subscribe to
- `branchId?: string | null` - Optional branch filter

**Features**:
- Automatically invalidates TanStack Query cache on changes
- Filters by branch if provided
- Handles INSERT, UPDATE, DELETE events
- Automatic cleanup on unmount
- Error handling with fallback to polling

**Usage**:
```typescript
// In a query hook
useRealtimeSubscription("orders", branchId);

// Automatically invalidates ["orders"] queries on changes
```

**Invalidated Queries**:
- `orders`: `["orders"]`, `["order"]`, `["dashboard-stats"]`, `["recent-orders"]`, `["customer-orders"]`
- `customers`: `["customers"]`, `["customer"]`, `["orders"]`
- `order_items`: `["order"]`, `["orders"]`

---

### `useDebounce(value, delay?)`

Debounce a value (useful for search inputs).

**Location**: `lib/hooks/use-debounce.ts`

**Parameters**:
- `value: T` - Value to debounce
- `delay?: number` - Delay in ms (default: 300)

**Returns**: Debounced value

**Example**:
```typescript
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 500);

// Use debouncedSearch in query
const { data } = useCustomers(debouncedSearch);
```

---

## 🛠️ Utility Functions

### Date Utilities

**Location**: `lib/utils/date.ts`

#### `formatDate(date, formatStr?)`

Format a date string.

**Parameters**:
- `date: string | Date`
- `formatStr?: string` - Format string (default: "dd MMM yyyy")

**Returns**: `string`

**Example**:
```typescript
formatDate("2024-01-15"); // "15 Jan 2024"
formatDate(new Date(), "yyyy-MM-dd"); // "2024-01-15"
```

---

#### `formatDateTime(date, includeTime?)`

Format date with time.

**Parameters**:
- `date: string | Date`
- `includeTime?: boolean` - Include time (default: true)

**Returns**: `string`

**Example**:
```typescript
formatDateTime("2024-01-15T10:30:00"); // "15 Jan 2024, 10:30 AM"
```

---

#### `calculateDays(startDate, endDate)`

Calculate number of days between dates (inclusive).

**Returns**: `number`

**Example**:
```typescript
calculateDays("2024-01-01", "2024-01-07"); // 7
```

---

#### `isOverdue(endDate)`

Check if end date has passed.

**Returns**: `boolean`

---

#### `formatCurrency(amount)`

Format number as Indian Rupee currency.

**Returns**: `string`

**Example**:
```typescript
formatCurrency(1000); // "₹1,000"
formatCurrency(1234567); // "₹12,34,567"
```

---

### Image Utilities

**Location**: `lib/utils/image-compression.ts`

#### `compressImage(file)`

Compress image file for faster uploads.

**Parameters**:
- `file: File`

**Returns**: `Promise<File>`

**Features**:
- Skips compression for files < 50KB
- Max size: 200KB
- Max dimensions: 1200px
- Format: JPEG
- Quality: 85%
- 2-second timeout

**Example**:
```typescript
const compressed = await compressImage(file);
```

---

#### `createPreviewUrl(file)`

Create blob URL for instant preview.

**Returns**: `string`

**Example**:
```typescript
const url = createPreviewUrl(file);
// Use in <img src={url} />
```

---

#### `revokePreviewUrl(url)`

Revoke blob URL to free memory.

**Example**:
```typescript
revokePreviewUrl(previewUrl);
```

---

### Class Name Utility

**Location**: `lib/utils/cn.ts`

#### `cn(...classes)`

Merge Tailwind class names (using `clsx` and `tailwind-merge`).

**Example**:
```typescript
cn("px-4", "py-2", condition && "bg-blue-500");
```

---

## 📝 Type Definitions

**Location**: `lib/types/index.ts`

### Core Types

#### `User`
```typescript
{
  id: string;
  username: string;
  role: "super_admin" | "branch_admin" | "staff";
  branch_id: string | null;
  full_name: string;
  phone: string;
  gst_number?: string;
  gst_enabled?: boolean;
  gst_rate?: number;
  gst_included?: boolean;
  upi_id?: string;
  branch?: Branch;
}
```

#### `Customer`
```typescript
{
  id: string;
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
```

#### `Order`
```typescript
{
  id: string;
  branch_id: string;
  staff_id: string;
  customer_id: string;
  invoice_number: string;
  start_date: string;
  end_date: string;
  start_datetime?: string;
  end_datetime?: string;
  status: "active" | "pending_return" | "completed";
  total_amount: number;
  subtotal?: number;
  gst_amount?: number;
  late_fee?: number;
  created_at: string;
  customer?: Customer;
  staff?: User;
  branch?: Branch;
  items?: OrderItem[];
}
```

#### `OrderItem`
```typescript
{
  id?: string;
  order_id?: string;
  photo_url: string;
  product_name?: string;
  quantity: number;
  price_per_day: number;
  days: number;
  line_total: number;
}
```

#### `DashboardStats`
```typescript
{
  active: number;
  pending_return: number;
  today_collection: number;
  completed: number;
}
```

---

## 🔌 Supabase Clients

### Browser Client

**Location**: `lib/supabase/client.ts`

#### `createClient()`

Create Supabase client for browser.

**Returns**: `SupabaseClient<Database>`

**Usage**:
```typescript
const supabase = createClient();
const { data } = await supabase.from("orders").select("*");
```

---

### Server Client

**Location**: `lib/supabase/server.ts`

#### `createClient()`

Create Supabase client for server components/API routes.

**Returns**: `Promise<SupabaseClient<Database>>`

**Usage**:
```typescript
const supabase = await createClient();
const { data } = await supabase.from("orders").select("*");
```

---

### Middleware

**Location**: `lib/supabase/middleware.ts`

#### `updateSession(request)`

Update Supabase session in middleware.

**Used by**: `middleware.ts`

---

## 📖 Usage Examples

### Complete Order Creation Flow

```typescript
"use client";

import { useCreateOrder } from "@/lib/queries/orders";
import { useOrderDraftStore } from "@/lib/stores/useOrderDraftStore";
import { useUserStore } from "@/lib/stores/useUserStore";

export function CreateOrderButton() {
  const { user } = useUserStore();
  const { draft, calculateGrandTotal } = useOrderDraftStore();
  const createOrder = useCreateOrder();

  const handleCreate = () => {
    if (!user || !draft.customer_id) return;

    createOrder.mutate({
      branch_id: user.branch_id!,
      staff_id: user.id,
      customer_id: draft.customer_id,
      invoice_number: draft.invoice_number,
      start_date: draft.start_date,
      end_date: draft.end_date,
      total_amount: calculateGrandTotal(),
      items: draft.items
    }, {
      onSuccess: () => {
        // Navigate to order page
      }
    });
  };

  return <button onClick={handleCreate}>Create Order</button>;
}
```

---

### Search with Debounce

```typescript
"use client";

import { useState } from "react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useCustomers } from "@/lib/queries/customers";

export function CustomerSearch() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading } = useCustomers(debouncedSearch);

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search customers..."
      />
      {isLoading && <div>Loading...</div>}
      {data?.data.map(customer => (
        <div key={customer.id}>{customer.name}</div>
      ))}
    </div>
  );
}
```

---

**Last Updated**: 2024
**Version**: 1.0.0

