# Order Cancellation Logic

## Overview
Comprehensive cancellation rules for orders based on their status and timing.

## Cancellation Rules

### 1. Scheduled Orders
- ✅ **Can be cancelled**: Anytime until they become ongoing
- ❌ **Cannot be cancelled**: Once status changes to "active" (ongoing)

### 2. Ongoing Orders (Active Status)
- ✅ **Can be cancelled**: Within 10 minutes of becoming active
- ❌ **Cannot be cancelled**: After 10 minutes of being active
- **Timestamp used**: `start_datetime` (when rental started/became active)

### 3. Other Statuses
- ❌ **Cannot be cancelled**: 
  - Completed orders
  - Already cancelled orders
  - Pending return orders
  - Partially returned orders

## Implementation Details

### Logic Flow
```typescript
canCancelOrder(order):
  1. If status === "cancelled" or "completed" → return false
  2. If status === "scheduled" → return true (anytime)
  3. If status === "active":
     - Get start_datetime (when rental became active)
     - Calculate minutes since active
     - Return true if < 10 minutes, false otherwise
  4. Other statuses → return false
```

### Key Points
- **Scheduled orders**: No time limit - can cancel anytime before "Start Rental"
- **Ongoing orders**: 10-minute grace period from when rental started
- **Timestamp**: Uses `start_datetime` to track when order became active
- **Fallback**: If no `start_datetime`, uses `created_at` (for legacy orders)

## Use Cases

### Scenario 1: Scheduled Order
- Order created: Dec 2, 10:00 AM
- Start date: Dec 3, 9:00 AM
- Status: "scheduled"
- **Result**: ✅ Can cancel anytime (even days later)

### Scenario 2: Just Started Rental
- Order started: Dec 3, 9:00 AM (status → "active")
- Current time: Dec 3, 9:05 AM
- **Result**: ✅ Can cancel (only 5 minutes since active)

### Scenario 3: Rental Started 15 Minutes Ago
- Order started: Dec 3, 9:00 AM (status → "active")
- Current time: Dec 3, 9:15 AM
- **Result**: ❌ Cannot cancel (15 minutes > 10 minutes limit)

### Scenario 4: Completed Order
- Status: "completed"
- **Result**: ❌ Cannot cancel (already completed)

## Business Logic

### Why This Logic?
1. **Scheduled orders**: Customer hasn't picked up items yet - full flexibility
2. **10-minute grace period**: Allows staff to correct mistakes immediately after starting rental
3. **After 10 minutes**: Rental is in progress, cancellation would be disruptive

### Edge Cases Handled
- Orders without `start_datetime` (legacy data)
- Timezone considerations (uses server/client time consistently)
- Orders that were scheduled then started (uses `start_datetime`)

## Testing Checklist

- [ ] Scheduled order → Can cancel (anytime)
- [ ] Ongoing order (< 10 min) → Can cancel
- [ ] Ongoing order (> 10 min) → Cannot cancel
- [ ] Completed order → Cannot cancel
- [ ] Cancelled order → Cannot cancel
- [ ] Order without start_datetime → Uses created_at fallback

## Code Location

**File**: `app/(dashboard)/orders/page.tsx`
**Function**: `canCancelOrder()`

