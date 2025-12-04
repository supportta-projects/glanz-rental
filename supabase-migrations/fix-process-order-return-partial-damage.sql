-- ============================================
-- FIX: Update process_order_return_optimized to handle partial returns and damage tracking
-- This fixes the issue where returned_quantity, damage_fee, and damage_description were not being saved
-- Run this in Supabase SQL Editor
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
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_order_is_late BOOLEAN;
  v_audit_logs JSONB := '[]'::JSONB;
  v_damage_fee_total NUMERIC;
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
  
  -- Step 2: Update all items in batch - INCLUDING returned_quantity, damage_fee, damage_description
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
    -- FIX: Add these three critical fields
    returned_quantity = CASE 
      WHEN item->>'returned_quantity' IS NOT NULL 
      THEN COALESCE((item->>'returned_quantity')::INTEGER, 0)
      ELSE oi.returned_quantity
    END,
    damage_fee = CASE 
      WHEN item->>'damage_fee' IS NOT NULL 
      THEN COALESCE((item->>'damage_fee')::NUMERIC(10,2), 0)
      ELSE oi.damage_fee
    END,
    damage_description = CASE 
      WHEN item->>'damage_description' IS NOT NULL AND item->>'damage_description' != ''
      THEN item->>'damage_description'
      ELSE oi.damage_description
    END
  FROM jsonb_array_elements(p_item_returns) AS item
  WHERE oi.id = (item->>'item_id')::UUID
    AND oi.order_id = p_order_id;
  
  -- Step 3: Calculate damage_fee_total from all items
  SELECT COALESCE(SUM(damage_fee), 0)
  INTO v_damage_fee_total
  FROM order_items
  WHERE order_id = p_order_id;
  
  -- Add damage fees to total
  v_new_total := v_new_total + v_damage_fee_total;
  
  -- Step 4: Calculate new order status - CHECK FOR PARTIAL RETURNS AND DAMAGE
  SELECT 
    COUNT(*) FILTER (WHERE return_status = 'returned' AND COALESCE(returned_quantity, 0) = quantity) = COUNT(*) as all_returned,
    COUNT(*) FILTER (WHERE return_status = 'missing') > 0 as has_missing,
    COUNT(*) FILTER (WHERE return_status = 'not_yet_returned' OR return_status IS NULL) > 0 as has_not_returned,
    COUNT(*) FILTER (WHERE COALESCE(returned_quantity, 0) > 0 AND COALESCE(returned_quantity, 0) < quantity) > 0 as has_partial_returns,
    COUNT(*) FILTER (WHERE COALESCE(damage_fee, 0) > 0 OR damage_description IS NOT NULL) > 0 as has_damage
  INTO v_all_returned, v_has_missing, v_has_not_returned, v_has_partial_returns, v_has_damage
  FROM order_items
  WHERE order_id = p_order_id;
  
  -- Determine new status - INCLUDE completed_with_issues
  IF v_all_returned AND NOT v_has_partial_returns AND NOT v_has_damage THEN
    v_new_status := 'completed';
  ELSIF (v_all_returned OR COUNT(*) FILTER (WHERE return_status = 'returned') = COUNT(*)) AND (v_has_partial_returns OR v_has_damage) THEN
    v_new_status := 'flagged';
  ELSIF v_has_missing OR v_has_not_returned THEN
    v_new_status := 'partially_returned';
  ELSE
    v_new_status := v_order.status;
  END IF;
  
  -- Step 5: Update order - INCLUDE damage_fee_total
  UPDATE orders
  SET 
    status = v_new_status,
    late_fee = p_late_fee,
    late_returned = v_order_is_late OR p_late_fee > 0,
    total_amount = v_new_total,
    damage_fee_total = v_damage_fee_total
  WHERE id = p_order_id;
  
  -- Step 6: Create audit logs in batch (single INSERT with multiple rows)
  -- Build audit logs array
  FOR v_item_return IN SELECT * FROM jsonb_array_elements(p_item_returns)
  LOOP
    v_audit_logs := v_audit_logs || jsonb_build_object(
      'order_id', p_order_id,
      'order_item_id', (v_item_return->>'item_id')::UUID,
      'action', 'marked_' || (v_item_return->>'return_status')::TEXT,
      'previous_status', 'not_yet_returned',
      'new_status', (v_item_return->>'return_status')::TEXT,
      'user_id', p_user_id,
      'notes', NULLIF(v_item_return->>'missing_note', '')
    );
  END LOOP;
  
  -- Insert all audit logs at once (only if order_return_audit table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_return_audit') THEN
    INSERT INTO order_return_audit (
      order_id, order_item_id, action, previous_status, new_status, user_id, notes
    )
    SELECT 
      (log->>'order_id')::UUID,
      (log->>'order_item_id')::UUID,
      log->>'action',
      log->>'previous_status',
      log->>'new_status',
      (log->>'user_id')::UUID,
      log->>'notes'
    FROM jsonb_array_elements(v_audit_logs) AS log;
    
    -- Insert order-level audit log
    INSERT INTO order_return_audit (
      order_id, action, previous_status, new_status, user_id, notes
    )
    VALUES (
      p_order_id,
      'order_status_updated',
      v_order.status,
      v_new_status,
      p_user_id,
      CASE WHEN p_late_fee > 0 THEN 'Late fee: ₹' || p_late_fee::TEXT ELSE NULL END
    );
  END IF;
  
  -- Return updated order data
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'new_status', v_new_status,
    'total_amount', v_new_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_order_return_optimized TO authenticated;

-- Update comment
COMMENT ON FUNCTION process_order_return_optimized IS 'Optimized function to process order returns in single transaction. Handles partial returns, damage fees, and descriptions. Reduces network calls from 6-10 to 1.';

