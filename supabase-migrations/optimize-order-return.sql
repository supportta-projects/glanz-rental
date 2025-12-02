-- Optimized function: Process order return in single transaction
-- This reduces 6-10 network calls to just 1 call (~50-100ms total)

CREATE OR REPLACE FUNCTION process_order_return_optimized(
  p_order_id UUID,
  p_item_returns JSONB, -- Array of {item_id, return_status, actual_return_date, missing_note}
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
  v_new_status TEXT;
  v_original_total NUMERIC;
  v_new_total NUMERIC;
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_order_is_late BOOLEAN;
  v_audit_logs JSONB := '[]'::JSONB;
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
  v_original_total := COALESCE(v_order.total_amount, 0) - COALESCE(v_order.late_fee, 0);
  v_new_total := v_original_total + p_late_fee;
  
  -- Step 2: Update all items in batch (single UPDATE with WHERE IN)
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
  
  -- Step 3: Calculate new order status (single query)
  SELECT 
    COUNT(*) FILTER (WHERE return_status = 'returned') = COUNT(*) as all_returned,
    COUNT(*) FILTER (WHERE return_status = 'missing') > 0 as has_missing,
    COUNT(*) FILTER (WHERE return_status = 'not_yet_returned' OR return_status IS NULL) > 0 as has_not_returned
  INTO v_all_returned, v_has_missing, v_has_not_returned
  FROM order_items
  WHERE order_id = p_order_id;
  
  -- Determine new status
  IF v_all_returned THEN
    v_new_status := 'completed';
  ELSIF v_has_missing OR v_has_not_returned THEN
    IF v_order.status = 'completed' THEN
      v_new_status := 'partially_returned';
    ELSE
      v_new_status := 'partially_returned';
    END IF;
  ELSE
    v_new_status := v_order.status;
  END IF;
  
  -- Step 4: Update order (single UPDATE)
  UPDATE orders
  SET 
    status = v_new_status,
    late_fee = p_late_fee,
    late_returned = v_order_is_late OR p_late_fee > 0,
    total_amount = v_new_total
  WHERE id = p_order_id;
  
  -- Step 5: Create audit logs in batch (single INSERT with multiple rows)
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
  
  -- Insert all audit logs at once
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

-- Add comment
COMMENT ON FUNCTION process_order_return_optimized IS 'Optimized function to process order returns in single transaction. Reduces network calls from 6-10 to 1.';

