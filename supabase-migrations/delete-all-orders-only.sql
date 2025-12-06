-- ============================================
-- DELETE ALL ORDERS DATA ONLY (KEEP CUSTOMERS)
-- ============================================
-- ⚠️ WARNING: This will PERMANENTLY DELETE all order data!
-- This action CANNOT be undone!
-- Customers will be kept intact.
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Show current data counts (for verification)
DO $$
DECLARE
  v_order_count INTEGER;
  v_order_item_count INTEGER;
  v_timeline_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_order_count FROM orders;
  SELECT COUNT(*) INTO v_order_item_count FROM order_items;
  SELECT COUNT(*) INTO v_timeline_count FROM order_return_audit;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CURRENT ORDER DATA COUNTS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Orders: %', v_order_count;
  RAISE NOTICE 'Order Items: %', v_order_item_count;
  RAISE NOTICE 'Timeline Events: %', v_timeline_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Customers will be KEPT (not deleted)';
  RAISE NOTICE '========================================';
END $$;

-- Step 2: Delete all order-related data
DO $$
DECLARE
  v_deleted_timeline INTEGER;
  v_deleted_items INTEGER;
  v_deleted_orders INTEGER;
  v_remaining_orders INTEGER;
  v_remaining_items INTEGER;
  v_remaining_timeline INTEGER;
BEGIN
  -- Delete order timeline/audit events first (references orders)
  DELETE FROM order_return_audit;
  GET DIAGNOSTICS v_deleted_timeline = ROW_COUNT;
  RAISE NOTICE 'Deleted % timeline/audit events', v_deleted_timeline;

  -- Delete order items
  DELETE FROM order_items;
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted % order items', v_deleted_items;

  -- Delete all orders
  DELETE FROM orders;
  GET DIAGNOSTICS v_deleted_orders = ROW_COUNT;
  RAISE NOTICE 'Deleted % orders', v_deleted_orders;

  -- Verify deletion
  SELECT COUNT(*) INTO v_remaining_orders FROM orders;
  SELECT COUNT(*) INTO v_remaining_items FROM order_items;
  SELECT COUNT(*) INTO v_remaining_timeline FROM order_return_audit;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DELETION SUMMARY:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Orders deleted: %', v_deleted_orders;
  RAISE NOTICE 'Order items deleted: %', v_deleted_items;
  RAISE NOTICE 'Timeline events deleted: %', v_deleted_timeline;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REMAINING DATA (should be 0):';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Orders: %', v_remaining_orders;
  RAISE NOTICE 'Order Items: %', v_remaining_items;
  RAISE NOTICE 'Timeline Events: %', v_remaining_timeline;
  RAISE NOTICE '========================================';
  
  IF v_remaining_orders = 0 AND v_remaining_items = 0 AND v_remaining_timeline = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All order data deleted successfully!';
    RAISE NOTICE '✅ Customers have been kept intact.';
  ELSE
    RAISE WARNING '⚠️ WARNING: Some data still remains. Check the counts above.';
  END IF;
END $$;

-- Step 3: Final verification query (optional - run separately if needed)
-- SELECT 
--   (SELECT COUNT(*) FROM orders) as remaining_orders,
--   (SELECT COUNT(*) FROM order_items) as remaining_items,
--   (SELECT COUNT(*) FROM order_return_audit) as remaining_timeline,
--   (SELECT COUNT(*) FROM customers) as customers_kept;

