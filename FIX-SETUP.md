# 🔧 Fix Database Setup Error

## The Problem

You got this error: `relation "branches" does not exist`

This happened because the SQL script tried to create the `profiles` table (which references `branches`) **before** creating the `branches` table.

## ✅ The Solution

I've created a **corrected SQL file** with the proper table creation order.

### Quick Fix (2 minutes)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/ptkszsydlwzdbszryfej
   - Click **SQL Editor** → **New Query**

2. **Copy the ENTIRE file**: `supabase-setup-fixed.sql`
   - Open the file in your project
   - Copy everything (Ctrl+A, Ctrl+C)

3. **Paste and Run**
   - Paste into SQL Editor
   - Click **Run** (or Ctrl+Enter)

4. **Verify Success**
   - You should see: "Success. No rows returned"
   - Go to **Table Editor** - you should see all 5 tables:
     - ✅ branches
     - ✅ profiles
     - ✅ customers
     - ✅ orders
     - ✅ order_items

## 📋 Correct Table Creation Order

The tables MUST be created in this order:

1. **branches** (no dependencies)
2. **customers** (no dependencies)
3. **profiles** (depends on branches)
4. **orders** (depends on branches, profiles, customers)
5. **order_items** (depends on orders)

## ⚠️ If You Already Ran the Wrong Script

If you already tried to create tables and got errors:

1. **Drop existing tables** (if any were created):
   ```sql
   DROP TABLE IF EXISTS order_items CASCADE;
   DROP TABLE IF EXISTS orders CASCADE;
   DROP TABLE IF EXISTS profiles CASCADE;
   DROP TABLE IF EXISTS customers CASCADE;
   DROP TABLE IF EXISTS branches CASCADE;
   ```

2. **Then run** `supabase-setup-fixed.sql` completely

## ✅ After Running the Fixed Script

Once the script runs successfully:

1. **Create your first admin user**:
   - Go to **Authentication** → **Users** → **Add User**
   - Create user with email/password
   - Copy the **User ID** (UUID)

2. **Create admin profile**:
   ```sql
   INSERT INTO profiles (id, username, role, branch_id, full_name, phone)
   VALUES (
     'PASTE_USER_ID_HERE',  -- From auth.users
     'admin',
     'super_admin',
     (SELECT id FROM branches LIMIT 1),
     'Super Admin',
     '+91 98765 43210'
   );
   ```

3. **Test login**:
   - Start dev server: `npm run dev`
   - Go to http://localhost:3000/login
   - Login with the email/password you created

## 🎯 That's It!

The corrected script will create everything in the right order. Just copy/paste and run!

