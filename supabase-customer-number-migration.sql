-- Migration: Add customer_number field to customers table
-- Format: GLA-00001, GLA-00002, etc.
-- Run this in Supabase SQL Editor

-- Step 1: Add customer_number column (nullable initially for existing records)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_number TEXT UNIQUE;

-- Step 2: Create a sequence for customer numbers starting from 1
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1;

-- Step 3: Create a function to generate customer number
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  formatted_num TEXT;
BEGIN
  -- Get next sequence value
  next_num := nextval('customer_number_seq');
  
  -- Format as GLA-00001 (5 digits with leading zeros)
  formatted_num := 'GLA-' || LPAD(next_num::TEXT, 5, '0');
  
  RETURN formatted_num;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a trigger function to auto-generate customer_number on insert
CREATE OR REPLACE FUNCTION set_customer_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if not provided (allows manual override if needed)
  IF NEW.customer_number IS NULL THEN
    NEW.customer_number := generate_customer_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger
DROP TRIGGER IF EXISTS trigger_set_customer_number ON customers;
CREATE TRIGGER trigger_set_customer_number
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_number();

-- Step 6: Backfill existing customers with customer numbers
-- This will assign numbers to existing customers based on their creation order
DO $$
DECLARE
  customer_rec RECORD;
  counter INTEGER := 1;
BEGIN
  -- Reset sequence to start from 1
  PERFORM setval('customer_number_seq', 1, false);
  
  -- Assign customer numbers to existing customers in creation order
  FOR customer_rec IN 
    SELECT id FROM customers WHERE customer_number IS NULL ORDER BY created_at ASC
  LOOP
    UPDATE customers 
    SET customer_number = 'GLA-' || LPAD(counter::TEXT, 5, '0')
    WHERE id = customer_rec.id;
    
    counter := counter + 1;
  END LOOP;
  
  -- Set sequence to continue from the highest number
  PERFORM setval('customer_number_seq', counter, false);
END $$;

-- Step 7: Make customer_number NOT NULL after backfill
ALTER TABLE customers 
ALTER COLUMN customer_number SET NOT NULL;

-- Verification: Check if migration was successful
-- SELECT customer_number, name, created_at FROM customers ORDER BY created_at LIMIT 10;

