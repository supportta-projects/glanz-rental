-- ============================================
-- FIX: Ensure RLS policies allow reading order_items
-- ============================================
-- This ensures users can read order_items for orders in their branch
-- Fixes the missing items issue caused by RLS blocking access
-- ============================================

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "Users can read order items for orders in their branch" ON order_items;
DROP POLICY IF EXISTS "Super admins can read all order items" ON order_items;
DROP POLICY IF EXISTS "Branch users can read their order items" ON order_items;
DROP POLICY IF EXISTS "Users can read order items" ON order_items;

-- Policy 1: Branch users can read order items for orders in their branch
CREATE POLICY "Users can read order items for orders in their branch"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (
        -- User's branch matches order's branch
        o.branch_id IN (
          SELECT branch_id FROM profiles WHERE id = auth.uid()
        )
        OR
        -- User is super_admin (can read all)
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'super_admin'
        )
      )
    )
  );

-- Policy 2: Super admins can read all order items
CREATE POLICY "Super admins can read all order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Policy 3: Users can insert order items (for order creation)
CREATE POLICY "Users can insert order items for their orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (
        o.branch_id IN (
          SELECT branch_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'super_admin'
        )
      )
      AND o.staff_id = auth.uid() -- Only the creator can add items
    )
  );

-- Policy 4: Users can update order items (for returns, damage fees, etc.)
CREATE POLICY "Users can update order items for their branch orders"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (
        o.branch_id IN (
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

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'order_items'
ORDER BY policyname;

-- Add comment
COMMENT ON POLICY "Users can read order items for orders in their branch" ON order_items IS 
'Allows users to read order items for orders in their branch. Fixes missing items issue.';

