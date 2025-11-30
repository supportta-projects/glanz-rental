# 🏗️ Glanz Rental - Architecture Documentation

**Technical deep-dive into the system architecture, design decisions, and implementation details**

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Data Flow](#data-flow)
4. [Authentication & Authorization](#authentication--authorization)
5. [State Management Architecture](#state-management-architecture)
6. [Real-time Architecture](#real-time-architecture)
7. [Database Design](#database-design)
8. [API Layer](#api-layer)
9. [Component Architecture](#component-architecture)
10. [Performance Optimizations](#performance-optimizations)
11. [Security Architecture](#security-architecture)
12. [Deployment Architecture](#deployment-architecture)

---

## 🎯 System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Next.js    │  │  TanStack    │  │   Zustand    │       │
│  │  App Router  │  │    Query     │  │    Store     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                 │                   │               │
│         └─────────────────┼───────────────────┘               │
│                           │                                   │
│                    ┌──────▼──────┐                            │
│                    │  Supabase   │                            │
│                    │   Client     │                            │
│                    └──────┬──────┘                            │
└───────────────────────────┼───────────────────────────────────┘
                            │
                            │ HTTPS / WebSocket
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                      Supabase Backend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PostgreSQL  │  │     Auth     │  │   Storage    │       │
│  │   Database    │  │   Service    │  │   Service    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │   Realtime   │  │   RLS        │                          │
│  │   Service    │  │  Policies    │                          │
│  └──────────────┘  └──────────────┘                          │
└───────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | Next.js 16 | React framework with App Router |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **UI Components** | shadcn/ui | Reusable component library |
| **State Management** | Zustand + TanStack Query | Client + Server state |
| **Database** | Supabase (PostgreSQL) | Primary data store |
| **Authentication** | Supabase Auth | User authentication |
| **Real-time** | Supabase Realtime | WebSocket subscriptions |
| **Storage** | Supabase Storage | File storage (images) |
| **PDF Generation** | @react-pdf/renderer | Invoice generation |

---

## 🏛️ Architecture Layers

### Layer 1: Presentation Layer (UI)

**Location**: `app/`, `components/`

**Responsibilities**:
- User interface rendering
- User interactions
- Form handling
- Responsive design

**Patterns**:
- **Server Components**: Default for static content
- **Client Components**: For interactivity (`"use client"`)
- **Layout Components**: Shared UI structure
- **Feature Components**: Domain-specific UI

### Layer 2: Application Layer (Business Logic)

**Location**: `lib/queries/`, `lib/stores/`, `lib/hooks/`

**Responsibilities**:
- Data fetching logic
- State management
- Business rules
- Real-time subscriptions

**Patterns**:
- **Query Hooks**: Data fetching with TanStack Query
- **Mutation Hooks**: Data modifications
- **Custom Hooks**: Reusable logic
- **Zustand Stores**: Client-side state

### Layer 3: Data Access Layer

**Location**: `lib/supabase/`

**Responsibilities**:
- Database client configuration
- Query building
- Type safety
- Connection management

**Patterns**:
- **Client Factory**: `createClient()` for browser
- **Server Factory**: `createClient()` for server
- **Type Generation**: Database types from Supabase

### Layer 4: Infrastructure Layer

**Location**: Supabase (External)

**Responsibilities**:
- Database storage
- Authentication
- File storage
- Real-time WebSocket server

---

## 🔄 Data Flow

### Read Flow (Query)

```
User Action
    │
    ▼
Component calls useQuery hook
    │
    ▼
TanStack Query checks cache
    │
    ├─ Cache Hit → Return cached data
    │
    └─ Cache Miss → Execute queryFn
            │
            ▼
        Supabase Client
            │
            ▼
        Supabase API (HTTPS)
            │
            ▼
        PostgreSQL Database
            │
            ▼
        Return data
            │
            ▼
        Update TanStack Query cache
            │
            ▼
        Component re-renders with data
```

### Write Flow (Mutation)

```
User Action
    │
    ▼
Component calls useMutation hook
    │
    ▼
Execute mutationFn
    │
    ▼
Supabase Client
    │
    ▼
Supabase API (HTTPS)
    │
    ▼
PostgreSQL Database
    │
    ├─ Update database
    │
    └─ Trigger Realtime event
            │
            ▼
        WebSocket broadcast
            │
            ▼
        All connected clients receive event
            │
            ▼
        useRealtimeSubscription hook
            │
            ▼
        Invalidate TanStack Query cache
            │
            ▼
        Refetch affected queries
            │
            ▼
        UI updates automatically
```

### Real-time Flow

```
Database Change (INSERT/UPDATE/DELETE)
    │
    ▼
PostgreSQL Trigger
    │
    ▼
Supabase Realtime Service
    │
    ▼
WebSocket Broadcast
    │
    ├─ Client 1 ──► useRealtimeSubscription ──► Invalidate cache ──► Refetch
    ├─ Client 2 ──► useRealtimeSubscription ──► Invalidate cache ──► Refetch
    └─ Client 3 ──► useRealtimeSubscription ──► Invalidate cache ──► Refetch
```

---

## 🔐 Authentication & Authorization

### Authentication Flow

```
1. User enters credentials
    │
    ▼
2. Supabase Auth API
    │
    ├─ Success → Create session
    │   │
    │   └─ Store session in cookies
    │       │
    │       └─ Redirect to /dashboard
    │
    └─ Failure → Show error
```

### Session Management

**Client-side**:
- Session stored in HTTP-only cookies (managed by Supabase)
- Middleware refreshes session on each request
- `useUserStore` caches user profile data

**Server-side**:
- `middleware.ts` validates session on every request
- Protects `/dashboard/*` routes
- Redirects unauthenticated users to `/login`

### Authorization (Role-Based Access Control)

**Roles**:
1. **super_admin**: Full system access, all branches
2. **branch_admin**: Own branch only, can manage staff
3. **staff**: Own branch only, can create/view orders

**Implementation**:
- Role stored in `profiles.role`
- RLS policies enforce at database level
- UI components check role for conditional rendering

**RLS Policy Example**:
```sql
-- Staff can only see orders from their branch
CREATE POLICY "staff_own_branch" ON orders
  FOR SELECT
  USING (
    branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  );
```

---

## 🗂️ State Management Architecture

### State Types

#### 1. **Server State** (TanStack Query)

**Purpose**: Data from Supabase database

**Characteristics**:
- Cached automatically
- Shared across components
- Automatically refetched on invalidation
- Real-time updates via cache invalidation

**Example**:
```typescript
const { data: orders } = useOrders(branchId);
// Data is cached, shared, and auto-updated
```

#### 2. **Client State** (Zustand)

**Purpose**: UI state, form drafts, user session

**Characteristics**:
- Not persisted (unless configured)
- Component-specific or app-wide
- Fast updates
- No server sync needed

**Stores**:
- `useUserStore`: Current user (cached from server)
- `useOrderDraftStore`: Order creation form state
- `useRealTimeStore`: Real-time connection state

### State Flow Diagram

```
┌─────────────────────────────────────────┐
│         Server State (Supabase)         │
│                                         │
│  ┌──────────┐      ┌──────────┐       │
│  │ Orders   │      │ Customers │       │
│  └────┬─────┘      └────┬─────┘       │
│       │                 │              │
│       └────────┬────────┘              │
│                │                       │
│         ┌──────▼──────┐                │
│         │ TanStack    │                │
│         │ Query Cache │                │
│         └──────┬──────┘                │
└────────────────┼───────────────────────┘
                 │
                 │ Read
                 │
┌────────────────▼───────────────────────┐
│      Client State (Zustand)           │
│                                       │
│  ┌──────────┐      ┌──────────┐      │
│  │ User     │      │ Order    │      │
│  │ Store    │      │ Draft    │      │
│  └──────────┘      └──────────┘      │
│                                       │
│  ┌──────────────────────────────┐    │
│  │      React Components        │    │
│  └──────────────────────────────┘    │
└───────────────────────────────────────┘
```

---

## 🔴 Real-time Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Supabase Realtime Service              │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │  PostgreSQL Database                     │   │
│  │                                           │   │
│  │  INSERT/UPDATE/DELETE on orders table    │   │
│  │              │                            │   │
│  │              ▼                            │   │
│  │  Realtime Trigger                         │   │
│  └──────────────┬────────────────────────────┘   │
│                 │                                 │
│                 ▼                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  WebSocket Server                        │   │
│  │  - Manages connections                    │   │
│  │  - Broadcasts changes                    │   │
│  └──────────────┬────────────────────────────┘   │
└─────────────────┼─────────────────────────────────┘
                  │
                  │ WebSocket
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌────────┐  ┌────────┐  ┌────────┐
│Client 1│  │Client 2│  │Client 3│
└───┬────┘  └───┬────┘  └───┬────┘
    │           │           │
    └───────────┼───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ useRealtimeSubscription│
    │  - Listens to events   │
    │  - Invalidates cache   │
    └───────────┬────────────┘
                │
                ▼
    ┌───────────────────────┐
    │  TanStack Query       │
    │  - Refetches data     │
    │  - Updates UI         │
    └───────────────────────┘
```

### Implementation Details

**Hook**: `lib/hooks/use-realtime-subscription.ts`

**Features**:
- Automatic channel management
- Event filtering (by branch)
- Cache invalidation on changes
- Error handling and fallback
- Cleanup on unmount

**Subscription Pattern**:
```typescript
// In query hook
useRealtimeSubscription("orders", branchId);

// Sets up channel for "orders" table
// Filters by branchId if provided
// Invalidates cache on INSERT/UPDATE/DELETE
```

**Fallback Strategy**:
- If WebSocket fails, TanStack Query polling continues
- `refetchInterval: 30000` provides 30-second fallback
- App continues to work without real-time

---

## 🗄️ Database Design

### Entity Relationship Diagram

```
┌─────────────┐
│  branches   │
│─────────────│
│ id (PK)     │
│ name        │
│ address     │
│ phone       │
└──────┬──────┘
       │
       │ 1:N
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  profiles   │   │   orders    │
│─────────────│   │─────────────│
│ id (PK)     │   │ id (PK)     │
│ username    │   │ branch_id   │
│ role        │   │ staff_id    │
│ branch_id   │   │ customer_id │
│ full_name   │   │ invoice_#   │
│ phone       │   │ start_date  │
│ gst_*       │   │ end_date    │
│ upi_id      │   │ status      │
└─────────────┘   │ total_amt   │
                  │ subtotal    │
                  │ gst_amount  │
                  │ late_fee    │
                  └──────┬──────┘
                         │
                         │ 1:N
                         │
                         ▼
                  ┌─────────────┐
                  │order_items  │
                  │─────────────│
                  │ id (PK)     │
                  │ order_id    │
                  │ photo_url   │
                  │ product_*   │
                  │ quantity    │
                  │ price/day   │
                  │ days        │
                  │ line_total  │
                  └─────────────┘

┌─────────────┐
│ customers   │
│─────────────│
│ id (PK)     │
│ name        │
│ phone (UK)  │
│ email       │
│ address     │
│ id_proof_*  │
└──────┬──────┘
       │
       │ 1:N
       │
       └─────────┐
                 │
                 ▼
          ┌─────────────┐
          │   orders    │
          └─────────────┘
```

### Indexes

**Performance Indexes**:
- `idx_orders_branch_id`: Fast branch filtering
- `idx_orders_status`: Fast status filtering
- `idx_orders_created_at DESC`: Fast recent orders
- `idx_customers_phone`: Fast phone lookup
- `idx_order_items_order_id`: Fast order items lookup

### Row Level Security (RLS)

**Purpose**: Database-level access control

**Policies**:
- **Super Admin**: Can access all branches
- **Branch Admin/Staff**: Can only access own branch
- **Customers**: Can access own data (if needed)

**Implementation**:
```sql
-- Example: Staff can only see own branch orders
CREATE POLICY "staff_own_branch" ON orders
  FOR SELECT
  USING (
    branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );
```

---

## 🔌 API Layer

### Query Hooks Architecture

**Location**: `lib/queries/`

**Pattern**: One file per entity

**Structure**:
```typescript
// Read hooks
export function useEntity(id: string) { ... }
export function useEntities(filters) { ... }

// Write hooks
export function useCreateEntity() { ... }
export function useUpdateEntity() { ... }
export function useDeleteEntity() { ... }
```

### Query Key Strategy

**Format**: `[entity, ...filters, ...pagination]`

**Examples**:
- `["customers", searchQuery, page, pageSize]`
- `["orders", branchId, page, pageSize, filters]`
- `["order", orderId]`

**Benefits**:
- Automatic cache invalidation
- Precise cache targeting
- Easy debugging

### Mutation Pattern

```typescript
export function useCreateEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      // Perform mutation
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["entity"] });
    },
  });
}
```

---

## 🧩 Component Architecture

### Component Hierarchy

```
RootLayout
  └─ AppProviders (QueryProvider, ToastProvider)
      └─ DashboardLayout (if authenticated)
          ├─ DesktopSidebar
          ├─ TopHeader
          ├─ MobileNav
          └─ Page Content
              └─ Feature Components
                  └─ UI Components
```

### Component Types

#### 1. **Layout Components**
- `DesktopSidebar`: Desktop navigation
- `MobileNav`: Mobile bottom navigation
- `TopHeader`: Top bar with user info
- `FloatingActionButton`: Mobile FAB

#### 2. **Feature Components**
- `OrderCard`: Order display card
- `CustomerForm`: Customer creation/edit
- `CameraUpload`: Photo capture/upload
- `InvoicePreview`: Invoice display

#### 3. **UI Components** (shadcn/ui)
- `Button`, `Card`, `Dialog`, `Input`, etc.
- Reusable, styled components

### Component Communication

```
Parent Component
    │
    ├─ Props (down)
    │
    ├─ Callbacks (up)
    │
    └─ Shared State
        ├─ Zustand Store
        └─ TanStack Query
```

---

## ⚡ Performance Optimizations

### 1. **Code Splitting**
- Next.js automatic code splitting
- Route-based splitting
- Dynamic imports for heavy components

### 2. **Image Optimization**
- Client-side compression (`image-compression.ts`)
- Optimized upload size (200KB max)
- Lazy loading for images

### 3. **Query Optimization**
- Selective field queries (only fetch needed fields)
- Pagination for large lists
- Server-side filtering
- Query deduplication (TanStack Query)

### 4. **Caching Strategy**
- TanStack Query automatic caching
- Stale-while-revalidate pattern
- Real-time invalidation
- 30-second polling fallback

### 5. **Bundle Size**
- Tree shaking
- Dynamic imports
- Minimal dependencies

---

## 🔒 Security Architecture

### Security Layers

#### 1. **Authentication**
- Supabase Auth (industry-standard)
- HTTP-only cookies
- Session refresh on each request

#### 2. **Authorization**
- Row Level Security (RLS) at database
- Role-based access control
- UI-level permission checks

#### 3. **Data Validation**
- TypeScript type safety
- Database constraints
- Input sanitization (Supabase)

#### 4. **Network Security**
- HTTPS only (production)
- CORS configured in Supabase
- API key restrictions

### Security Best Practices

- ✅ Never expose service role key
- ✅ Use RLS for all tables
- ✅ Validate user input
- ✅ Sanitize file uploads
- ✅ Rate limiting (Supabase)
- ✅ Secure cookie settings

---

## 🚀 Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────┐
│         Vercel (CDN/Edge)           │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Next.js App (SSR/SSG)      │ │
│  │   - Static assets (CDN)      │ │
│  │   - API routes               │ │
│  └───────────────┬───────────────┘ │
└──────────────────┼──────────────────┘
                   │
                   │ HTTPS
                   │
┌──────────────────▼──────────────────┐
│      Supabase (Backend)             │
│                                     │
│  ┌──────────┐  ┌──────────┐         │
│  │PostgreSQL│  │  Auth   │         │
│  │ Database │  │ Service │         │
│  └──────────┘  └──────────┘         │
│  ┌──────────┐  ┌──────────┐         │
│  │ Storage  │  │ Realtime │         │
│  │ Service  │  │ Service  │         │
│  └──────────┘  └──────────┘         │
└─────────────────────────────────────┘
```

### Environment Variables

**Production**:
- `NEXT_PUBLIC_SUPABASE_URL`: Production Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Production anon key

**Note**: Never commit `.env.local` to git

### Deployment Steps

1. **Build**: `npm run build`
2. **Test**: `npm start` (local production build)
3. **Deploy**: Push to main branch (auto-deploy on Vercel)
4. **Verify**: Check production URL

---

## 📊 Monitoring & Observability

### Logging

- **Client**: Browser console (development)
- **Server**: Vercel logs (production)
- **Database**: Supabase logs

### Metrics to Monitor

- API response times
- Real-time connection status
- Error rates
- User authentication success rate
- Database query performance

---

## 🔄 Future Architecture Considerations

### Potential Improvements

1. **Caching Layer**: Redis for frequently accessed data
2. **CDN**: For static assets and images
3. **Analytics**: User behavior tracking
4. **Error Tracking**: Sentry or similar
5. **Testing**: Unit tests, integration tests
6. **CI/CD**: Automated testing and deployment

---

**Last Updated**: 2024
**Version**: 1.0.0

