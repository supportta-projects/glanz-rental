-- ============================================
-- DIAGNOSTIC & FIX: Check and fix orders_status_check constraint
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check what the current constraint allows
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname = 'orders_status_check';

-- Step 2: Check if there are any orders with 'completed_with_issues' status
SELECT COUNT(*) as count_completed_with_issues
FROM orders 
WHERE status = 'completed_with_issues';

-- Step 3: Check if there are any orders with 'flagged' status
SELECT COUNT(*) as count_flagged
FROM orders 
WHERE status = 'flagged';

-- Step 4: Update any existing rows with 'completed_with_issues' to 'flagged'
UPDATE orders 
SET status = 'flagged' 
WHERE status = 'completed_with_issues';

-- Step 5: Drop ALL possible constraint names (in case there are variations)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check1;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check2;

-- Step 6: Verify no constraints exist
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname LIKE '%status%';

-- Step 7: Add the new constraint with 'flagged' included
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('scheduled', 'active', 'pending_return', 'completed', 'cancelled', 'partially_returned', 'flagged'));

-- Step 8: Verify the new constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname = 'orders_status_check';

-- Step 9: Test that 'flagged' is now allowed (this should return 0 rows if constraint is correct)
SELECT COUNT(*) as violations
FROM orders 
WHERE status NOT IN ('scheduled', 'active', 'pending_return', 'completed', 'cancelled', 'partially_returned', 'flagged');

