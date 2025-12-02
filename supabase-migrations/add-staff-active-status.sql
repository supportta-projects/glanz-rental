-- ============================================
-- Add is_active status to staff profiles
-- Allows super admin to activate/deactivate staff accounts
-- ============================================

-- Add is_active column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing profiles to be active by default
UPDATE profiles
SET is_active = true
WHERE is_active IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_active IS 'Whether the staff account is active. Inactive staff cannot log in.';

