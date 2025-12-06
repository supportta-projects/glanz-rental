-- ============================================
-- CRITICAL FIXES: Order Validation Constraints
-- Fixes Issues: A1, W2, O2, M1, M2
-- ============================================
-- This migration adds essential database-level validations to prevent invalid data
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- ISSUE W2: Add CHECK constraint for start_date < end_date
-- ============================================
-- Prevents orders with invalid date ranges (end_date before start_date)

-- First, check if there are any existing orders with invalid date ranges
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM orders
  WHERE end_date < start_date;
  
  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % orders with end_date < start_date. These will need manual correction.', invalid_count;
    -- Log the problematic orders
    RAISE NOTICE 'Problematic order IDs:';
    FOR invalid_count IN 
      SELECT id::TEXT FROM orders WHERE end_date < start_date LIMIT 10
    LOOP
      RAISE NOTICE '  - %', invalid_count;
    END LOOP;
  END IF;
END $$;

-- Add CHECK constraint for start_date < end_date
-- Note: This will fail if there are existing invalid orders
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_date_range_check;
  
  -- Add new constraint
  ALTER TABLE orders 
  ADD CONSTRAINT orders_date_range_check 
  CHECK (end_date >= start_date);
  
  RAISE NOTICE '✅ Added CHECK constraint: end_date >= start_date';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not add date range constraint. Please fix invalid orders first: %', SQLERRM;
END $$;

-- ============================================
-- ISSUE O2: Add CHECK constraint for returned_quantity <= quantity
-- ============================================
-- Prevents returned_quantity from exceeding the original quantity

-- First, check if there are any existing order_items with invalid returned_quantity
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM order_items
  WHERE returned_quantity IS NOT NULL 
    AND returned_quantity > quantity;
  
  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % order items with returned_quantity > quantity. These will need manual correction.', invalid_count;
  END IF;
END $$;

-- Add CHECK constraint for returned_quantity <= quantity
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_returned_quantity_check;
  
  -- Add new constraint
  ALTER TABLE order_items 
  ADD CONSTRAINT order_items_returned_quantity_check 
  CHECK (
    returned_quantity IS NULL 
    OR (returned_quantity >= 0 AND returned_quantity <= quantity)
  );
  
  RAISE NOTICE '✅ Added CHECK constraint: returned_quantity >= 0 AND returned_quantity <= quantity';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not add returned_quantity constraint. Please fix invalid data first: %', SQLERRM;
END $$;

-- ============================================
-- Additional validations for data integrity
-- ============================================

-- Ensure damage_fee is non-negative
DO $$
BEGIN
  ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_damage_fee_check;
  
  ALTER TABLE order_items 
  ADD CONSTRAINT order_items_damage_fee_check 
  CHECK (damage_fee IS NULL OR damage_fee >= 0);
  
  RAISE NOTICE '✅ Added CHECK constraint: damage_fee >= 0';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not add damage_fee constraint: %', SQLERRM;
END $$;

-- Ensure late_fee is non-negative
DO $$
BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_late_fee_check;
  
  ALTER TABLE orders 
  ADD CONSTRAINT orders_late_fee_check 
  CHECK (late_fee IS NULL OR late_fee >= 0);
  
  RAISE NOTICE '✅ Added CHECK constraint: late_fee >= 0';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not add late_fee constraint: %', SQLERRM;
END $$;

-- Ensure total_amount is positive
DO $$
BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_total_amount_check;
  
  ALTER TABLE orders 
  ADD CONSTRAINT orders_total_amount_check 
  CHECK (total_amount > 0);
  
  RAISE NOTICE '✅ Added CHECK constraint: total_amount > 0';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not add total_amount constraint: %', SQLERRM;
END $$;

COMMIT;

-- ============================================
-- Verification Queries
-- ============================================
-- Run these after the migration to verify constraints are in place

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname IN (
    'orders_date_range_check',
    'orders_late_fee_check',
    'orders_total_amount_check'
  )
ORDER BY conname;

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'order_items'::regclass 
  AND conname IN (
    'order_items_returned_quantity_check',
    'order_items_damage_fee_check'
  )
ORDER BY conname;

