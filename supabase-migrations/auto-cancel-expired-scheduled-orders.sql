-- ============================================
-- AUTO-CANCEL EXPIRED SCHEDULED ORDERS
-- Automatically cancels scheduled orders where start_date has passed
-- Run this in Supabase SQL Editor
-- ============================================

-- Function to auto-cancel scheduled orders where start_date has passed
CREATE OR REPLACE FUNCTION auto_cancel_expired_scheduled_orders()
RETURNS INTEGER AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  -- Cancel scheduled orders where start_date has passed and status is still 'scheduled'
  -- Check both start_datetime (timestamp) and start_date (date) for compatibility
  UPDATE orders
  SET status = 'cancelled'
  WHERE status = 'scheduled'
    AND (
      (start_datetime IS NOT NULL AND start_datetime < NOW())
      OR (start_date IS NOT NULL AND start_date < CURRENT_DATE)
    );
  
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  
  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auto_cancel_expired_scheduled_orders TO authenticated;

-- Add comment
COMMENT ON FUNCTION auto_cancel_expired_scheduled_orders IS 'Automatically cancels scheduled orders where the start date has passed and rental has not been started';

