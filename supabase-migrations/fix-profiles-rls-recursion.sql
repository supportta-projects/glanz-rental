-- ============================================
-- Fix Infinite Recursion in Profiles RLS Policies
-- This creates a SECURITY DEFINER function to check user roles without recursion
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Branch admins can view branch profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Branch admins can create branch profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Branch admins can update branch profiles" ON profiles;

-- Step 2: Create a SECURITY DEFINER function to get user role without RLS
-- This function runs with the privileges of the function creator (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role, '');
END;
$$;

-- Step 3: Create a SECURITY DEFINER function to get user branch_id without RLS
CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_branch_id UUID;
BEGIN
  SELECT branch_id INTO user_branch_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_branch_id;
END;
$$;

-- Step 4: Recreate policies using the functions (no recursion!)
-- Policy: Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  USING (get_user_role() = 'super_admin');

-- Policy: Branch admins can view profiles from their branch
CREATE POLICY "Branch admins can view branch profiles"
  ON profiles FOR SELECT
  USING (
    get_user_role() = 'branch_admin'
    AND branch_id = get_user_branch_id()
  );

-- Policy: Super admins can insert profiles (create staff)
CREATE POLICY "Super admins can create profiles"
  ON profiles FOR INSERT
  WITH CHECK (get_user_role() = 'super_admin');

-- Policy: Branch admins can insert profiles for their branch (create staff)
CREATE POLICY "Branch admins can create branch profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    get_user_role() = 'branch_admin'
    AND branch_id = get_user_branch_id()
  );

-- Policy: Super admins can update any profile
CREATE POLICY "Super admins can update all profiles"
  ON profiles FOR UPDATE
  USING (get_user_role() = 'super_admin');

-- Policy: Branch admins can update profiles in their branch
CREATE POLICY "Branch admins can update branch profiles"
  ON profiles FOR UPDATE
  USING (
    get_user_role() = 'branch_admin'
    AND branch_id = get_user_branch_id()
  );

-- Note: The existing "Users can view own profile" and "Users can update own profile" policies
-- are still in place, so users can always view and update their own profile regardless of role.

