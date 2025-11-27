"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ShoppingBag,
  Users,
  BarChart3,
  Building2,
  UserCog,
  User,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/orders", icon: ShoppingBag, label: "Orders" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
];

const adminMenuItems = [
  {
    href: "/branches",
    icon: Building2,
    label: "Branches",
    role: "super_admin",
  },
  {
    href: "/staff",
    icon: UserCog,
    label: "Staff",
    role: ["super_admin", "branch_admin"],
  },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useUserStore();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUser();
    router.push("/login");
  };

  const canAccess = (item: typeof adminMenuItems[0]) => {
    if (!item.role) return true;
    if (Array.isArray(item.role)) {
      return item.role.includes(user?.role || "");
    }
    return user?.role === item.role;
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-30 transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo & Toggle */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
              <span className="text-white font-bold">G</span>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">GLANZ</div>
              <div className="text-xs text-gray-500">RENTAL</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center mx-auto">
            <span className="text-white font-bold">G</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                isActive
                  ? "bg-sky-50 text-sky-600 font-medium"
                  : "text-gray-700 hover:bg-gray-50",
                collapsed && "justify-center"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}

        {/* Admin Menu Items */}
        {adminMenuItems
          .filter(canAccess)
          .map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-sky-50 text-sky-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 space-y-1">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
            pathname === "/profile"
              ? "bg-sky-50 text-sky-600 font-medium"
              : "text-gray-700 hover:bg-gray-50",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Profile" : undefined}
        >
          <User className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Profile</span>}
        </Link>
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

