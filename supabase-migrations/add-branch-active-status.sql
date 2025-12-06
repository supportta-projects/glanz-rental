-- ============================================
-- Add is_active status to branches
-- Allows super admin to activate/deactivate branches
-- ============================================

-- Add is_active column to branches table
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing branches to be active by default
UPDATE branches
SET is_active = true
WHERE is_active IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);

-- Add comment for documentation
COMMENT ON COLUMN branches.is_active IS 'Whether the branch is active. Inactive branches cannot be selected for new orders.';

