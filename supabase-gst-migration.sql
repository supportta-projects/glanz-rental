-- Migration: Add GST fields to profiles table
-- This adds GST number, GST enabled toggle, GST rate, and GST inclusion preference to user profiles

-- Add GST number column (optional, for storing business GST number)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- Add GST enabled flag (boolean: true = GST enabled, false = GST disabled)
-- Default to false (GST disabled)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gst_enabled BOOLEAN DEFAULT false;

-- Add GST rate column (numeric: percentage rate, e.g., 5.00 for 5%)
-- Default to 5.00 (5%)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 5.00;

-- Add GST included flag (boolean: true = GST included in price, false = GST excluded)
-- Default to false (GST excluded, added on top)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gst_included BOOLEAN DEFAULT false;

-- Add UPI ID column (optional, for payment QR codes)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.gst_number IS 'Business GST number (optional)';
COMMENT ON COLUMN profiles.gst_enabled IS 'If true, GST is enabled and will be applied to orders. If false, no GST will be applied (default)';
COMMENT ON COLUMN profiles.gst_rate IS 'GST rate as percentage (e.g., 5.00 for 5%, 18.00 for 18%)';
COMMENT ON COLUMN profiles.gst_included IS 'If true, GST is included in prices. If false, GST is added on top (default)';
COMMENT ON COLUMN profiles.upi_id IS 'UPI ID for payment QR codes (e.g., business@paytm)';

