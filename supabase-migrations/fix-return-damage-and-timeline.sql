-- ============================================
-- FIX: Return Processing - Damage Fees & Timeline
-- ============================================
-- Fixes:
-- 1. Damage fees and descriptions not saving
-- 2. Timeline events not logging properly
-- 3. Orders not being flagged correctly
-- ============================================

CREATE OR REPLACE FUNCTION process_order_return_optimized(
  p_order_id UUID,
  p_item_returns JSONB,
  p_user_id UUID,
  p_late_fee NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_item_return JSONB;
  v_all_returned BOOLEAN;
  v_has_missing BOOLEAN;
  v_has_not_returned BOOLEAN;
  v_has_partial_returns BOOLEAN;
  v_has_damage BOOLEAN;
  v_new_status TEXT;
  v_original_total NUMERIC;
  v_new_total NUMERIC;
  v_damage_fee_total NUMERIC;
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_order_is_late BOOLEAN;
  v_timeline_notes TEXT;
BEGIN
  -- Step 1: Fetch order (single query)
  SELECT o.*, 
         COALESCE(o.end_datetime::TIMESTAMP WITH TIME ZONE, o.end_date::TIMESTAMP WITH TIME ZONE) as end_dt
  INTO v_order
  FROM orders o
  WHERE o.id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  v_end_date := v_order.end_dt;
  v_order_is_late := NOW() > v_end_date;
  v_original_total := COALESCE(v_order.total_amount, 0) - COALESCE(v_order.late_fee, 0) - COALESCE(v_order.damage_fee_total, 0);
  v_new_total := v_original_total + p_late_fee;
  
  -- Step 2: Update all items in batch (single UPDATE with WHERE IN)
  -- ✅ CRITICAL FIX: Properly handle damage_fee and damage_description updates
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' 
    AND column_name = 'returned_quantity'
  ) THEN
    -- Columns exist - use full UPDATE with new fields
    UPDATE order_items oi
    SET 
      return_status = (item->>'return_status')::TEXT,
      actual_return_date = CASE 
        WHEN (item->>'return_status')::TEXT = 'returned' AND COALESCE((item->>'returned_quantity')::INTEGER, 0) > 0
        THEN COALESCE((item->>'actual_return_date')::TIMESTAMP WITH TIME ZONE, NOW())
        ELSE NULL 
      END,
      late_return = CASE 
        WHEN (item->>'return_status')::TEXT = 'returned' AND NOW() > v_end_date
        THEN TRUE
        ELSE FALSE
      END,
      missing_note = NULLIF(item->>'missing_note', ''),
      -- ✅ FIX: Validate returned_quantity <= quantity
      returned_quantity = CASE
        WHEN item->>'returned_quantity' IS NOT NULL AND item->>'returned_quantity' != '' AND item->>'returned_quantity' != 'null'
        THEN GREATEST(0, LEAST((item->>'returned_quantity')::INTEGER, oi.quantity))
        ELSE COALESCE(oi.returned_quantity, 0)
      END,
      -- ✅ CRITICAL FIX: Always update damage_fee when provided (don't use COALESCE that keeps NULL)
      damage_fee = CASE 
        WHEN item->>'damage_fee' IS NOT NULL 
          AND item->>'damage_fee' != '' 
          AND item->>'damage_fee' != 'null'
          AND (item->>'damage_fee')::NUMERIC > 0
        THEN (item->>'damage_fee')::NUMERIC(10,2)
        ELSE COALESCE(oi.damage_fee, 0)  -- Keep existing or default to 0
      END,
      -- ✅ CRITICAL FIX: Always update damage_description when provided
      damage_description = CASE 
        WHEN item->>'damage_description' IS NOT NULL 
          AND item->>'damage_description' != '' 
          AND item->>'damage_description' != 'null'
        THEN item->>'damage_description'
        ELSE oi.damage_description  -- Keep existing
      END
    FROM jsonb_array_elements(p_item_returns) AS item
    WHERE oi.id = (item->>'item_id')::UUID
      AND oi.order_id = p_order_id;
  ELSE
    -- Columns don't exist - use basic UPDATE without new fields
    UPDATE order_items oi
    SET 
      return_status = (item->>'return_status')::TEXT,
      actual_return_date = CASE 
        WHEN (item->>'return_status')::TEXT = 'returned'
        THEN COALESCE((item->>'actual_return_date')::TIMESTAMP WITH TIME ZONE, NOW())
        ELSE NULL 
      END,
      late_return = CASE 
        WHEN (item->>'return_status')::TEXT = 'returned' AND NOW() > v_end_date
        THEN TRUE
        ELSE FALSE
      END,
      missing_note = NULLIF(item->>'missing_note', '')
    FROM jsonb_array_elements(p_item_returns) AS item
    WHERE oi.id = (item->>'item_id')::UUID
      AND oi.order_id = p_order_id;
  END IF;
  
  -- Step 3: Calculate damage fee total (AFTER UPDATE to get fresh values)
  SELECT COALESCE(SUM(COALESCE(damage_fee, 0)), 0) INTO v_damage_fee_total
  FROM order_items
  WHERE order_id = p_order_id;
  
  -- Add damage fees to total
  v_new_total := v_new_total + v_damage_fee_total;
  
  -- Validate damage_fee_total
  IF v_damage_fee_total < 0 THEN
    RAISE EXCEPTION 'Invalid damage_fee_total: %', v_damage_fee_total;
  END IF;
  
  -- Step 4: Calculate new order status (AFTER UPDATE to read fresh values)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' 
    AND column_name = 'returned_quantity'
  ) THEN
    -- Use new columns for status calculation
    SELECT 
      COUNT(*) FILTER (
        WHERE return_status = 'returned' 
        AND COALESCE(returned_quantity, 0) = quantity
      ) = COUNT(*) as all_returned,
      COUNT(*) FILTER (
        WHERE return_status = 'missing' 
        OR (return_status = 'returned' AND COALESCE(returned_quantity, 0) > 0 AND COALESCE(returned_quantity, 0) < quantity)
      ) > 0 as has_missing,
      COUNT(*) FILTER (
        WHERE (return_status = 'not_yet_returned' OR return_status IS NULL) 
        AND COALESCE(returned_quantity, 0) = 0
      ) > 0 as has_not_returned,
      COUNT(*) FILTER (
        WHERE COALESCE(returned_quantity, 0) > 0 
        AND COALESCE(returned_quantity, 0) < quantity
      ) > 0 as has_partial_returns,
      COUNT(*) FILTER (
        WHERE COALESCE(damage_fee, 0) > 0 
        OR (damage_description IS NOT NULL AND damage_description != '')
      ) > 0 as has_damage
    INTO v_all_returned, v_has_missing, v_has_not_returned, v_has_partial_returns, v_has_damage
    FROM order_items
    WHERE order_id = p_order_id;
  ELSE
    -- Fallback to old logic
    SELECT 
      COUNT(*) FILTER (WHERE return_status = 'returned') = COUNT(*) as all_returned,
      COUNT(*) FILTER (WHERE return_status = 'missing') > 0 as has_missing,
      COUNT(*) FILTER (WHERE return_status = 'not_yet_returned' OR return_status IS NULL) > 0 as has_not_returned,
      FALSE as has_partial_returns,
      FALSE as has_damage
    INTO v_all_returned, v_has_missing, v_has_not_returned, v_has_partial_returns, v_has_damage
    FROM order_items
    WHERE order_id = p_order_id;
  END IF;
  
  -- ✅ CRITICAL FIX: Determine new status with proper priority
  IF v_all_returned AND NOT v_has_partial_returns AND NOT v_has_damage AND NOT v_has_missing THEN
    v_new_status := 'completed';
  ELSIF v_has_damage OR v_has_partial_returns OR v_has_missing THEN
    v_new_status := 'flagged';
  ELSIF NOT v_has_not_returned AND NOT v_all_returned THEN
    v_new_status := 'partially_returned';
  ELSE
    v_new_status := v_order.status;
  END IF;
  
  -- Validate new total is non-negative
  IF v_new_total < 0 THEN
    RAISE EXCEPTION 'Calculated order total is negative: %', v_new_total;
  END IF;
  
  -- Step 5: Update order status and totals
  UPDATE orders
  SET 
    status = v_new_status,
    total_amount = v_new_total,
    late_fee = p_late_fee,
    late_returned = v_order_is_late,
    damage_fee_total = v_damage_fee_total
  WHERE id = p_order_id;
  
  -- Step 6: Log timeline event with detailed notes
  -- ✅ FIX: Better error handling and detailed notes
  BEGIN
    -- Build detailed notes
    v_timeline_notes := CASE 
      WHEN v_new_status = 'completed' THEN 'All items returned'
      WHEN v_new_status = 'flagged' AND v_has_damage AND v_has_partial_returns THEN 
        'Items returned with damage (₹' || v_damage_fee_total || ') and partial quantities'
      WHEN v_new_status = 'flagged' AND v_has_damage THEN 
        'Items returned with damage (₹' || v_damage_fee_total || ')'
      WHEN v_new_status = 'flagged' AND v_has_partial_returns THEN 
        'Partial return: ' || (
          SELECT COUNT(*)::TEXT 
          FROM order_items 
          WHERE order_id = p_order_id 
          AND COALESCE(returned_quantity, 0) < quantity
        ) || ' items missing'
      WHEN v_new_status = 'partially_returned' THEN 'Some items returned'
      ELSE 'Return processed'
    END;
    
    INSERT INTO order_return_audit (
      order_id,
      action,
      previous_status,
      new_status,
      user_id,
      notes
    ) VALUES (
      p_order_id,
      'items_returned',
      v_order.status,
      v_new_status,
      p_user_id,
      v_timeline_notes
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the main operation
      RAISE WARNING 'Failed to log timeline event: %', SQLERRM;
      -- Try to insert a minimal event
      BEGIN
        INSERT INTO order_return_audit (order_id, action, user_id, notes)
        VALUES (p_order_id, 'items_returned', p_user_id, 'Return processed');
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Complete timeline logging failure: %', SQLERRM;
      END;
  END;
  
  -- Return result
  RETURN jsonb_build_object(
    'new_status', v_new_status,
    'total_amount', v_new_total,
    'damage_fee_total', v_damage_fee_total,
    'late_fee', p_late_fee
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_order_return_optimized TO authenticated;

-- Update comment
COMMENT ON FUNCTION process_order_return_optimized IS 'Fixed: Properly saves damage_fee and damage_description. Improved timeline logging. Correctly flags orders with damage or partial returns.';

