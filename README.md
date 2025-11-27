# Glanz Rental - Rental Management System

A professional, mobile-first rental management system built with Next.js 14, Supabase, and Tailwind CSS.

## 🚀 Features

- **Mobile-First Design**: Optimized for 98% smartphone usage with large touch targets (56px minimum)
- **Three User Roles**: Super Admin, Branch Admin, and Staff with role-based permissions
- **Order Management**: Complete order lifecycle from creation to return
- **Camera Integration**: Direct camera access for product photo uploads
- **Real-time Updates**: Live order status updates using Supabase Realtime
- **Invoice Generation**: PDF invoices with product photos
- **Responsive Design**: Works perfectly on phones (320px+) and desktops

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database & Auth**: Supabase
- **State Management**: Zustand + TanStack Query
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: lucide-react
- **PDF Generation**: @react-pdf/renderer

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## 🔧 Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd glanz-rental
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Set up Supabase Database

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'branch_admin', 'staff')),
  branch_id UUID REFERENCES branches(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create branches table
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  id_proof_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  staff_id UUID NOT NULL REFERENCES profiles(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_number TEXT UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_return', 'completed')),
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  product_name TEXT,
  quantity INTEGER NOT NULL,
  price_per_day NUMERIC NOT NULL,
  days INTEGER NOT NULL,
  line_total NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create storage bucket for order items
INSERT INTO storage.buckets (id, name, public) VALUES ('order-items', 'order-items', true);

-- Set up RLS policies (example for staff - only see own branch)
CREATE POLICY "staff_own_branch" ON orders
  FOR SELECT
  USING (branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid()));
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Pages & Routes

- `/login` - Authentication page
- `/dashboard` - Main dashboard with stats
- `/orders/new` - Create new order (10-step flow)
- `/orders` - Orders list (mobile cards + desktop table)
- `/orders/[id]` - Order details with mark returned
- `/orders/[id]/edit` - Edit order (before returned)
- `/customers` - Customer management
- `/customers/[id]` - Customer details and history
- `/branches` - Branch management (Super Admin only)
- `/staff` - Staff management (Admins only)
- `/reports` - Reports and analytics
- `/profile` - User profile and password change

## 🎨 Design System

- **Primary Color**: Sky-500 (#0ea5e9)
- **Success**: Green-500 (#10b981)
- **Danger/Pending**: Red-500 (#ef4444)
- **Touch Targets**: Minimum 56px height
- **Breakpoints**: Mobile-first, desktop at 768px+

## 🔐 User Roles & Permissions

### Super Admin
- Access to all branches and data
- Can create/delete branches
- Can create staff for any branch
- Full system access

### Branch Admin
- Access to own branch only
- Can create staff for own branch
- Can manage orders in own branch
- Cannot delete branches

### Staff
- Access to own branch only
- Can create orders
- Can view active/pending orders
- Can mark orders as returned
- Cannot edit after returned

## 📦 Project Structure

```
glanz-rental/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Authentication routes
│   └── (dashboard)/         # Protected dashboard routes
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Layout components
│   └── orders/             # Order-specific components
├── lib/                     # Utilities and configurations
│   ├── supabase/           # Supabase client setup
│   ├── stores/             # Zustand stores
│   ├── queries/            # TanStack Query hooks
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
└── public/                  # Static assets
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Environment Variables for Production

Make sure to set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📝 License

This project is private and proprietary.

## 🤝 Support

For support and questions, please contact the development team.

---

Built with ❤️ for efficient rental management
