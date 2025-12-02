-- Update branch information for Glanz Constumes Collection
-- This script updates the first branch or creates one if none exists

-- First, check if any branch exists and update it
-- If no branch exists, insert a new one
DO $$
DECLARE
  branch_count INTEGER;
  branch_id UUID;
BEGIN
  -- Count existing branches
  SELECT COUNT(*) INTO branch_count FROM branches;
  
  IF branch_count > 0 THEN
    -- Get the first branch ID
    SELECT id INTO branch_id FROM branches LIMIT 1;
    
    -- Update the existing branch
    UPDATE branches
    SET 
      name = 'Glanz Constumes Collection',
      address = '2nd Floor, South Start Estate Parambithara Road, Panampilly Nagar Eranakulam - 682036',
      phone = '+91 9539708899, +91 9605943208'
    WHERE id = branch_id;
    
    RAISE NOTICE 'Updated branch with ID: %', branch_id;
  ELSE
    -- Insert a new branch if none exists
    INSERT INTO branches (name, address, phone)
    VALUES (
      'Glanz Constumes Collection',
      '2nd Floor, South Start Estate Parambithara Road, Panampilly Nagar Eranakulam - 682036',
      '+91 9539708899, +91 9605943208'
    )
    RETURNING id INTO branch_id;
    
    RAISE NOTICE 'Created new branch with ID: %', branch_id;
  END IF;
END $$;

