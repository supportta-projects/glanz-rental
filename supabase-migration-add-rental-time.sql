-- Migration: Add time tracking to rental dates
-- This changes start_date and end_date from DATE to TIMESTAMP WITH TIME ZONE
-- Run this in Supabase SQL Editor

-- Step 1: Add new timestamp columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMP WITH TIME ZONE;

-- Step 2: Migrate existing data (convert DATE to TIMESTAMP at start/end of day)
UPDATE orders 
SET 
  start_datetime = COALESCE(start_datetime, (start_date::text || ' 00:00:00')::TIMESTAMP WITH TIME ZONE),
  end_datetime = COALESCE(end_datetime, (end_date::text || ' 23:59:59')::TIMESTAMP WITH TIME ZONE)
WHERE start_datetime IS NULL OR end_datetime IS NULL;

-- Step 3: Make new columns NOT NULL (after data migration)
ALTER TABLE orders 
ALTER COLUMN start_datetime SET NOT NULL,
ALTER COLUMN end_datetime SET NOT NULL;

-- Step 4: Create indexes for the new datetime columns
CREATE INDEX IF NOT EXISTS idx_orders_start_datetime ON orders(start_datetime);
CREATE INDEX IF NOT EXISTS idx_orders_end_datetime ON orders(end_datetime);

-- Note: We keep both DATE and TIMESTAMP columns for now
-- The application will use start_datetime and end_datetime
-- You can drop start_date and end_date later after verifying everything works
