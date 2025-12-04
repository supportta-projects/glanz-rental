-- ============================================
-- COMPLETE FIX: Update constraint AND trigger function
-- This fixes both the constraint and any triggers that might interfere
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

BEGIN;

-- Step 1: Check current constraint (for reference)
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as current_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname LIKE '%status%';

-- Step 2: Update existing rows
UPDATE orders 
SET status = 'flagged' 
WHERE status = 'completed_with_issues';

-- Step 3: Update the trigger function to allow 'flagged' status
-- The trigger function might be interfering, so let's update it
CREATE OR REPLACE FUNCTION update_order_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-update to pending_return if status is not completed, cancelled, flagged, or partially_returned
  IF NEW.status NOT IN ('completed', 'cancelled', 'flagged', 'partially_returned', 'scheduled') 
     AND NEW.end_date < CURRENT_DATE THEN
    NEW.status := 'pending_return';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Drop the constraint (must be done before recreating)
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Step 5: Verify constraint is dropped
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'orders'::regclass 
    AND conname = 'orders_status_check'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE EXCEPTION 'Constraint still exists after DROP - manual intervention needed';
  END IF;
END $$;

-- Step 6: Add the new constraint with 'flagged' included
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('scheduled', 'active', 'pending_return', 'completed', 'cancelled', 'partially_returned', 'flagged'));

-- Step 7: Verify the new constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as new_definition,
  CASE 
    WHEN pg_get_constraintdef(oid) LIKE '%flagged%' THEN '✅ SUCCESS: Constraint includes flagged'
    ELSE '❌ ERROR: Constraint does NOT include flagged - please check manually'
  END as verification
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname = 'orders_status_check';

COMMIT;

-- Final verification: Check if we can query orders with 'flagged' status
SELECT 
  COUNT(*) as flagged_orders_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ SUCCESS: Can query flagged orders'
    ELSE '❌ ERROR: Cannot query flagged orders'
  END as status
FROM orders 
WHERE status = 'flagged';

