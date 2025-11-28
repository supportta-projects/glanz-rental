-- Fix RLS Policy for Orders - Allow Super Admins to View All Orders
-- Run this in Supabase SQL Editor

-- Add policy for super_admins to view all orders
DROP POLICY IF EXISTS "Super admins can view all orders" ON orders;
CREATE POLICY "Super admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- The existing "Staff can view orders from own branch" policy will handle branch staff
-- Both policies will work together (OR logic) - users matching either policy can view orders

