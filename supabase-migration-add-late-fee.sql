-- Migration: Add late fee column to orders table
-- Run this in Supabase SQL Editor

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS late_fee NUMERIC(10, 2) DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_late_fee ON orders(late_fee) WHERE late_fee > 0;

