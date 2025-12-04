-- ============================================
-- FORCE FIX: Completely remove and recreate orders_status_check constraint
-- This is a more aggressive fix that ensures the constraint is properly updated
-- Run this ENTIRE script in Supabase SQL Editor in ONE go
-- ============================================

BEGIN;

-- Step 1: First, let's see what constraints exist
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as current_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname LIKE '%status%';

-- Step 2: Update any existing rows with 'completed_with_issues' to 'flagged'
UPDATE orders 
SET status = 'flagged' 
WHERE status = 'completed_with_issues';

-- Step 3: Temporarily allow any status (remove constraint temporarily)
-- This allows us to update the constraint without violating it
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Step 4: Verify constraint is dropped
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'Constraint successfully dropped'
    ELSE 'WARNING: Constraint still exists'
  END as status
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname = 'orders_status_check';

-- Step 5: Now add the new constraint with 'flagged' included
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('scheduled', 'active', 'pending_return', 'completed', 'cancelled', 'partially_returned', 'flagged'));

-- Step 6: Verify the new constraint includes 'flagged'
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as new_definition,
  CASE 
    WHEN pg_get_constraintdef(oid) LIKE '%flagged%' THEN 'SUCCESS: Constraint includes flagged'
    ELSE 'ERROR: Constraint does NOT include flagged'
  END as verification
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname = 'orders_status_check';

-- Step 7: Test that we can have 'flagged' status (should return 0 if constraint is correct)
SELECT 
  COUNT(*) as rows_with_invalid_status,
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All rows have valid status'
    ELSE 'WARNING: Some rows have invalid status'
  END as status_check
FROM orders 
WHERE status NOT IN ('scheduled', 'active', 'pending_return', 'completed', 'cancelled', 'partially_returned', 'flagged');

COMMIT;

-- If you see "SUCCESS" in both verification steps, the constraint is fixed!
-- If you still see errors, there might be another constraint or trigger interfering.

