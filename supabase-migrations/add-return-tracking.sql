-- Migration: Add Return Tracking Fields for Item-wise Returns
-- This migration is idempotent and safe to run multiple times

-- Step 1: Add return tracking fields to order_items table (idempotent)
DO $$ 
BEGIN
  -- Add return_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'return_status'
  ) THEN
    ALTER TABLE order_items
    ADD COLUMN return_status TEXT DEFAULT 'not_yet_returned' 
      CHECK (return_status IN ('not_yet_returned', 'returned', 'missing'));
  END IF;

  -- Add actual_return_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'actual_return_date'
  ) THEN
    ALTER TABLE order_items
    ADD COLUMN actual_return_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add late_return column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'late_return'
  ) THEN
    ALTER TABLE order_items
    ADD COLUMN late_return BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add missing_note column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'missing_note'
  ) THEN
    ALTER TABLE order_items
    ADD COLUMN missing_note TEXT;
  END IF;
END $$;

-- Step 2: Update orders table status constraint to include partially_returned (idempotent)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
  
  -- Add new constraint with partially_returned
  ALTER TABLE orders
  ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('active', 'pending_return', 'completed', 'cancelled', 'partially_returned'));
END $$;

-- Step 3: Add late_returned flag to orders table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'late_returned'
  ) THEN
    ALTER TABLE orders
    ADD COLUMN late_returned BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Step 4: Create indexes for return status queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_order_items_return_status ON order_items(return_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id_return_status ON order_items(order_id, return_status);
CREATE INDEX IF NOT EXISTS idx_orders_status_partially_returned ON orders(status) WHERE status = 'partially_returned';
CREATE INDEX IF NOT EXISTS idx_orders_late_returned ON orders(late_returned) WHERE late_returned = TRUE;

-- Step 5: Create audit log table for return operations (idempotent)
CREATE TABLE IF NOT EXISTS order_return_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'marked_returned', 'marked_missing', 'updated_return_date', 'order_status_updated', etc.
  previous_status TEXT,
  new_status TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create indexes for audit table (idempotent)
CREATE INDEX IF NOT EXISTS idx_order_return_audit_order_id ON order_return_audit(order_id);
CREATE INDEX IF NOT EXISTS idx_order_return_audit_order_item_id ON order_return_audit(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_return_audit_created_at ON order_return_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_return_audit_user_id ON order_return_audit(user_id);

-- Step 7: Enable RLS on audit table
ALTER TABLE order_return_audit ENABLE ROW LEVEL SECURITY;

-- Step 8: RLS Policies for audit table (idempotent)
DROP POLICY IF EXISTS "Users can view audit logs for own branch orders" ON order_return_audit;
CREATE POLICY "Users can view audit logs for own branch orders"
  ON order_return_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_return_audit.order_id
      AND orders.branch_id = (
        SELECT branch_id FROM profiles
        WHERE profiles.id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert audit logs for own branch orders" ON order_return_audit;
CREATE POLICY "Users can insert audit logs for own branch orders"
  ON order_return_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_return_audit.order_id
      AND orders.branch_id = (
        SELECT branch_id FROM profiles
        WHERE profiles.id = auth.uid()
      )
    )
    AND auth.uid() = user_id
  );

-- Step 9: Update existing order_items to have default return_status (safe migration)
UPDATE order_items 
SET return_status = 'not_yet_returned' 
WHERE return_status IS NULL;

-- Step 10: Add comments for documentation
COMMENT ON COLUMN order_items.return_status IS 'Status of item return: not_yet_returned, returned, or missing';
COMMENT ON COLUMN order_items.actual_return_date IS 'Timestamp when item was actually returned';
COMMENT ON COLUMN order_items.late_return IS 'True if item was returned after planned return date';
COMMENT ON COLUMN order_items.missing_note IS 'Optional note explaining why item is missing';
COMMENT ON COLUMN orders.late_returned IS 'True if order has any items returned late';
COMMENT ON TABLE order_return_audit IS 'Audit log for all return operations, tracking who did what and when';

