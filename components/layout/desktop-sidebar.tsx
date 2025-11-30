"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  FileText,
  Users,
  BarChart3,
  Building2,
  UserCog,
  UserCircle,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";

const menuItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/orders", icon: FileText, label: "Orders" },
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
  const queryClient = useQueryClient();
  const { user, clearUser } = useUserStore();
  const supabase = createClient();

  // Prefetch data on link hover for ultra-fast navigation
  const handleLinkHover = (href: string) => {
    // Prefetch the route immediately
    router.prefetch(href);
    
    // Prefetch query data based on route
    if (href === "/orders") {
      queryClient.prefetchQuery({
        queryKey: ["orders", user?.branch_id, 1, 20, { status: "all" }],
      });
    } else if (href === "/customers") {
      queryClient.prefetchQuery({
        queryKey: ["customers", undefined, 1, 25],
      });
    } else if (href === "/dashboard") {
      queryClient.prefetchQuery({
        queryKey: ["dashboard-stats", user?.branch_id],
      });
      queryClient.prefetchQuery({
        queryKey: ["recent-orders", user?.branch_id],
      });
    }
  };

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
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[250px] bg-white border-r border-gray-200 z-30">
      {/* Logo */}
      <div className="h-16 border-b border-gray-200 flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0b63ff] flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <div className="font-bold text-[#0b63ff] text-base">GLANZ RENTAL</div>
        </div>
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
              prefetch={true}
              onMouseEnter={() => handleLinkHover(item.href)}
              onFocus={() => handleLinkHover(item.href)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-[#0b63ff] text-white font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}

        {/* Management Section */}
        {adminMenuItems.filter(canAccess).length > 0 && (
          <>
            <div className="px-3 py-2 mt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Management
              </div>
            </div>
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
                    prefetch={true}
                    onMouseEnter={() => handleLinkHover(item.href)}
                    onFocus={() => handleLinkHover(item.href)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive
                        ? "bg-[#0b63ff] text-white font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 space-y-1">
        <Link
          href="/profile"
          prefetch={true}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
            pathname === "/profile"
              ? "bg-gray-50 text-[#0b63ff] font-medium"
              : "text-gray-700 hover:bg-gray-50"
          )}
        >
          <UserCircle className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-sm">Profile</span>
        </Link>
        <Link
          href="/settings"
          prefetch={true}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
            pathname === "/settings"
              ? "bg-gray-50 text-[#0b63ff] font-medium"
              : "text-gray-700 hover:bg-gray-50"
          )}
        >
          <SettingsIcon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-sm">Settings</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}

