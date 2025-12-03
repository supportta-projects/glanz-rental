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
  Calendar,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { useBranches } from "@/lib/queries/branches";
import { useState } from "react";

// Base menu items - available to all roles
const baseMenuItems = [
  { href: "/orders", icon: FileText, label: "Orders" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/customers", icon: Users, label: "Customers" },
];

// Dashboard - only for super_admin and branch_admin
const dashboardMenuItem = {
  href: "/dashboard",
  icon: Home,
  label: "Dashboard",
  roles: ["super_admin", "branch_admin"] as const,
};

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

function BranchSwitcher() {
  const { user, switchBranch } = useUserStore();
  const { data: branches } = useBranches();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const currentBranch = user?.branch;

  const handleBranchSwitch = async (branchId: string | null) => {
    const selectedBranch = branches?.find((b) => b.id === branchId);
    switchBranch(branchId, selectedBranch);
    
    // Invalidate all queries to refresh data for new branch
    queryClient.invalidateQueries();
    
    // Refresh the page to reload data
    router.refresh();
    setIsOpen(false);
  };

  return (
    <div className="border-t border-gray-200 p-3">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="h-4 w-4 flex-shrink-0 text-gray-500" />
            <span className="text-xs font-medium truncate">
              {currentBranch?.name || "No Branch"}
            </span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 flex-shrink-0 text-gray-500 transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto z-50">
              <div className="p-1">
                <button
                  onClick={() => handleBranchSwitch(null)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    !user?.branch_id
                      ? "bg-[#273492]/10 text-[#273492] font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  All Branches
                </button>
                {branches?.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchSwitch(branch.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      user?.branch_id === branch.id
                        ? "bg-[#273492]/10 text-[#273492] font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {branch.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/glanz_logo.png" 
              alt="Glanz Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="font-bold text-[#273492] text-base">GLANZ RENTAL</div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Dashboard - Only for super_admin and branch_admin */}
        {user?.role === "super_admin" || user?.role === "branch_admin" ? (
          (() => {
            const Icon = dashboardMenuItem.icon;
            const isActive =
              pathname === dashboardMenuItem.href || pathname.startsWith(dashboardMenuItem.href + "/");

            return (
              <Link
                key={dashboardMenuItem.href}
                href={dashboardMenuItem.href}
                prefetch={true}
                onMouseEnter={() => handleLinkHover(dashboardMenuItem.href)}
                onFocus={() => handleLinkHover(dashboardMenuItem.href)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-[#273492] text-white font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-sm">{dashboardMenuItem.label}</span>
              </Link>
            );
          })()
        ) : null}

        {/* Base menu items - available to all roles */}
        {baseMenuItems.map((item) => {
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
                  ? "bg-[#273492] text-white font-medium"
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
                        ? "bg-[#273492] text-white font-medium"
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

      {/* Branch Switcher - Only for Super Admin */}
      {user?.role === "super_admin" && (
        <BranchSwitcher />
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 space-y-1">
        {/* Profile - Only for super admin */}
        {user?.role === "super_admin" && (
          <Link
            href="/profile"
            prefetch={true}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              pathname === "/profile"
                ? "bg-gray-50 text-[#273492] font-medium"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <UserCircle className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
            <span className="text-sm">Profile</span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#e7342f] hover:bg-[#e7342f]/10 transition-colors"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}

