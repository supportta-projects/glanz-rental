-- Fix RLS Policy for Orders - Allow Super Admins to Create/Update Orders in Any Branch
-- Run this in Supabase SQL Editor

-- Add policy for super_admins to create orders in any branch
DROP POLICY IF EXISTS "Super admins can create orders in any branch" ON orders;
CREATE POLICY "Super admins can create orders in any branch"
  ON orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
    AND staff_id = auth.uid()
  );

-- Add policy for super_admins to update orders in any branch
DROP POLICY IF EXISTS "Super admins can update orders in any branch" ON orders;
CREATE POLICY "Super admins can update orders in any branch"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- The existing "Staff can create orders in own branch" policy will handle branch staff
-- Both policies will work together (OR logic) - users matching either policy can create orders

