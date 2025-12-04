-- ============================================
-- GLANZ RENTAL - PROFILE COMPANY DETAILS MIGRATION
-- Add company details fields to profiles table
-- Run this in Supabase SQL Editor
-- ============================================

-- Add company details columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Add logo_url to branches table if not exists (for branch-specific logos)
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON profiles(company_name) WHERE company_name IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.company_name IS 'Company/business name for invoices (used by super_admin)';
COMMENT ON COLUMN profiles.company_address IS 'Company address/location for invoices (used by super_admin)';
COMMENT ON COLUMN profiles.company_logo_url IS 'Company logo URL for invoices (used by super_admin)';
COMMENT ON COLUMN branches.logo_url IS 'Branch-specific logo URL for invoices';

