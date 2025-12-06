-- ============================================
-- FIX: Timeline RLS Policy
-- ============================================
-- Ensures users can read timeline events for orders in their branch
-- ============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view audit logs for own branch orders" ON order_return_audit;

-- Create policy for reading timeline events
CREATE POLICY "Users can view audit logs for own branch orders"
  ON order_return_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_return_audit.order_id
      AND (
        orders.branch_id IN (
          SELECT branch_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'super_admin'
        )
      )
    )
  );

-- Ensure users can insert timeline events (for their own actions)
DROP POLICY IF EXISTS "Users can insert audit logs for own branch orders" ON order_return_audit;
CREATE POLICY "Users can insert audit logs for own branch orders"
  ON order_return_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_return_audit.order_id
      AND (
        orders.branch_id IN (
          SELECT branch_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'super_admin'
        )
      )
    )
    AND order_return_audit.user_id = auth.uid()
  );

-- Add comment
COMMENT ON POLICY "Users can view audit logs for own branch orders" ON order_return_audit IS 
'Allows users to read timeline events for orders in their branch. Fixes timeline visibility issue.';

