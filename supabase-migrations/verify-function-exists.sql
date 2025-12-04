-- Quick verification script to check if the function exists and its signature
-- Run this in Supabase SQL Editor to verify the function is properly created

-- Check if function exists
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'process_order_return_optimized'
  AND n.nspname = 'public';

-- Check if columns exist in order_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name IN ('returned_quantity', 'damage_fee', 'damage_description')
ORDER BY column_name;

-- Check if columns exist in orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('damage_fee_total', 'completion_notes')
ORDER BY column_name;

