-- ============================================
-- CRITICAL FIX: Status Determination Logic
-- Fixes Issue P2: Status conflicts (flagged vs partially_returned)
-- ============================================
-- This updates the process_order_return_optimized function to use the same
-- status determination logic as the frontend, ensuring consistency.
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
  v_audit_logs JSONB := '[]'::JSONB;
  v_inconsistent_items INTEGER; -- ✅ FIX (Issue O4): Declare here for validation
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
  -- Check if columns exist before using them
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
      -- ✅ CRITICAL FIX (Issue O2): Validate returned_quantity <= quantity
      returned_quantity = CASE
        WHEN item->>'returned_quantity' IS NOT NULL AND item->>'returned_quantity' != '' AND item->>'returned_quantity' != 'null'
        THEN GREATEST(0, LEAST((item->>'returned_quantity')::INTEGER, oi.quantity)) -- Clamp: 0 <= qty <= quantity
        ELSE COALESCE(oi.returned_quantity, 0)
      END,
      damage_fee = COALESCE(
        CASE 
          WHEN item->>'damage_fee' IS NOT NULL AND item->>'damage_fee' != '' AND item->>'damage_fee' != 'null'
          THEN GREATEST(0, (item->>'damage_fee')::NUMERIC(10,2)) -- Ensure non-negative
          ELSE NULL
        END,
        oi.damage_fee,
        0
      ),
      damage_description = COALESCE(
        CASE 
          WHEN item->>'damage_description' IS NOT NULL AND item->>'damage_description' != '' AND item->>'damage_description' != 'null'
          THEN item->>'damage_description'
          ELSE NULL
        END,
        oi.damage_description
      )
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
  
  -- Step 3: Calculate damage fee total
  -- ✅ FIX (Issue Q1): Ensure damage_fee_total is calculated correctly for multiple items
  SELECT COALESCE(SUM(COALESCE(damage_fee, 0)), 0) INTO v_damage_fee_total
  FROM order_items
  WHERE order_id = p_order_id;
  
  -- ✅ FIX (Issue Q2): Validate no double counting - ensure original total doesn't already include damage fees
  -- v_original_total already subtracts damage_fee_total, so we add it back correctly
  -- Add damage fees to total
  v_new_total := v_new_total + v_damage_fee_total;
  
  -- ✅ FIX (Issue Q1): Verify damage_fee_total calculation (for debugging)
  IF v_damage_fee_total < 0 THEN
    RAISE EXCEPTION 'Invalid damage_fee_total: %', v_damage_fee_total;
  END IF;
  
  -- Step 4: Calculate new order status - ✅ CRITICAL FIX (Issue P2)
  -- Use same priority logic as frontend:
  -- 1. completed: All items fully returned AND no damage AND no missing
  -- 2. flagged: Any damage OR partial returns OR missing items
  -- 3. partially_returned: Some items returned but no damage and no missing
  -- 4. Keep current status: No items returned yet
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' 
    AND column_name = 'returned_quantity'
  ) THEN
    -- Use new columns for status calculation
    SELECT 
      -- All returned: every item has returned_quantity = quantity AND return_status = 'returned'
      COUNT(*) FILTER (
        WHERE return_status = 'returned' 
        AND COALESCE(returned_quantity, 0) = quantity
      ) = COUNT(*) as all_returned,
      
      -- Has missing: any item with return_status = 'missing' OR partial return
      COUNT(*) FILTER (
        WHERE return_status = 'missing' 
        OR (return_status = 'returned' AND COALESCE(returned_quantity, 0) > 0 AND COALESCE(returned_quantity, 0) < quantity)
      ) > 0 as has_missing,
      
      -- Has not returned: any item with no returned quantity
      COUNT(*) FILTER (
        WHERE (return_status = 'not_yet_returned' OR return_status IS NULL) 
        AND COALESCE(returned_quantity, 0) = 0
      ) > 0 as has_not_returned,
      
      -- Has partial returns: any item with 0 < returned_quantity < quantity
      COUNT(*) FILTER (
        WHERE COALESCE(returned_quantity, 0) > 0 
        AND COALESCE(returned_quantity, 0) < quantity
      ) > 0 as has_partial_returns,
      
      -- Has damage: any item with damage_fee > 0 OR damage_description
      COUNT(*) FILTER (
        WHERE COALESCE(damage_fee, 0) > 0 
        OR (damage_description IS NOT NULL AND damage_description != '')
      ) > 0 as has_damage
    INTO v_all_returned, v_has_missing, v_has_not_returned, v_has_partial_returns, v_has_damage
    FROM order_items
    WHERE order_id = p_order_id;
  ELSE
    -- Fallback to old logic without new columns
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
  
  -- ✅ CRITICAL FIX (Issue P2, O4): Determine new status with proper priority and validation
  -- Priority 1: All items fully returned, no damage, no missing → completed
  IF v_all_returned AND NOT v_has_partial_returns AND NOT v_has_damage AND NOT v_has_missing THEN
    v_new_status := 'completed';
  -- Priority 2: Any damage OR partial returns OR missing items → flagged
  ELSIF v_has_damage OR v_has_partial_returns OR v_has_missing THEN
    v_new_status := 'flagged';
  -- Priority 3: Some items returned but no damage and no missing → partially_returned
  ELSIF NOT v_has_not_returned AND NOT v_all_returned THEN
    v_new_status := 'partially_returned';
  -- Priority 4: No items returned yet → keep current status
  ELSE
    v_new_status := v_order.status;
  END IF;
  
  -- ✅ FIX (Issue O4): Validate returned_quantity consistency with return_status
  -- Check if any items have inconsistent state (returned_quantity doesn't match return_status)
  SELECT COUNT(*) INTO v_inconsistent_items
  FROM order_items
  WHERE order_id = p_order_id
    AND (
      (return_status = 'returned' AND COALESCE(returned_quantity, 0) = 0) OR
      (return_status = 'not_yet_returned' AND COALESCE(returned_quantity, 0) > 0) OR
      (return_status = 'missing' AND COALESCE(returned_quantity, 0) > 0)
    );
  
  IF v_inconsistent_items > 0 THEN
    RAISE WARNING 'Found % items with inconsistent return_status and returned_quantity', v_inconsistent_items;
    -- Don't fail, but log the inconsistency
  END IF;
  
  -- ✅ FIX (Issue Q3): Validate new total is non-negative
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
  
  -- Step 6: Log timeline events (simplified - one event per return)
  -- ✅ FIX (Issue O6): Timeline logging is non-blocking - if it fails, order update still succeeds
  BEGIN
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
      CASE 
        WHEN v_new_status = 'completed' THEN 'All items returned'
        WHEN v_new_status = 'flagged' THEN 
          CASE 
            WHEN v_has_damage AND v_has_partial_returns THEN 'Items returned with damage and partial quantities'
            WHEN v_has_damage THEN 'Items returned with damage'
            WHEN v_has_partial_returns THEN 'Partial return'
            WHEN v_has_missing THEN 'Some items missing'
            ELSE 'Items returned with issues'
          END
        WHEN v_new_status = 'partially_returned' THEN 'Some items returned'
        ELSE 'Return processed'
      END
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log timeline error but don't fail the main operation
      RAISE WARNING 'Failed to log timeline event: %', SQLERRM;
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
COMMENT ON FUNCTION process_order_return_optimized IS 'Optimized function to process order returns. FIXED: Status determination logic matches frontend (completed > flagged > partially_returned). Validates returned_quantity <= quantity.';

