-- ============================================
-- FIX: Update orders_status_check constraint to use 'flagged' instead of 'completed_with_issues'
-- Run this in Supabase SQL Editor if you're getting constraint violations
-- ============================================

-- Step 1: Update any existing rows with 'completed_with_issues' to 'flagged'
UPDATE orders 
SET status = 'flagged' 
WHERE status = 'completed_with_issues';

-- Step 2: Drop ALL possible constraint variations (in case there are multiple)
DO $$ 
BEGIN
  -- Drop constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'orders'::regclass 
    AND conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

-- Step 3: Add the new constraint with 'flagged' included
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('scheduled', 'active', 'pending_return', 'completed', 'cancelled', 'partially_returned', 'flagged'));

-- Step 4: Verify the constraint was created correctly
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname = 'orders_status_check';

