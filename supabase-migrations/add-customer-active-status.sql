-- ============================================
-- Add is_active status to customers
-- Allows admin to activate/deactivate customer accounts
-- ============================================

-- Add is_active column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing customers to be active by default
UPDATE customers
SET is_active = true
WHERE is_active IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- Add comment for documentation
COMMENT ON COLUMN customers.is_active IS 'Whether the customer account is active. Inactive customers cannot be used in new orders.';

