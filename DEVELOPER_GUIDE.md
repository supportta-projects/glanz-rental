# 🚀 Glanz Rental - Developer Guide

**Complete guide for developers working on the Glanz Rental Management System**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Architecture & Patterns](#architecture--patterns)
5. [Key Technologies](#key-technologies)
6. [Development Workflow](#development-workflow)
7. [Adding New Features](#adding-new-features)
8. [Database Schema](#database-schema)
9. [State Management](#state-management)
10. [Real-time Features](#real-time-features)
11. [Testing & Debugging](#testing--debugging)
12. [Deployment](#deployment)
13. [Common Patterns](#common-patterns)
14. [Troubleshooting](#troubleshooting)

---

## 📖 Project Overview

**Glanz Rental** is a professional, mobile-first rental management system designed for managing equipment and item rentals across multiple branches. The system supports three user roles with different permission levels and provides real-time updates across all devices.

### Core Features

- **Multi-branch Management**: Support for multiple rental branches
- **Role-based Access Control**: Super Admin, Branch Admin, and Staff roles
- **Order Management**: Complete lifecycle from creation to return
- **Customer Management**: Customer profiles with ID proof storage
- **Real-time Updates**: Live synchronization across devices using Supabase Realtime
- **Mobile-First Design**: Optimized for 98% smartphone usage
- **Invoice Generation**: PDF invoices with product photos
- **GST Support**: Configurable GST calculation per branch
- **Late Fee Management**: Automatic late fee calculation

---

## 🏁 Getting Started

### Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **npm** or **yarn**: Package manager
- **Supabase Account**: For database and authentication
- **Git**: Version control

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd glanz-rental
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create `.env.local` in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up database**
   
   See [QUICK_START.md](./QUICK_START.md) for detailed database setup instructions. Run the SQL scripts in your Supabase SQL Editor in this order:
   - `supabase-setup.sql` (or `supabase-setup-fixed.sql`)
   - `supabase-enable-realtime.sql`
   - `supabase-gst-migration.sql` (if GST features are needed)
   - `supabase-migration-add-rental-time.sql` (for datetime support)
   - `supabase-migration-add-late-fee.sql` (for late fee support)

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

For detailed setup instructions, see [QUICK_START.md](./QUICK_START.md) and [SETUP.md](./SETUP.md).

---

## 📁 Project Structure

```
glanz-rental/
├── app/                          # Next.js App Router (Pages)
│   ├── (auth)/                   # Authentication routes group
│   │   └── login/
│   │       └── page.tsx          # Login page
│   ├── (dashboard)/              # Protected dashboard routes group
│   │   ├── layout.tsx            # Dashboard layout (sidebar, header, nav)
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Main dashboard
│   │   ├── orders/
│   │   │   ├── page.tsx          # Orders list
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # Create new order
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Order details
│   │   │       └── edit/
│   │   │           └── page.tsx  # Edit order
│   │   ├── customers/
│   │   │   ├── page.tsx          # Customers list
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # Create customer
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Customer details
│   │   ├── branches/
│   │   │   └── page.tsx          # Branch management (Super Admin)
│   │   ├── staff/
│   │   │   └── page.tsx          # Staff management (Admins)
│   │   ├── reports/
│   │   │   └── page.tsx          # Reports & analytics
│   │   └── profile/
│   │       └── page.tsx          # User profile
│   ├── layout.tsx                # Root layout (providers, fonts)
│   ├── page.tsx                  # Root page (redirects to dashboard)
│   └── globals.css               # Global styles
│
├── components/                   # React Components
│   ├── ui/                       # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── layout/                   # Layout components
│   │   ├── desktop-sidebar.tsx   # Desktop navigation sidebar
│   │   ├── mobile-nav.tsx        # Mobile bottom navigation
│   │   ├── top-header.tsx        # Top header bar
│   │   ├── floating-action-button.tsx
│   │   └── scroll-to-top.tsx
│   ├── orders/                   # Order-specific components
│   │   ├── order-card.tsx        # Order card for mobile list
│   │   ├── customer-search.tsx   # Customer search/select
│   │   └── camera-upload.tsx     # Camera photo upload
│   ├── customers/                # Customer components
│   │   ├── customer-form.tsx
│   │   └── id-proof-upload.tsx
│   ├── dashboard/                # Dashboard components
│   │   ├── stat-card.tsx
│   │   └── recent-activity.tsx
│   ├── invoice/                  # Invoice components
│   │   ├── invoice-pdf.tsx       # PDF generation
│   │   ├── invoice-preview.tsx
│   │   └── invoice-share.tsx
│   └── providers/                # Context providers
│       ├── app-providers.tsx     # Main app providers wrapper
│       └── query-provider.tsx    # TanStack Query provider
│
├── lib/                          # Core library code
│   ├── supabase/                 # Supabase configuration
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server-side client
│   │   ├── middleware.ts         # Auth middleware
│   │   └── database.types.ts     # Generated DB types
│   ├── queries/                  # TanStack Query hooks
│   │   ├── customers.ts          # Customer CRUD hooks
│   │   ├── orders.ts             # Order CRUD hooks
│   │   └── dashboard.ts          # Dashboard data hooks
│   ├── stores/                   # Zustand state stores
│   │   ├── useUserStore.ts       # User/auth state
│   │   ├── useOrderDraftStore.ts # Order draft state
│   │   └── useRealTimeStore.ts   # Real-time state
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-realtime-subscription.ts  # Real-time subscriptions
│   │   └── use-debounce.ts       # Debounce utility
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts             # All shared types
│   └── utils/                    # Utility functions
│       ├── cn.ts                # className utility
│       ├── date.ts              # Date formatting/calculations
│       └── image-compression.ts # Image compression
│
├── public/                       # Static assets
│   └── *.svg                    # SVG icons
│
├── middleware.ts                 # Next.js middleware (auth)
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies
│
└── Documentation/
    ├── README.md                # Main readme
    ├── QUICK_START.md           # Quick setup guide
    ├── SETUP.md                 # Detailed setup
    ├── DEVELOPER_GUIDE.md       # This file
    ├── ARCHITECTURE.md          # Architecture deep-dive
    └── API_REFERENCE.md         # API/hooks reference
```

---

## 🏗️ Architecture & Patterns

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: 
  - **Zustand**: Client-side state (user, drafts)
  - **TanStack Query**: Server state (data fetching, caching)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Real-time**: Supabase Realtime
- **PDF Generation**: @react-pdf/renderer

### Architecture Patterns

#### 1. **App Router Pattern**
- Uses Next.js 13+ App Router with route groups `(auth)` and `(dashboard)`
- Server Components by default, Client Components when needed (`"use client"`)
- Layouts for shared UI (dashboard layout, root layout)

#### 2. **Data Fetching Pattern**
- **TanStack Query** for all server data fetching
- Custom hooks in `lib/queries/` for each entity
- Automatic caching, refetching, and invalidation
- Real-time subscriptions for live updates

#### 3. **State Management Pattern**
- **Zustand** for client-side state:
  - `useUserStore`: Current user, auth state
  - `useOrderDraftStore`: Order creation draft
- **TanStack Query** for server state:
  - All database queries
  - Automatic cache management

#### 4. **Component Organization**
- Feature-based organization (`components/orders/`, `components/customers/`)
- Shared UI components in `components/ui/`
- Layout components in `components/layout/`

#### 5. **Type Safety**
- TypeScript throughout
- Shared types in `lib/types/index.ts`
- Database types in `lib/supabase/database.types.ts`

---

## 🔑 Key Technologies

### Next.js App Router

- **Route Groups**: `(auth)` and `(dashboard)` for organization
- **Layouts**: Nested layouts for shared UI
- **Server Components**: Default, use Client Components only when needed
- **Middleware**: Authentication and route protection

### Supabase

- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Email/password auth with sessions
- **Storage**: File storage for order item photos
- **Realtime**: WebSocket subscriptions for live updates

### TanStack Query (React Query)

- **Query Hooks**: Custom hooks in `lib/queries/`
- **Mutations**: Create, update, delete operations
- **Cache Management**: Automatic invalidation on mutations
- **Real-time Integration**: Invalidates cache on real-time events

### Zustand

- **Lightweight**: Minimal boilerplate
- **Type-safe**: Full TypeScript support
- **Persistent**: Can persist to localStorage if needed

---

## 🔄 Development Workflow

### 1. **Feature Development**

1. **Plan the feature**
   - Identify affected pages/components
   - Determine database changes needed
   - Plan state management approach

2. **Database changes** (if needed)
   - Create migration SQL file
   - Update `database.types.ts` (or regenerate)
   - Update TypeScript types in `lib/types/index.ts`

3. **Create query hooks** (if new entity)
   - Add hooks in `lib/queries/[entity].ts`
   - Follow existing patterns (see `customers.ts` or `orders.ts`)
   - Include real-time subscriptions

4. **Create components**
   - Add feature components in appropriate folder
   - Use existing UI components from `components/ui/`
   - Follow mobile-first design principles

5. **Add pages/routes**
   - Create page in `app/(dashboard)/[feature]/`
   - Add navigation links if needed
   - Update permissions/access control

6. **Test**
   - Test on mobile and desktop
   - Test real-time updates
   - Test with different user roles

### 2. **Code Style**

- **TypeScript**: Strict mode enabled
- **Naming**: 
  - Components: PascalCase (`OrderCard.tsx`)
  - Hooks: camelCase starting with `use` (`useOrders`)
  - Files: kebab-case for pages, PascalCase for components
- **Imports**: Use `@/` alias for absolute imports
- **Formatting**: Use Prettier (if configured)

### 3. **Git Workflow**

- Create feature branches: `feature/feature-name`
- Commit messages: Clear, descriptive
- Test before pushing
- Create PR for review

---

## ➕ Adding New Features

### Example: Adding a New Entity (e.g., "Products")

#### Step 1: Database Schema

Create migration SQL:
```sql
-- supabase-migration-add-products.sql
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_per_day NUMERIC(10, 2) NOT NULL,
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Step 2: TypeScript Types

Add to `lib/types/index.ts`:
```typescript
export interface Product {
  id: string;
  name: string;
  description?: string;
  price_per_day: number;
  branch_id: string | null;
  created_at?: string;
}
```

#### Step 3: Query Hooks

Create `lib/queries/products.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";

export function useProducts(branchId: string | null) {
  const supabase = createClient();
  useRealtimeSubscription("products", branchId);
  
  return useQuery({
    queryKey: ["products", branchId],
    queryFn: async () => {
      let query = supabase.from("products").select("*");
      if (branchId) {
        query = query.eq("branch_id", branchId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!branchId,
  });
}

export function useCreateProduct() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("products")
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
```

#### Step 4: Components

Create `components/products/product-list.tsx`:
```typescript
"use client";

import { useProducts } from "@/lib/queries/products";
import { useUserStore } from "@/lib/stores/useUserStore";

export function ProductList() {
  const { user } = useUserStore();
  const { data: products, isLoading } = useProducts(user?.branch_id || null);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {products?.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

#### Step 5: Page

Create `app/(dashboard)/products/page.tsx`:
```typescript
import { ProductList } from "@/components/products/product-list";

export default function ProductsPage() {
  return (
    <div className="p-4">
      <h1>Products</h1>
      <ProductList />
    </div>
  );
}
```

#### Step 6: Navigation

Add to `components/layout/desktop-sidebar.tsx` and `components/layout/mobile-nav.tsx`

---

## 🗄️ Database Schema

### Core Tables

#### `branches`
- Stores branch information
- Fields: `id`, `name`, `address`, `phone`, `created_at`

#### `profiles`
- User profiles linked to `auth.users`
- Fields: `id` (FK to auth.users), `username`, `role`, `branch_id`, `full_name`, `phone`, `gst_number`, `gst_enabled`, `gst_rate`, `gst_included`, `upi_id`, `created_at`
- Roles: `super_admin`, `branch_admin`, `staff`

#### `customers`
- Customer information
- Fields: `id`, `name`, `phone` (unique), `email`, `address`, `id_proof_type`, `id_proof_number`, `id_proof_front_url`, `id_proof_back_url`, `created_at`

#### `orders`
- Rental orders
- Fields: `id`, `branch_id`, `staff_id`, `customer_id`, `invoice_number` (unique), `start_date`, `end_date`, `start_datetime`, `end_datetime`, `status`, `total_amount`, `subtotal`, `gst_amount`, `late_fee`, `created_at`
- Status: `active`, `pending_return`, `completed`

#### `order_items`
- Items in each order
- Fields: `id`, `order_id`, `photo_url`, `product_name`, `quantity`, `price_per_day`, `days`, `line_total`, `created_at`

### Relationships

```
branches (1) ──< (many) profiles
branches (1) ──< (many) orders
profiles (1) ──< (many) orders
customers (1) ──< (many) orders
orders (1) ──< (many) order_items
```

### Row Level Security (RLS)

- All tables have RLS enabled
- Policies restrict access based on user role and branch
- Super admins can access all branches
- Branch admins and staff can only access their branch

---

## 🗂️ State Management

### Zustand Stores

#### `useUserStore`
- **Purpose**: Current authenticated user state
- **State**: `user: User | null`
- **Actions**: `setUser()`, `clearUser()`
- **Usage**: Access user info, role, branch throughout app

#### `useOrderDraftStore`
- **Purpose**: Order creation draft (multi-step form state)
- **State**: `draft: OrderDraft`
- **Actions**: 
  - `setCustomer()`, `setStartDate()`, `setEndDate()`
  - `addItem()`, `updateItem()`, `removeItem()`
  - `calculateGrandTotal()`, `calculateSubtotal()`, `calculateGst()`
  - `clearDraft()`, `loadOrder()`
- **Usage**: Persists order form data across steps

### TanStack Query

- **Purpose**: Server state, data fetching, caching
- **Query Keys**: Organized by entity and filters
  - `["customers", searchQuery, page, pageSize]`
  - `["orders", branchId, page, pageSize, filters]`
  - `["order", orderId]`
- **Mutations**: Automatically invalidate related queries
- **Real-time**: Invalidates cache on database changes

---

## 🔴 Real-time Features

### How It Works

1. **Subscription Setup**: `useRealtimeSubscription` hook sets up Supabase Realtime channel
2. **Event Listening**: Listens for INSERT, UPDATE, DELETE events
3. **Cache Invalidation**: Invalidates TanStack Query cache on changes
4. **Automatic Refetch**: TanStack Query refetches invalidated queries

### Implementation

See `lib/hooks/use-realtime-subscription.ts`:

```typescript
useRealtimeSubscription("orders", branchId);
```

This hook:
- Creates a Supabase Realtime channel
- Subscribes to table changes
- Invalidates relevant query keys
- Handles cleanup on unmount

### Tables with Real-time

- `orders`: Order status changes, new orders
- `customers`: Customer updates
- `order_items`: Item changes

---

## 🧪 Testing & Debugging

### Development Tools

- **React DevTools**: Component inspection
- **TanStack Query DevTools**: Query cache inspection (if enabled)
- **Browser DevTools**: Network, console, performance

### Common Debugging

1. **Query not updating**
   - Check query key matches
   - Verify real-time subscription is active
   - Check browser console for errors

2. **RLS errors**
   - Verify user has correct role
   - Check branch_id matches
   - Review RLS policies in Supabase

3. **Real-time not working**
   - Check Supabase Realtime is enabled
   - Verify channel subscription status
   - Check network tab for WebSocket connection

### Logging

- Use `console.log` for debugging (remove before commit)
- Check Supabase logs in dashboard
- Check browser console for errors

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import project from GitHub
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**
   - Vercel auto-deploys on push to main
   - Preview deployments for PRs

### Environment Variables

**Development** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=your_dev_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_dev_key
```

**Production** (Vercel):
- Set in Vercel dashboard
- Use production Supabase project

---

## 📐 Common Patterns

### 1. **Query Hook Pattern**

```typescript
export function useEntity(id: string) {
  const supabase = createClient();
  useRealtimeSubscription("entity");
  
  return useQuery({
    queryKey: ["entity", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
```

### 2. **Mutation Hook Pattern**

```typescript
export function useCreateEntity() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: EntityData) => {
      const { data: result, error } = await supabase
        .from("entity")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity"] });
    },
  });
}
```

### 3. **Component Pattern**

```typescript
"use client";

import { useEntity } from "@/lib/queries/entity";
import { useUserStore } from "@/lib/stores/useUserStore";

export function EntityComponent({ id }: { id: string }) {
  const { user } = useUserStore();
  const { data, isLoading, error } = useEntity(id);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{/* Render data */}</div>;
}
```

### 4. **Mobile-First Styling**

```typescript
// Mobile-first: base styles for mobile
<div className="p-4 md:p-6 lg:p-8">
  <button className="h-14 md:h-10"> {/* 56px on mobile, 40px on desktop */}
    Click
  </button>
</div>
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. **"Invalid login credentials"**
- **Cause**: User doesn't exist or profile not created
- **Fix**: Create user in Supabase Auth, then create profile in `profiles` table

#### 2. **"relation does not exist"**
- **Cause**: Database tables not created
- **Fix**: Run SQL setup scripts in Supabase SQL Editor

#### 3. **"permission denied"**
- **Cause**: RLS policy blocking access
- **Fix**: Check user role and branch_id, verify RLS policies

#### 4. **Images not uploading**
- **Cause**: Storage bucket not created or not public
- **Fix**: Create `order-items` bucket in Supabase Storage, set to public

#### 5. **Real-time not working**
- **Cause**: Realtime not enabled or subscription failed
- **Fix**: Run `supabase-enable-realtime.sql`, check WebSocket connection

#### 6. **Type errors**
- **Cause**: Database types out of sync
- **Fix**: Regenerate `database.types.ts` from Supabase or update manually

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## 🤝 Contributing

1. Follow the code style and patterns outlined in this guide
2. Test on both mobile and desktop
3. Test with different user roles
4. Update documentation if adding features
5. Create clear commit messages

---

## 📞 Support

For questions or issues:
- Check existing documentation
- Review code examples in the codebase
- Check Supabase dashboard for database issues
- Review browser console for client errors

---

**Last Updated**: 2024
**Version**: 1.0.0

