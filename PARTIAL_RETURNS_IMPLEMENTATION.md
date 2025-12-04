# Partial Returns & Damage Tracking Implementation

## ✅ Completed Changes

### 1. Database Migration
Created `supabase-migration-partial-returns-damage.sql` with:
- `returned_quantity` field in `order_items` table (tracks partial returns)
- `damage_fee` and `damage_description` fields in `order_items` table
- `damage_fee_total` and `completion_notes` fields in `orders` table
- New order status: `completed_with_issues`
- Constraints and triggers for data integrity

### 2. TypeScript Types Updated
- Added `returned_quantity`, `damage_fee`, `damage_description` to `OrderItem` interface
- Added `damage_fee_total`, `completion_notes` to `Order` interface
- Added `completed_with_issues` to `OrderStatus` type

### 3. UI Component Enhanced
Completely rewrote `order-return-section.tsx` to support:
- **Partial Quantity Returns**: Input field to specify how many items were returned (0 to total quantity)
- **Damage Fee Tracking**: Input field for damage fee per item
- **Damage Description**: Textarea for describing damage/issues per item
- **Visual Indicators**: Color-coded cards showing:
  - Green: Fully returned items
  - Yellow: Partially returned items
  - Orange: Late items
  - Red: Items with damage
- **Enhanced Statistics**: Shows total quantity, returned quantity, partial returns, and damage fees

### 4. Query Updates
- Updated all order queries to fetch new fields (`returned_quantity`, `damage_fee`, `damage_description`, `damage_fee_total`, `completion_notes`)

### 5. Mutation Updates
- Updated `useProcessOrderReturn` mutation to accept and process:
  - `returned_quantity` per item
  - `damage_fee` per item
  - `damage_description` per item
- Updated optimistic updates to include new fields

## 🔧 Next Steps Required

### 1. Run Database Migration
**IMPORTANT**: You must run the migration SQL file in your Supabase SQL Editor:

```sql
-- Run: supabase-migration-partial-returns-damage.sql
```

This will:
- Add all new columns to the database
- Update constraints
- Create triggers for auto-calculating damage fees

### 2. Update Database Function
You need to update your `process_order_return_optimized` database function to handle the new fields. The function should:

1. Accept `returned_quantity`, `damage_fee`, and `damage_description` in the `p_item_returns` JSONB parameter
2. Update these fields when processing returns:
   ```sql
   UPDATE order_items SET 
     returned_quantity = COALESCE(item_return.returned_quantity, returned_quantity),
     damage_fee = COALESCE(item_return.damage_fee, damage_fee),
     damage_description = COALESCE(item_return.damage_description, damage_description)
   WHERE id = item_return.item_id;
   ```
3. Calculate and update `damage_fee_total` on the order
4. Set order status to `completed_with_issues` when there are:
   - Partial returns (returned_quantity < quantity)
   - Damage fees > 0
   - Missing items

### 3. Test the Implementation
After running the migration:
1. Create a test order
2. Try returning partial quantities
3. Add damage fees and descriptions
4. Verify the order status updates correctly
5. Check that statistics display correctly

## 📋 Features

### Partial Quantity Returns
- Track how many items were returned (e.g., 3 out of 5)
- Visual indicators for partial vs full returns
- Statistics show total returned quantity vs total quantity

### Damage Tracking
- Per-item damage fee input
- Damage description textarea
- Total damage fees displayed in summary
- Visual indicators for items with damage

### Order Status
- `completed_with_issues`: For orders with partial returns, damage, or missing items
- Automatic status calculation based on return state

## 🎨 UI Improvements

- Card-based layout for each item
- Color-coded status indicators
- Inline editing of return details
- Real-time statistics updates
- Clear visual feedback for different states

## 📝 Notes

- The old component is backed up as `order-return-section-old.tsx`
- All changes are backward compatible (defaults to 0 for new fields)
- Existing orders will work with the new system after migration

