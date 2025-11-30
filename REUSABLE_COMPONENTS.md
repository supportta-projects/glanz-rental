# Reusable Components Guide
## Design System-Compliant Components for 80% Code Reusability

This document outlines all reusable components that follow the design system and should be used across all pages for consistency and maintainability.

## 📦 Available Components

All components are exported from `@/components/shared`:

```typescript
import {
  PageHeader,
  SearchInput,
  LoadingState,
  EmptyState,
  ErrorState,
  Pagination,
  PageContainer,
  ActionButton,
  StatsBadge,
} from "@/components/shared";
```

---

## 1. PageHeader

**Purpose**: Consistent page headers with title, description, and actions.

**Usage**:
```tsx
<PageHeader
  title="Customers"
  description="25 customers total"
  actions={<ActionButton label="Add Customer" onClick={handleAdd} />}
>
  {/* Optional: Additional content like search */}
  <SearchInput value={search} onChange={setSearch} />
</PageHeader>
```

**Props**:
- `title: string` - Page title
- `description?: string` - Optional description/subtitle
- `actions?: ReactNode` - Action buttons (right side)
- `children?: ReactNode` - Additional content below header
- `className?: string` - Additional classes

**Design System**:
- Background: `bg-white`
- Border: `border-b border-gray-200`
- Title: `text-2xl md:text-3xl font-bold text-[#0f1724]`
- Description: `text-sm text-[#6b7280]`

---

## 2. SearchInput

**Purpose**: Standardized search input with icon and clear button.

**Usage**:
```tsx
<SearchInput
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Search by name or phone"
  maxWidth="2xl"
/>
```

**Props**:
- `value: string` - Search value
- `onChange: (value: string) => void` - Change handler
- `placeholder?: string` - Placeholder text (default: "Search...")
- `maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"` - Max width
- `className?: string` - Additional classes

**Design System**:
- Height: `h-8`
- Border: `border-gray-200`
- Focus: `focus:border-[#0b63ff] focus:ring-1 focus:ring-[#0b63ff]`
- Border Radius: `rounded-lg`

---

## 3. LoadingState

**Purpose**: Consistent loading indicators across pages.

**Usage**:
```tsx
<LoadingState variant="skeleton" count={5} />
<LoadingState variant="spinner" message="Loading..." />
<LoadingState variant="table" count={10} />
<LoadingState variant="cards" count={6} />
```

**Props**:
- `variant?: "spinner" | "skeleton" | "table" | "cards"` - Loading style
- `count?: number` - Number of skeleton items (default: 4)
- `className?: string` - Additional classes
- `message?: string` - Loading message (spinner only)

**Design System**:
- Spinner: `border-[#0b63ff]`
- Skeleton: `animate-pulse`

---

## 4. EmptyState

**Purpose**: Consistent empty states with icon, message, and optional action.

**Usage**:
```tsx
<EmptyState
  icon={<User className="h-16 w-16" />}
  title="No customers found"
  description="Try a different search term"
  action={{
    label: "Add Customer",
    onClick: () => router.push("/customers/new"),
  }}
/>
```

**Props**:
- `icon?: ReactNode` - Icon component
- `title: string` - Empty state title
- `description?: string` - Optional description
- `action?: { label: string; onClick: () => void; variant?: "default" | "outline" }` - Optional action button
- `className?: string` - Additional classes

**Design System**:
- Card: `bg-white border border-gray-200 rounded-lg`
- Padding: `p-8 md:p-12`
- Title: `text-lg font-semibold text-[#0f1724]`
- Description: `text-sm text-[#6b7280]`

---

## 5. ErrorState

**Purpose**: Consistent error messages with retry option.

**Usage**:
```tsx
<ErrorState
  title="Failed to load data"
  message="Please check your connection and try again"
  onRetry={() => refetch()}
/>
```

**Props**:
- `title?: string` - Error title (default: "Failed to load data")
- `message?: string` - Error message
- `onRetry?: () => void` - Optional retry handler
- `className?: string` - Additional classes

**Design System**:
- Background: `bg-red-50 border border-red-200`
- Text: `text-red-600` (title), `text-red-500` (message)

---

## 6. Pagination

**Purpose**: Standardized pagination controls.

**Usage**:
```tsx
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  pageSize={pageSize}
  onPageChange={setCurrentPage}
  showInfo={true}
/>
```

**Props**:
- `currentPage: number` - Current page number
- `totalPages: number` - Total number of pages
- `totalItems: number` - Total number of items
- `pageSize: number` - Items per page
- `onPageChange: (page: number) => void` - Page change handler
- `className?: string` - Additional classes
- `showInfo?: boolean` - Show item count info (default: true)

**Design System**:
- Button Height: `h-8`
- Button Padding: `px-3`
- Border Radius: `rounded-lg`
- Text: `text-sm text-[#6b7280]`

---

## 7. PageContainer

**Purpose**: Consistent page container with background and padding.

**Usage**:
```tsx
<PageContainer padding={true} maxWidth="full">
  {/* Page content */}
</PageContainer>
```

**Props**:
- `children: ReactNode` - Page content
- `className?: string` - Additional classes
- `padding?: boolean` - Add padding (default: true)
- `maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"` - Max width

**Design System**:
- Background: `bg-[#f7f9fb]`
- Padding: `px-4 md:px-6 py-4`

---

## 8. ActionButton

**Purpose**: Standardized action buttons (Add, Create, etc.).

**Usage**:
```tsx
<ActionButton
  label="Add Customer"
  onClick={handleAdd}
  icon={Plus}
  variant="default"
  size="sm"
/>
```

**Props**:
- `label: string` - Button label
- `onClick: () => void` - Click handler
- `icon?: LucideIcon` - Icon component (default: Plus)
- `variant?: "default" | "outline"` - Button variant
- `size?: "sm" | "md" | "lg"` - Button size
- `className?: string` - Additional classes
- `mobileOnly?: boolean` - Hide on desktop

**Design System**:
- Default: `bg-[#0b63ff] hover:bg-[#0a5ce6] text-white`
- Outline: `border-[#0b63ff] text-[#0b63ff] hover:bg-[#0b63ff] hover:text-white`
- Sizes: `h-7` (sm), `h-8` (md), `h-9` (lg)
- Border Radius: `rounded-lg`

---

## 9. StatsBadge

**Purpose**: Consistent stat badges with icons.

**Usage**:
```tsx
<StatsBadge
  icon={Package}
  label="total"
  value={21}
  variant="default"
/>
```

**Props**:
- `icon: LucideIcon` - Icon component
- `label: string` - Badge label
- `value: number | string` - Stat value
- `variant?: "default" | "warning" | "danger" | "success" | "info"` - Color variant
- `className?: string` - Additional classes

**Design System**:
- Height: `h-8`
- Padding: `px-2 py-1`
- Border: `border-gray-200`
- Text: `text-sm font-medium`

---

## 📋 Implementation Checklist

When creating a new page, use these components:

- [ ] Use `PageHeader` for page title and actions
- [ ] Use `SearchInput` for search functionality
- [ ] Use `LoadingState` for loading states
- [ ] Use `EmptyState` for empty states
- [ ] Use `ErrorState` for error states
- [ ] Use `Pagination` for paginated lists
- [ ] Use `ActionButton` for action buttons
- [ ] Use `StatsBadge` for stat displays
- [ ] Use `PageContainer` if needed for consistent layout
- [ ] Follow design system colors and spacing

---

## 🎨 Design System Reference

All components follow these design system standards:

- **Colors**: Primary `#0b63ff`, Background `#f7f9fb`, Text `#0f1724`
- **Spacing**: Consistent padding `px-4 md:px-6 py-4`
- **Typography**: `text-2xl md:text-3xl font-bold` for titles
- **Borders**: `border-gray-200`, `rounded-lg`
- **Buttons**: `h-8`, `rounded-lg`, primary blue
- **Icons**: `h-4 w-4` (standard), `h-3.5 w-3.5` (small)

---

## 📊 Code Reusability Target

**Goal**: 80% of page code should use reusable components.

**Current Status**:
- ✅ Customers Page: ~75% reusable components
- ✅ Reports Page: ~90% reusable components
- ✅ Staff Page: ~85% reusable components
- ✅ Branches Page: ~85% reusable components

**Next Steps**:
- Refactor Orders page to use reusable components
- Refactor Dashboard page to use reusable components
- Refactor Profile page to use reusable components

---

## 🔄 Migration Guide

To migrate existing pages to use reusable components:

1. **Replace custom headers** with `PageHeader`
2. **Replace search inputs** with `SearchInput`
3. **Replace loading skeletons** with `LoadingState`
4. **Replace empty states** with `EmptyState`
5. **Replace error messages** with `ErrorState`
6. **Replace pagination** with `Pagination`
7. **Replace action buttons** with `ActionButton`
8. **Update colors** to match design system (`bg-[#f7f9fb]`, `text-[#0f1724]`, etc.)

---

## 📝 Examples

See these files for reference implementations:
- `app/(dashboard)/customers/page.tsx` - Full example with all components
- `app/(dashboard)/reports/page.tsx` - Simple example
- `app/(dashboard)/staff/page.tsx` - With access control

