# Fix: Scheduled Orders Showing as Ongoing

## Issue
Orders booked for future dates (e.g., Dec 3 when today is Dec 2) were showing as "ongoing" instead of "scheduled".

## Root Cause
In `lib/queries/orders.ts`, the `useCreateOrder` function was hardcoding `status: "active" as const` instead of calculating the status based on the start date.

## Fix Applied

### 1. Code Fix (`lib/queries/orders.ts`)
- ✅ Added status calculation logic based on start_date
- ✅ Set `booking_date` to current timestamp
- ✅ Use calculated `orderStatus` instead of hardcoded `"active"`
- ✅ Added debug logging for troubleshooting

**Key Changes:**
```typescript
// Calculate status: scheduled if start date is in future, active if today or past
const startDate = new Date(orderData.start_date);
const today = new Date();
today.setHours(0, 0, 0, 0);
startDate.setHours(0, 0, 0, 0);

const orderStatus: OrderStatus = startDate > today ? "scheduled" : "active";

// Include booking_date
booking_date: new Date().toISOString(),
status: orderStatus, // ✅ Calculated, not hardcoded
```

### 2. Data Migration (`supabase-migrations/fix-scheduled-orders.sql`)
- ✅ Updates existing orders with future start_date from "active" to "scheduled"
- ✅ Sets booking_date for orders that don't have it
- ✅ Includes verification query

## Testing Steps

1. **Run Data Migration:**
   ```sql
   -- Execute: supabase-migrations/fix-scheduled-orders.sql
   ```

2. **Test New Order Creation:**
   - Create order with start_date = Dec 3 (future date)
   - Verify: Status should be "scheduled"
   - Verify: Order appears in "Scheduled" tab
   - Verify: booking_date is set

3. **Test Existing Orders:**
   - Check orders with future start_date
   - Verify: Status updated to "scheduled"
   - Verify: booking_date is set

4. **Test Edge Cases:**
   - Order with start_date = today → Should be "active"
   - Order with start_date = tomorrow → Should be "scheduled"
   - Order with start_date = yesterday → Should be "active"

## Expected Behavior

### Before Fix:
- ❌ All orders created with status = "active"
- ❌ Future bookings show as "ongoing"
- ❌ No booking_date tracking

### After Fix:
- ✅ Orders with future start_date → status = "scheduled"
- ✅ Orders with today's start_date → status = "active"
- ✅ booking_date properly tracked
- ✅ Orders appear in correct category tab

## Verification

After applying the fix, verify:
1. ✅ New orders with future dates are created as "scheduled"
2. ✅ Existing orders with future dates are updated to "scheduled"
3. ✅ Orders appear in correct category tabs
4. ✅ booking_date is set for all orders
5. ✅ "Start Rental" button appears for scheduled orders

## Notes

- The fix includes proper date comparison (normalized to midnight)
- Debug logging added for troubleshooting
- Data migration is idempotent (safe to run multiple times)
- All existing orders will be corrected automatically

