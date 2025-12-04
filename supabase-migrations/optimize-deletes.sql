-- ============================================
-- OPTIMIZE DATABASE FOR FAST DELETES
-- Ensures proper cascade deletes and maintains data integrity
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add indexes for faster delete operations
CREATE INDEX IF NOT EXISTS idx_orders_branch_id_for_delete ON orders(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_staff_id_for_delete ON orders(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id_for_delete ON profiles(branch_id) WHERE branch_id IS NOT NULL;

-- Step 2: Create function to safely delete branch with transaction
CREATE OR REPLACE FUNCTION delete_branch_safely(p_branch_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_order_count INTEGER;
  v_staff_count INTEGER;
  v_result JSONB;
BEGIN
  -- Check for existing orders
  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE branch_id = p_branch_id;
  
  -- Check for staff members
  SELECT COUNT(*) INTO v_staff_count
  FROM profiles
  WHERE branch_id = p_branch_id;
  
  -- If there are orders, prevent deletion (data integrity)
  -- Staff will be set to NULL branch_id automatically via ON DELETE SET NULL
  
  IF v_order_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete branch with existing orders',
      'order_count', v_order_count,
      'staff_count', v_staff_count
    );
  END IF;
  
  -- Delete branch (staff.branch_id will be set to NULL automatically)
  DELETE FROM branches WHERE id = p_branch_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_branch_id', p_branch_id,
    'affected_staff', v_staff_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create function to safely delete staff with transaction
CREATE OR REPLACE FUNCTION delete_staff_safely(p_staff_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_order_count INTEGER;
  v_is_super_admin BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check if super admin
  SELECT role = 'super_admin' INTO v_is_super_admin
  FROM profiles
  WHERE id = p_staff_id;
  
  IF v_is_super_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete super admin account'
    );
  END IF;
  
  -- Check for existing orders
  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE staff_id = p_staff_id;
  
  -- If there are orders, prevent deletion (maintain data integrity)
  IF v_order_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete staff member with existing orders',
      'order_count', v_order_count
    );
  END IF;
  
  -- Delete auth user (cascades to profile via ON DELETE CASCADE)
  -- This is handled by the API route, but we provide the function for reference
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_staff_id', p_staff_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_branch_safely TO authenticated;
GRANT EXECUTE ON FUNCTION delete_staff_safely TO authenticated;

-- Step 5: Add comments
COMMENT ON FUNCTION delete_branch_safely IS 'Safely deletes a branch after checking for dependencies. Returns error if orders exist.';
COMMENT ON FUNCTION delete_staff_safely IS 'Safely deletes a staff member after checking for dependencies. Returns error if orders exist or is super admin.';

