-- ============================================
-- GLANZ RENTAL - STORAGE BUCKETS FOR LOGOS
-- Create storage buckets for company and branch logos
-- Run this in Supabase SQL Editor
-- ============================================

-- Create storage bucket for company logos (super_admin)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for branch logos (branch_admin)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branch-logos',
  'branch-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company-logos bucket
-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company logos" ON storage.objects;

-- Allow authenticated users to upload company logos
CREATE POLICY "Authenticated users can upload company logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
  );

-- Allow anyone to view company logos (public bucket)
CREATE POLICY "Anyone can view company logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

-- Allow authenticated users to update company logos
CREATE POLICY "Authenticated users can update company logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete company logos
CREATE POLICY "Authenticated users can delete company logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
  );

-- Storage policies for branch-logos bucket
-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Authenticated users can upload branch logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view branch logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update branch logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete branch logos" ON storage.objects;

-- Allow authenticated users to upload branch logos
CREATE POLICY "Authenticated users can upload branch logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branch-logos'
    AND auth.role() = 'authenticated'
  );

-- Allow anyone to view branch logos (public bucket)
CREATE POLICY "Anyone can view branch logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branch-logos');

-- Allow authenticated users to update branch logos
CREATE POLICY "Authenticated users can update branch logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'branch-logos'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete branch logos
CREATE POLICY "Authenticated users can delete branch logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'branch-logos'
    AND auth.role() = 'authenticated'
  );

-- Note: After running this script, verify the buckets exist in Storage → Buckets
-- Make sure they are set to Public
