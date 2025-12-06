-- ============================================
-- CREATE RPC FUNCTION: get_orders_with_items
-- ============================================
-- This function efficiently fetches orders with their items in a single query
-- Fixes the missing items issue by ensuring items are always included
-- ============================================

CREATE OR REPLACE FUNCTION get_orders_with_items(
  p_branch_id UUID,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_orders JSONB;
  v_total INTEGER;
BEGIN
  -- Build dynamic query based on filters
  -- Use JSON aggregation to include items in single query
  
  WITH filtered_orders AS (
    SELECT 
      o.id,
      o.invoice_number,
      o.branch_id,
      o.staff_id,
      o.customer_id,
      o.booking_date,
      o.start_date,
      o.end_date,
      o.start_datetime,
      o.end_datetime,
      o.status,
      o.total_amount,
      o.late_fee,
      o.late_returned,
      o.damage_fee_total,
      o.completion_notes,
      o.subtotal,
      o.gst_amount,
      o.created_at,
      -- Customer data
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'phone', c.phone,
        'customer_number', c.customer_number
      ) as customer,
      -- Branch data
      jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'address', b.address,
        'phone', b.phone,
        'logo_url', b.logo_url
      ) as branch,
      -- Items as JSON array
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'photo_url', oi.photo_url,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'price_per_day', oi.price_per_day,
            'days', oi.days,
            'line_total', oi.line_total,
            'return_status', oi.return_status,
            'actual_return_date', oi.actual_return_date,
            'late_return', oi.late_return,
            'missing_note', oi.missing_note,
            'returned_quantity', oi.returned_quantity,
            'damage_fee', oi.damage_fee,
            'damage_description', oi.damage_description
          ) ORDER BY oi.created_at
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::jsonb
      ) as items
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN branches b ON o.branch_id = b.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE 
      (p_branch_id IS NULL OR o.branch_id = p_branch_id)
      AND (p_status IS NULL OR o.status = p_status)
      AND (
        p_start_date IS NULL OR 
        (o.status = 'scheduled' AND o.start_datetime >= p_start_date) OR
        (o.status != 'scheduled' AND o.created_at >= p_start_date)
      )
      AND (
        p_end_date IS NULL OR
        (o.status = 'scheduled' AND o.start_datetime <= p_end_date) OR
        (o.status != 'scheduled' AND o.created_at <= p_end_date)
      )
    GROUP BY 
      o.id, o.invoice_number, o.branch_id, o.staff_id, o.customer_id,
      o.booking_date, o.start_date, o.end_date, o.start_datetime, o.end_datetime,
      o.status, o.total_amount, o.late_fee, o.late_returned, o.damage_fee_total,
      o.completion_notes, o.subtotal, o.gst_amount, o.created_at,
      c.id, c.name, c.phone, c.customer_number,
      b.id, b.name, b.address, b.phone, b.logo_url
    ORDER BY o.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  total_count AS (
    SELECT COUNT(*) as total
    FROM orders o
    WHERE 
      (p_branch_id IS NULL OR o.branch_id = p_branch_id)
      AND (p_status IS NULL OR o.status = p_status)
      AND (
        p_start_date IS NULL OR 
        (o.status = 'scheduled' AND o.start_datetime >= p_start_date) OR
        (o.status != 'scheduled' AND o.created_at >= p_start_date)
      )
      AND (
        p_end_date IS NULL OR
        (o.status = 'scheduled' AND o.start_datetime <= p_end_date) OR
        (o.status != 'scheduled' AND o.created_at <= p_end_date)
      )
  )
  SELECT 
    jsonb_build_object(
      'data', COALESCE(jsonb_agg(fo ORDER BY fo.created_at DESC), '[]'::jsonb),
      'total', (SELECT total FROM total_count)
    )
  INTO v_orders
  FROM filtered_orders fo;
  
  RETURN COALESCE(v_orders, jsonb_build_object('data', '[]'::jsonb, 'total', 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_orders_with_items TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_orders_with_items IS 'Efficiently fetches orders with their items in a single query. Returns JSONB with data array and total count. Fixes missing items issue.';

