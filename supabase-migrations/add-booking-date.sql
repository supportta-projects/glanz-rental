-- Migration: Add booking date and scheduled status
-- This adds booking_date field and 'scheduled' status for advance bookings

-- Step 1: Add booking_date field (when order was created/booked)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Update existing orders to have booking_date = created_at
UPDATE orders
SET booking_date = created_at
WHERE booking_date IS NULL;

-- Step 3: Make booking_date NOT NULL after data migration
ALTER TABLE orders
ALTER COLUMN booking_date SET NOT NULL;

-- Step 4: Add 'scheduled' status to orders
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('scheduled', 'active', 'pending_return', 'completed', 'cancelled', 'partially_returned'));

-- Step 5: Create index for booking_date queries
CREATE INDEX IF NOT EXISTS idx_orders_booking_date ON orders(booking_date DESC);

-- Step 6: Add comment for documentation
COMMENT ON COLUMN orders.booking_date IS 'Date when order was booked/created. Different from start_date which is when rental actually starts.';

