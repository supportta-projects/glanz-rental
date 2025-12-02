-- Migration: Fix existing orders that should be scheduled
-- This fixes orders that were created with future start_date but incorrectly marked as 'active'

-- Step 1: Update orders that have future start_date but status is 'active'
-- These should be 'scheduled' instead
UPDATE orders
SET status = 'scheduled'
WHERE status = 'active'
  AND start_date > CURRENT_DATE
  AND (booking_date IS NULL OR booking_date < start_date::timestamp);

-- Step 2: Set booking_date for orders that don't have it
-- Use created_at as booking_date if booking_date is null
UPDATE orders
SET booking_date = created_at
WHERE booking_date IS NULL;

-- Step 3: Verify the fix
-- Check how many orders were updated
SELECT 
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'scheduled' AND start_date > CURRENT_DATE) as scheduled_orders,
  COUNT(*) FILTER (WHERE status = 'active' AND start_date > CURRENT_DATE) as incorrectly_active_orders
FROM orders
WHERE start_date > CURRENT_DATE;

-- Note: After running this migration, verify that:
-- 1. Orders with future start_date have status = 'scheduled'
-- 2. All orders have booking_date set
-- 3. Orders appear in the correct category tab

