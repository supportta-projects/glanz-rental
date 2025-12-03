-- ============================================
-- Auto-delete Order Images After 7 Days
-- This migration creates a function to delete product images
-- from completed orders (not partially returned) after 7 days
-- ============================================

-- Step 1: Add completed_at timestamp to orders table if it doesn't exist
-- This tracks when an order was marked as completed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        
        -- Set completed_at for existing completed orders based on created_at
        -- (orders table doesn't have updated_at column)
        UPDATE orders 
        SET completed_at = created_at 
        WHERE status = 'completed' AND completed_at IS NULL;
    END IF;
END $$;

-- Step 2: Create a trigger to automatically set completed_at when status changes to 'completed'
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set completed_at when status changes TO 'completed' (not from 'completed')
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.completed_at = NOW();
    END IF;
    
    -- Clear completed_at if status changes away from 'completed'
    IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_completed_at ON orders;

-- Create the trigger
CREATE TRIGGER trigger_set_completed_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_completed_at();

-- Step 3: Create function to extract file path from Supabase Storage URL
CREATE OR REPLACE FUNCTION extract_storage_path(url TEXT)
RETURNS TEXT AS $$
DECLARE
    path TEXT;
BEGIN
    -- Extract path from Supabase Storage URL
    -- Format: https://[project].supabase.co/storage/v1/object/public/order-items/[filename]
    -- We need: order-items/[filename]
    IF url IS NULL OR url = '' THEN
        RETURN NULL;
    END IF;
    
    -- Extract the path after /order-items/
    path := substring(url from '/order-items/(.+)$');
    
    -- If path is found, return it with bucket prefix
    IF path IS NOT NULL AND path != '' THEN
        RETURN 'order-items/' || path;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to delete images from completed orders older than 7 days
-- This function will be called by a cron job or API route
CREATE OR REPLACE FUNCTION delete_old_order_images()
RETURNS TABLE(
    order_id UUID,
    items_updated INTEGER,
    images_deleted INTEGER
) AS $$
DECLARE
    order_record RECORD;
    item_record RECORD;
    file_path TEXT;
    deleted_count INTEGER := 0;
    updated_count INTEGER := 0;
    total_items_updated INTEGER := 0;
    total_images_deleted INTEGER := 0;
BEGIN
    -- Find all completed orders (not partially_returned) that were completed more than 7 days ago
    FOR order_record IN
        SELECT id, completed_at
        FROM orders
        WHERE status = 'completed'
          AND status != 'partially_returned'  -- Only fully completed orders
          AND completed_at IS NOT NULL
          AND completed_at < NOW() - INTERVAL '7 days'
    LOOP
        -- Process each order item
        FOR item_record IN
            SELECT id, photo_url
            FROM order_items
            WHERE order_id = order_record.id
              AND photo_url IS NOT NULL
              AND photo_url != ''
        LOOP
            -- Extract file path from URL
            file_path := extract_storage_path(item_record.photo_url);
            
            -- Update order_item to remove photo_url (set to NULL)
            UPDATE order_items
            SET photo_url = NULL
            WHERE id = item_record.id;
            
            updated_count := updated_count + 1;
            
            -- Note: Actual file deletion from storage must be done via API
            -- This function only marks the images for deletion by setting photo_url to NULL
            -- The actual file deletion should be handled by an API route that has storage access
        END LOOP;
        
        total_items_updated := total_items_updated + updated_count;
        updated_count := 0;
    END LOOP;
    
    -- Return summary
    RETURN QUERY
    SELECT 
        order_record.id,
        total_items_updated,
        total_images_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_old_order_images() TO authenticated;

-- Step 6: Create a helper function to get orders ready for image deletion
-- This can be called by an API route to get the list of orders and their images
CREATE OR REPLACE FUNCTION get_orders_for_image_deletion()
RETURNS TABLE(
    order_id UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    item_id UUID,
    photo_url TEXT,
    storage_path TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id AS order_id,
        o.completed_at,
        oi.id AS item_id,
        oi.photo_url,
        extract_storage_path(oi.photo_url) AS storage_path
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status = 'completed'
      AND o.status != 'partially_returned'  -- Only fully completed orders
      AND o.completed_at IS NOT NULL
      AND o.completed_at < NOW() - INTERVAL '7 days'
      AND oi.photo_url IS NOT NULL
      AND oi.photo_url != '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_orders_for_image_deletion() TO authenticated;

-- Note: To actually delete files from Supabase Storage, you need to:
-- 1. Call get_orders_for_image_deletion() to get the list
-- 2. Use Supabase Storage API to delete each file
-- 3. Then call delete_old_order_images() to update the database
-- This is typically done via a Next.js API route with service role access

