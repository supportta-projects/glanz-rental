# GST Setup Instructions

## Issue: Unable to Add GST

If you're unable to save GST settings, it's likely because the database columns haven't been created yet.

## Solution: Run Database Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Migration Script**
   - Copy the contents of `supabase-gst-migration.sql`
   - Paste it into the SQL Editor
   - Click **Run** or press `Ctrl+Enter`

3. **Verify Migration**
   - The migration should add these columns to the `profiles` table:
     - `gst_number` (TEXT, optional)
     - `gst_enabled` (BOOLEAN, default: false)
     - `gst_rate` (NUMERIC(5,2), default: 5.00)
     - `gst_included` (BOOLEAN, default: false)

4. **Test GST Settings**
   - Go to Profile page
   - You should now see the GST Settings section
   - Toggle "Enable GST" on
   - Enter GST rate (e.g., 5.00 for 5%)
   - Choose GST calculation method
   - Click "Save GST Settings"

## Migration SQL File

The migration file is located at: `supabase-gst-migration.sql`

## Troubleshooting

If you still get errors after running the migration:

1. **Check if columns exist:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name LIKE 'gst%';
   ```

2. **Manually add columns if needed:**
   ```sql
   ALTER TABLE profiles 
   ADD COLUMN IF NOT EXISTS gst_number TEXT;
   
   ALTER TABLE profiles 
   ADD COLUMN IF NOT EXISTS gst_enabled BOOLEAN DEFAULT false;
   
   ALTER TABLE profiles 
   ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 5.00;
   
   ALTER TABLE profiles 
   ADD COLUMN IF NOT EXISTS gst_included BOOLEAN DEFAULT false;
   ```

3. **Check browser console** for any JavaScript errors

4. **Check Supabase logs** for database errors

