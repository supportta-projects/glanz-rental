-- Update customers table to add new ID proof fields
-- Run this in your Supabase SQL Editor

-- Add new columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS id_proof_type TEXT CHECK (id_proof_type IN ('aadhar', 'passport', 'voter', 'others')),
ADD COLUMN IF NOT EXISTS id_proof_number TEXT,
ADD COLUMN IF NOT EXISTS id_proof_front_url TEXT,
ADD COLUMN IF NOT EXISTS id_proof_back_url TEXT;

-- Keep old id_proof_url for backward compatibility (can be removed later if not needed)
-- ALTER TABLE customers DROP COLUMN IF EXISTS id_proof_url;

-- Create storage bucket for customer ID proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-id-proofs',
  'customer-id-proofs',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer-id-proofs bucket
CREATE POLICY "Authenticated users can upload customer ID proof images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'customer-id-proofs'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view customer ID proof images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'customer-id-proofs');

CREATE POLICY "Authenticated users can update customer ID proof images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'customer-id-proofs'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete customer ID proof images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'customer-id-proofs'
    AND auth.role() = 'authenticated'
  );

