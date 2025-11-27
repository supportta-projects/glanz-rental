-- Glanz Rental Database Setup Script
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- IMPORTANT: Tables must be created in this exact order due to foreign key dependencies
-- Order: branches → customers → profiles → orders → order_items

-- Step 1: Create branches table FIRST (no dependencies)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create customers table (no dependencies)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  id_proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create profiles table (depends on branches - must come after branches)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'branch_admin', 'staff')),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create orders table (depends on branches, profiles, customers)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  id_proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_return', 'completed')),
  total_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  product_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_day NUMERIC(10, 2) NOT NULL,
  days INTEGER NOT NULL,
  line_total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_staff_id ON orders(staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for branches
CREATE POLICY "Super admins can view all branches"
  ON branches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Branch admins and staff can view own branch"
  ON branches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.branch_id = branches.id
    )
  );

CREATE POLICY "Super admins can manage branches"
  ON branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policies for customers
CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  USING (auth.role() = 'authenticated');

-- RLS Policies for orders
CREATE POLICY "Staff can view orders from own branch"
  ON orders FOR SELECT
  USING (
    branch_id = (
      SELECT branch_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Staff can create orders in own branch"
  ON orders FOR INSERT
  WITH CHECK (
    branch_id = (
      SELECT branch_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
    AND staff_id = auth.uid()
  );

CREATE POLICY "Staff can update orders in own branch"
  ON orders FOR UPDATE
  USING (
    branch_id = (
      SELECT branch_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'branch_admin')
      )
      OR staff_id = auth.uid()
    )
  );

-- RLS Policies for order_items
CREATE POLICY "Users can view order items from own branch orders"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.branch_id = (
        SELECT branch_id FROM profiles
        WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert order items for own branch orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.branch_id = (
        SELECT branch_id FROM profiles
        WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update order items for own branch orders"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.branch_id = (
        SELECT branch_id FROM profiles
        WHERE profiles.id = auth.uid()
      )
    )
  );

-- Create storage bucket for order items
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-items',
  'order-items',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for order-items bucket
CREATE POLICY "Authenticated users can upload order item images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'order-items'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view order item images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-items');

CREATE POLICY "Authenticated users can delete own uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'order-items'
    AND auth.role() = 'authenticated'
  );

-- Function to automatically update order status based on dates
CREATE OR REPLACE FUNCTION update_order_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If order is not completed and end_date has passed, mark as pending_return
  IF NEW.status != 'completed' AND NEW.end_date < CURRENT_DATE THEN
    NEW.status := 'pending_return';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update status on insert/update
CREATE TRIGGER trigger_update_order_status
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_status();

-- Insert a default branch (you can modify this)
INSERT INTO branches (id, name, address, phone)
VALUES (
  gen_random_uuid(),
  'Main Branch',
  '123 Main Street, City, State',
  '+91 98765 43210'
)
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

