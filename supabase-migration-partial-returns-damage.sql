-- ============================================
-- MIGRATION: Add Partial Returns & Damage Tracking
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add returned_quantity to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS returned_quantity INTEGER DEFAULT 0;

-- Step 2: Add damage tracking fields to order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS damage_fee NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS damage_description TEXT;

-- Step 3: Add damage tracking to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS damage_fee_total NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Step 4: Update order status enum to include 'flagged' (replacing 'completed_with_issues')
-- First, update any existing rows that have 'completed_with_issues' to 'flagged'
UPDATE orders 
SET status = 'flagged' 
WHERE status = 'completed_with_issues';

-- Now remove the old check constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with updated statuses (using 'flagged' instead of 'completed_with_issues')
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('scheduled', 'active', 'pending_return', 'completed', 'cancelled', 'partially_returned', 'flagged'));

-- Step 5: Add constraint to ensure returned_quantity <= quantity
ALTER TABLE order_items 
ADD CONSTRAINT order_items_returned_quantity_check 
CHECK (returned_quantity >= 0 AND returned_quantity <= quantity);

-- Step 6: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_order_items_returned_quantity ON order_items(returned_quantity) 
WHERE returned_quantity > 0;

CREATE INDEX IF NOT EXISTS idx_order_items_damage_fee ON order_items(damage_fee) 
WHERE damage_fee > 0;

-- Step 7: Update existing records - set returned_quantity based on return_status
UPDATE order_items 
SET returned_quantity = quantity 
WHERE return_status = 'returned' AND (returned_quantity IS NULL OR returned_quantity = 0);

-- Step 8: Create or update function to calculate damage_fee_total
CREATE OR REPLACE FUNCTION calculate_order_damage_fee_total(p_order_id UUID)
RETURNS NUMERIC(10, 2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(COALESCE(damage_fee, 0)) 
     FROM order_items 
     WHERE order_id = p_order_id),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger to auto-update damage_fee_total when damage_fee changes
CREATE OR REPLACE FUNCTION update_order_damage_fee_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders 
  SET damage_fee_total = calculate_order_damage_fee_total(NEW.order_id)
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_damage_fee_total ON order_items;
CREATE TRIGGER trigger_update_damage_fee_total
  AFTER INSERT OR UPDATE OF damage_fee ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_damage_fee_total();

-- Step 10: Update process_order_return_optimized function to handle new fields
-- Note: You'll need to update your existing process_order_return_optimized function
-- to accept and process returned_quantity, damage_fee, and damage_description fields.
-- The function should update these fields in the order_items table.
-- Example update statement in the function:
-- UPDATE order_items SET 
--   returned_quantity = COALESCE(item_return.returned_quantity, returned_quantity),
--   damage_fee = COALESCE(item_return.damage_fee, damage_fee),
--   damage_description = COALESCE(item_return.damage_description, damage_description)
-- WHERE id = item_return.item_id;

COMMENT ON COLUMN order_items.returned_quantity IS 'Number of items returned (0 to quantity). Tracks partial returns.';
COMMENT ON COLUMN order_items.damage_fee IS 'Damage fee charged for this item';
COMMENT ON COLUMN order_items.damage_description IS 'Description of damage or issues with this item';
COMMENT ON COLUMN orders.damage_fee_total IS 'Total damage fees across all items in this order';
COMMENT ON COLUMN orders.completion_notes IS 'Notes about order completion issues (missing items, damage, etc.)';

