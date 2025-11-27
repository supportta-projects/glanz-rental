# Supabase Setup Instructions

## ✅ Step 1: Environment Variables

The `.env.local` file has been created with your Supabase credentials. Verify it contains:

```
NEXT_PUBLIC_SUPABASE_URL=https://ptkszsydlwzdbszryfej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0a3N6c3lkbHd6ZGJzenJ5ZmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDUxNjEsImV4cCI6MjA3OTgyMTE2MX0.C4tdrjRI9vmu0KdcgWsP1a_SX0lH0Zu3SM-Pz0u56Js
```

## ✅ Step 2: Run Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ptkszsydlwzdbszryfej
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-setup.sql`
5. Click **Run** (or press Ctrl+Enter)

This will create:
- All database tables (branches, profiles, customers, orders, order_items)
- Row Level Security (RLS) policies
- Storage bucket for order item images
- Indexes for performance
- Default branch

## ✅ Step 3: Create First Super Admin User

After running the SQL script, you need to create your first user:

### Option A: Using Supabase Dashboard

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **Add User** → **Create new user**
3. Enter email and password (this will be your username)
4. Copy the user ID (UUID)

### Option B: Using SQL (After creating auth user)

Once you have a user in `auth.users`, run this SQL to create a super admin profile:

```sql
-- Replace 'USER_ID_HERE' with the actual UUID from auth.users
-- Replace 'your_username' with desired username
-- Replace 'Your Name' and phone number

INSERT INTO profiles (id, username, role, branch_id, full_name, phone)
VALUES (
  'USER_ID_HERE',  -- Get this from auth.users table
  'admin',
  'super_admin',
  (SELECT id FROM branches LIMIT 1),  -- Assign to first branch
  'Super Admin',
  '+91 98765 43210'
);
```

## ✅ Step 4: Verify Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Verify that `order-items` bucket exists
3. Check that it's set to **Public**

## ✅ Step 5: Test the Application

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/login

3. Try logging in with:
   - Username: The email you used when creating the user
   - Password: The password you set

## 🔧 Troubleshooting

### Issue: "relation does not exist"
- Make sure you ran the entire `supabase-setup.sql` script
- Check that all tables were created in the **Table Editor**

### Issue: "permission denied"
- Verify RLS policies are enabled
- Check that your user has the correct role in the `profiles` table

### Issue: "storage bucket not found"
- Go to **Storage** → **Buckets**
- Manually create bucket named `order-items`
- Set it to **Public**

### Issue: Can't upload images
- Check storage bucket policies
- Verify bucket is public
- Check file size limits (set to 5MB)

## 📝 Next Steps

1. Create additional branches (if needed)
2. Create staff users for each branch
3. Test order creation flow
4. Verify camera upload works on mobile device

## 🔐 Security Notes

- **Never commit** `.env.local` to git (it's already in `.gitignore`)
- The **service role key** should only be used server-side, never in client code
- Keep your anon key secure but it's safe to use in client-side code

---

Your Supabase project is now configured! 🎉

