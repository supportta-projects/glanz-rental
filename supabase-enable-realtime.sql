-- Enable Realtime for tables
-- Run this in Supabase SQL Editor to enable Realtime subscriptions

-- Enable Realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable Realtime for customers table
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- Enable Realtime for order_items table
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- Verify Realtime is enabled (optional check)
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('orders', 'customers', 'order_items');

