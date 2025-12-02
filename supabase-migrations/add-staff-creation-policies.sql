-- ============================================
-- Add RLS Policies for Staff Creation
-- This allows super admins and branch admins to create staff profiles
-- Run this in Supabase SQL Editor
-- ============================================

-- Policy: Super admins can view all profiles (for staff management)
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

-- Policy: Branch admins can view profiles from their branch
DROP POLICY IF EXISTS "Branch admins can view branch profiles" ON profiles;
CREATE POLICY "Branch admins can view branch profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'branch_admin'
      AND p.branch_id = profiles.branch_id
    )
  );

-- Policy: Super admins can insert profiles (create staff)
DROP POLICY IF EXISTS "Super admins can create profiles" ON profiles;
CREATE POLICY "Super admins can create profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

-- Policy: Branch admins can insert profiles for their branch (create staff)
DROP POLICY IF EXISTS "Branch admins can create branch profiles" ON profiles;
CREATE POLICY "Branch admins can create branch profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'branch_admin'
      AND p.branch_id = profiles.branch_id
    )
  );

-- Policy: Super admins can update any profile
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
CREATE POLICY "Super admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

-- Policy: Branch admins can update profiles in their branch
DROP POLICY IF EXISTS "Branch admins can update branch profiles" ON profiles;
CREATE POLICY "Branch admins can update branch profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'branch_admin'
      AND p.branch_id = profiles.branch_id
    )
  );

-- Note: The existing "Users can view own profile" and "Users can update own profile" policies
-- are still in place, so users can always view and update their own profile regardless of role.

