# 🚀 Quick Start Guide - Glanz Rental

## ✅ What's Already Done

1. ✅ Environment variables configured (`.env.local` created)
2. ✅ Database schema SQL file ready (`supabase-setup.sql`)
3. ✅ All code is ready to run

## 📋 Next Steps (5 minutes)

### Step 1: Set Up Database (2 minutes)

1. Open your Supabase Dashboard:
   - Go to: https://supabase.com/dashboard/project/ptkszsydlwzdbszryfej
   - Or: https://ptkszsydlwzdbszryfej.supabase.co

2. Run the SQL script:
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**
   - Open `supabase-setup.sql` from this project
   - Copy the entire file content
   - Paste into SQL Editor
   - Click **Run** (or press Ctrl+Enter)

3. Verify tables were created:
   - Go to **Table Editor**
   - You should see: `branches`, `profiles`, `customers`, `orders`, `order_items`

### Step 2: Create Your First Admin User (2 minutes)

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Enter:
   - Email: `admin@glanzconstumes.com` (or your email)
   - Password: `admin123` (change this!)
   - Auto Confirm: ✅ (check this)
4. Click **Create User**
5. Copy the **User ID** (UUID) - you'll need it next ( c70c73b2-2b16-4b4d-92b9-09231726e4f0 )

**Option B: Create Profile for Existing User**

If you already have a user, run this SQL (replace `USER_ID_HERE` with actual UUID):

```sql
-- Get your user ID from auth.users table first
SELECT id, email FROM auth.users;

-- Then insert profile (replace USER_ID_HERE with actual ID)
INSERT INTO profiles (id, username, role, branch_id, full_name, phone)
VALUES (
  'c70c73b2-2b16-4b4d-92b9-09231726e4f0',
  'admin',
  'super_admin',
  (SELECT id FROM branches LIMIT 1),
  'Super Admin',
  '+91 9539708899'
);
```

### Step 3: Verify Storage Bucket (1 minute)

1. Go to **Storage** in Supabase Dashboard
2. Check if `order-items` bucket exists
3. If not, create it:
   - Click **New bucket**
   - Name: `order-items`
   - Public bucket: ✅ (check this)
   - Click **Create bucket**

### Step 4: Test the App! 🎉

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open browser: http://localhost:3000

3. Login with:
   - Username: The email you used (e.g., `admin@glanz.com`)
   - Password: The password you set

4. You should see the Dashboard! 🎊

## 🧪 Test Order Creation

1. Click the **+ New Order** button (floating button on mobile, or top button on desktop)
2. Try the order creation flow:
   - Add a customer (use Quick Add)
   - Select dates
   - Add items with camera photos
   - Save order

## 📱 Test on Mobile

1. Find your local IP address:
   ```bash
   ipconfig  # Windows
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. On your phone, open: `http://YOUR_IP:3000`
   - Make sure phone and computer are on same WiFi
   - Make sure firewall allows port 3000

3. Test camera upload on phone!

## ⚠️ Common Issues

### "Invalid login credentials"
- Make sure you created the user in Supabase Authentication
- Make sure you created the profile in the `profiles` table
- Check that username in profile matches the email you're using

### "relation does not exist"
- You didn't run the SQL script completely
- Go back to Step 1 and run `supabase-setup.sql` again

### "permission denied"
- RLS policies might not be set up correctly
- Re-run the SQL script
- Check that your user has a profile with correct role

### Images not uploading
- Check storage bucket exists and is public
- Check file size (limit is 5MB)
- Check browser console for errors

## 🎯 What to Do Next

1. ✅ Create more branches (if needed)
2. ✅ Create staff users for each branch
3. ✅ Test the complete order flow
4. ✅ Customize branch names and details
5. ✅ Deploy to Vercel when ready

## 📞 Need Help?

Check `SETUP.md` for detailed troubleshooting or review the `README.md` for full documentation.

---

**You're all set! Happy coding! 🚀**

