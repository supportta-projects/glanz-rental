# Profile Page Setup Guide

This guide will help you set up the profile page features including company/branch details and logo uploads.

## 📋 Required Setup Steps

### Step 1: Run Database Migration

Run the profile company details migration to add the necessary columns to the `profiles` table:

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open and run `supabase-profile-company-migration.sql`
4. This will add:
   - `company_name` column
   - `company_address` column
   - `company_logo_url` column
   - `logo_url` column to `branches` table

### Step 2: Create Storage Buckets

The profile page requires storage buckets for logo uploads. Run the storage buckets migration:

1. In Supabase SQL Editor, open and run `supabase-storage-buckets-migration.sql`
2. This will create:
   - `company-logos` bucket (for super_admin company logos)
   - `branch-logos` bucket (for branch_admin branch logos)
   - Required storage policies for upload/view/update/delete

### Step 3: Verify Storage Buckets

1. Go to **Storage** → **Buckets** in Supabase Dashboard
2. Verify that both buckets exist:
   - ✅ `company-logos` (should be Public)
   - ✅ `branch-logos` (should be Public)
3. If they're not public, click on each bucket and toggle **Public bucket** to ON

## ✅ Setup Complete!

After completing these steps, you can:

- **Super Admin**: Edit company name, address, and upload company logo
- **Branch Admin**: Edit branch name, address, phone, and upload branch logo
- **All Users**: Edit user details (name, phone), configure UPI and GST settings

## 🔧 Troubleshooting

### Error: "Bucket not found"

If you see this error when uploading a logo:

1. Make sure you've run `supabase-storage-buckets-migration.sql` in Supabase SQL Editor
2. Verify the buckets exist in **Storage** → **Buckets**
3. Make sure both buckets are set to **Public**

### Error: "Upload failed" or Permission Denied

1. Check that storage policies were created (run the migration SQL again)
2. Verify your user has `authenticated` role
3. Check browser console for detailed error messages

### Logo Not Showing After Upload

1. Verify the bucket is set to **Public**
2. Check that the `logo_url` was saved in the database (check `profiles.company_logo_url` or `branches.logo_url`)
3. Verify the URL is accessible in browser

## 📝 Migration Files

- `supabase-profile-company-migration.sql` - Adds database columns
- `supabase-storage-buckets-migration.sql` - Creates storage buckets and policies

Both files can be run multiple times safely (they use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`).

