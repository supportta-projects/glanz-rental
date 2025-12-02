-- ============================================
-- Simple Fix: Remove Recursive Policies and Use Basic Access
-- This is a simpler alternative if the function approach doesn't work
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop ALL problematic policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Branch admins can view branch profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Branch admins can create branch profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Branch admins can update branch profiles" ON profiles;

-- Step 2: Keep only the basic policies (users can view/update own profile)
-- These should already exist from the original setup, but we ensure they're there

-- Policy: Users can view own profile (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

-- Policy: Users can update own profile (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

-- Step 3: Allow authenticated users to view all profiles (for staff management)
-- This is less secure but avoids recursion. Staff creation via API route will still work.
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Step 4: Note about staff creation
-- Staff creation via /api/staff/create uses service role key, so it bypasses RLS
-- This is safe because the API route validates permissions server-side

