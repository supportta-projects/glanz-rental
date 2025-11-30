# 🏢 Glanz Rental - Rental Management System

A professional, mobile-first rental management system built with **Next.js 16**, **Supabase**, and **Tailwind CSS**. Designed for managing equipment and item rentals across multiple branches with real-time synchronization.

---

## 📚 Documentation

**New to the project?** Start here:

- **[🚀 Quick Start Guide](./QUICK_START.md)** - Get up and running in 5 minutes
- **[👨‍💻 Developer Guide](./DEVELOPER_GUIDE.md)** - Complete guide for developers
- **[🏗️ Architecture Documentation](./ARCHITECTURE.md)** - Technical deep-dive
- **[📚 API Reference](./API_REFERENCE.md)** - All hooks, stores, and utilities
- **[⚙️ Setup Guide](./SETUP.md)** - Detailed setup instructions

---

## ✨ Features

- **📱 Mobile-First Design**: Optimized for 98% smartphone usage with large touch targets (56px minimum)
- **👥 Multi-Role System**: Super Admin, Branch Admin, and Staff with granular permissions
- **📦 Order Management**: Complete lifecycle from creation to return with status tracking
- **📸 Camera Integration**: Direct camera access for product photo uploads
- **🔄 Real-time Updates**: Live synchronization across all devices using Supabase Realtime
- **🧾 Invoice Generation**: PDF invoices with product photos and GST support
- **💰 GST Support**: Configurable GST calculation per branch (enabled/disabled, rate, included/excluded)
- **⏰ Late Fee Management**: Automatic late fee calculation for overdue orders
- **📊 Dashboard Analytics**: Real-time statistics and recent activity
- **🔍 Advanced Search**: Search customers and orders with debounced queries
- **📱 Responsive Design**: Works perfectly on phones (320px+) and desktops

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 16 | React framework with App Router |
| **Language** | TypeScript | Type-safe development |
| **Database** | Supabase (PostgreSQL) | Primary data store |
| **Authentication** | Supabase Auth | User authentication |
| **Real-time** | Supabase Realtime | WebSocket subscriptions |
| **Storage** | Supabase Storage | File storage (images) |
| **State Management** | Zustand + TanStack Query | Client + Server state |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **UI Components** | shadcn/ui | Reusable component library |
| **PDF Generation** | @react-pdf/renderer | Invoice generation |
| **Icons** | lucide-react | Icon library |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- **Supabase** account and project

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd glanz-rental
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

   Create `.env.local` in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up database**
   
   See **[QUICK_START.md](./QUICK_START.md)** for detailed database setup. Run the SQL scripts in your Supabase SQL Editor:
   - `supabase-setup.sql` (or `supabase-setup-fixed.sql`)
   - `supabase-enable-realtime.sql`
   - Additional migration scripts as needed

5. **Start development server**
```bash
npm run dev
```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

**For detailed setup instructions, see [QUICK_START.md](./QUICK_START.md)**

---

## 📱 Application Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/login` | Authentication page | Public |
| `/dashboard` | Main dashboard with stats | All roles |
| `/orders` | Orders list (mobile cards + desktop table) | All roles |
| `/orders/new` | Create new order (multi-step flow) | All roles |
| `/orders/[id]` | Order details with mark returned | All roles |
| `/orders/[id]/edit` | Edit order (before returned) | All roles |
| `/customers` | Customer management | All roles |
| `/customers/new` | Create new customer | All roles |
| `/customers/[id]` | Customer details and order history | All roles |
| `/branches` | Branch management | Super Admin only |
| `/staff` | Staff management | Super Admin, Branch Admin |
| `/reports` | Reports and analytics | All roles |
| `/profile` | User profile and settings | All roles |

---

## 🎨 Design System

- **Primary Color**: Sky-500 (#0ea5e9)
- **Success**: Green-500 (#10b981)
- **Danger/Pending**: Red-500 (#ef4444)
- **Touch Targets**: Minimum 56px height (mobile-first)
- **Breakpoints**: Mobile-first, desktop at 768px+
- **Typography**: Geist Sans & Geist Mono

---

## 🔐 User Roles & Permissions

### 👑 Super Admin
- ✅ Access to all branches and data
- ✅ Can create/delete branches
- ✅ Can create staff for any branch
- ✅ Full system access
- ✅ Can view all reports

### 🏢 Branch Admin
- ✅ Access to own branch only
- ✅ Can create staff for own branch
- ✅ Can manage orders in own branch
- ✅ Can view branch reports
- ❌ Cannot delete branches
- ❌ Cannot access other branches

### 👤 Staff
- ✅ Access to own branch only
- ✅ Can create orders
- ✅ Can view active/pending orders
- ✅ Can mark orders as returned
- ❌ Cannot edit after returned
- ❌ Cannot manage staff
- ❌ Cannot view reports

---

## 📦 Project Structure

```
glanz-rental/
├── app/                          # Next.js App Router (Pages)
│   ├── (auth)/                   # Authentication routes group
│   │   └── login/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── layout.tsx            # Dashboard layout
│   │   ├── dashboard/           # Dashboard page
│   │   ├── orders/               # Order management
│   │   ├── customers/            # Customer management
│   │   ├── branches/            # Branch management
│   │   ├── staff/               # Staff management
│   │   ├── reports/             # Reports
│   │   └── profile/             # User profile
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Root page
│
├── components/                   # React Components
│   ├── ui/                      # shadcn/ui base components
│   ├── layout/                  # Layout components
│   ├── orders/                  # Order-specific components
│   ├── customers/              # Customer components
│   ├── dashboard/              # Dashboard components
│   ├── invoice/                # Invoice components
│   └── providers/              # Context providers
│
├── lib/                         # Core Library
│   ├── supabase/                # Supabase configuration
│   ├── queries/                 # TanStack Query hooks
│   ├── stores/                 # Zustand state stores
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript types
│   └── utils/                  # Utility functions
│
├── public/                      # Static assets
│
└── Documentation/               # Project documentation
    ├── README.md               # This file
    ├── QUICK_START.md          # Quick setup guide
    ├── DEVELOPER_GUIDE.md      # Developer guide
    ├── ARCHITECTURE.md         # Architecture docs
    └── API_REFERENCE.md        # API reference
```

**For detailed project structure, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#project-structure)**

---

## 🚢 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import project from GitHub
   - Add environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**
   - Vercel auto-deploys on push to main
   - Preview deployments for PRs

### Environment Variables

**Development** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=your_dev_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_dev_key
```

**Production** (Vercel):
- Set in Vercel dashboard
- Use production Supabase project

**⚠️ Important**: Never commit `.env.local` to git

---

## 📖 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Key Development Resources

- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Complete development guide
- **[Architecture Docs](./ARCHITECTURE.md)** - System architecture
- **[API Reference](./API_REFERENCE.md)** - All hooks and utilities
- **[Quick Start](./QUICK_START.md)** - Quick setup guide

---

## 🗄️ Database Schema

### Core Tables

- **`branches`**: Branch information
- **`profiles`**: User profiles (linked to auth.users)
- **`customers`**: Customer information with ID proof
- **`orders`**: Rental orders with GST and late fee support
- **`order_items`**: Items in each order with photos

**For detailed schema, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#database-schema)**

---

## 🔄 Real-time Features

The system uses **Supabase Realtime** for live synchronization:

- **Orders**: Status changes, new orders
- **Customers**: Customer updates
- **Order Items**: Item changes

All changes automatically reflect across all connected devices.

**For implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md#real-time-architecture)**

---

## 🧪 Testing

### Development Testing

- Test on mobile devices (primary use case)
- Test with different user roles
- Test real-time updates (open multiple tabs)
- Test camera upload functionality

### Browser Support

- Chrome/Edge (latest)
- Safari (latest)
- Firefox (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 📝 License

This project is private and proprietary.

---

## 🤝 Contributing

1. Read the [Developer Guide](./DEVELOPER_GUIDE.md)
2. Follow the code style and patterns
3. Test on both mobile and desktop
4. Update documentation if adding features
5. Create clear commit messages

---

## 📞 Support & Resources

### Documentation

- **[Quick Start Guide](./QUICK_START.md)** - Get started quickly
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Complete developer reference
- **[Architecture Documentation](./ARCHITECTURE.md)** - Technical deep-dive
- **[API Reference](./API_REFERENCE.md)** - All hooks and utilities

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## 🎯 Project Status

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: 2024

---

**Built with ❤️ for efficient rental management**

For questions or issues, refer to the documentation or contact the development team.
