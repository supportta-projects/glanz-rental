-- Migration: Add GST fields to orders table
-- This adds subtotal and GST amount to orders for proper invoice breakdown

-- Add subtotal column (amount before GST)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2);

-- Add GST amount column (5% GST)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10, 2);

-- Add comments for documentation
COMMENT ON COLUMN orders.subtotal IS 'Subtotal amount before GST';
COMMENT ON COLUMN orders.gst_amount IS 'GST amount (5% of subtotal)';

-- Update existing orders: calculate subtotal and GST from total_amount
-- Assuming GST was excluded (added on top) for existing orders
UPDATE orders 
SET 
  subtotal = total_amount / 1.05,  -- Reverse calculate subtotal (if GST was 5% on top)
  gst_amount = (total_amount / 1.05) * 0.05  -- Calculate GST amount
WHERE subtotal IS NULL OR gst_amount IS NULL;

