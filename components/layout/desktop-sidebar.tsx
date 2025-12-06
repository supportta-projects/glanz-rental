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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { useBranches } from "@/lib/queries/branches";
import { useState, useEffect } from "react";
import { getMainBranch, getMainBranchId } from "@/lib/utils/branches";

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
  const [mainBranch, setMainBranch] = useState<{ id: string; name: string } | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const currentBranch = user?.branch;

  // ✅ FIX: Load main branch on mount and restore/auto-select branch
  useEffect(() => {
    const loadMainBranch = async () => {
      const mainBranchId = await getMainBranchId();
      if (mainBranchId) {
        const mainBranchData = await getMainBranch();
        if (mainBranchData) {
          setMainBranch({ id: mainBranchData.id, name: mainBranchData.name });
          
          // ✅ FIX: For shop admins, always ensure main branch is selected
          // For super_admin, restore persisted branch if it exists, otherwise keep null
          if (user?.role !== "super_admin") {
            // Shop admins: Always use main branch (they can't switch)
            if (!user?.branch_id || user.branch_id !== mainBranchData.id) {
              switchBranch(mainBranchData.id, mainBranchData);
              queryClient.invalidateQueries();
              router.refresh();
            }
          } else {
            // Super admin: If they have a persisted branch_id, restore the branch object
            if (user?.branch_id && !user?.branch) {
              // Find the branch from the branches list
              const selectedBranch = branches?.find((b) => b.id === user.branch_id);
              if (selectedBranch) {
                switchBranch(user.branch_id, selectedBranch);
              }
            }
          }
        }
      }
    };
    
    if (branches && branches.length > 0 && !mainBranch && user) {
      loadMainBranch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, user?.branch_id, user?.role, user?.branch]); // Add user.branch to restore branch object

  const getDisplayName = () => {
    // If a branch is selected, show the branch name
    if (user?.branch_id && currentBranch?.name) {
      return currentBranch.name;
    }
    
    // ✅ FIX: Show main branch name as default instead of "Select Branch"
    // For super admin, show main branch name when no branch selected
    // For shop admins, main branch should already be auto-selected
    if (mainBranch) {
      return mainBranch.name;
    }
    
    // Fallback to company name or "Main Branch"
    return user?.company_name || "Main Branch";
  };

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
    <div className="border-t border-gray-200/60 p-4 bg-gradient-to-b from-transparent to-gray-50/50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-white/80 transition-all duration-300 premium-hover backdrop-blur-sm border border-gray-200/50"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#273492]/10 to-[#273492]/5">
              <Building2 className="h-4 w-4 flex-shrink-0 text-[#273492]" />
            </div>
            <span className="text-xs font-semibold truncate">
              {getDisplayName()}
            </span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 flex-shrink-0 text-gray-500 transition-transform duration-300",
            isOpen && "rotate-180"
          )} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200/60 max-h-48 overflow-y-auto z-50 animate-fade-in">
              <div className="p-1.5">
                {/* ✅ REMOVED: "All Branches" button and "Main Branch" button - only show actual branches */}
                {branches?.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchSwitch(branch.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                      user?.branch_id === branch.id
                        ? "bg-gradient-to-r from-[#273492]/10 to-[#273492]/5 text-[#273492] font-semibold shadow-sm"
                        : "text-gray-700 hover:bg-gray-50/80"
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
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[260px] bg-white/95 backdrop-blur-lg border-r border-gray-200/60 z-30 shadow-xl sidebar-enter">
      {/* Premium Logo Header */}
      <div className="h-20 border-b border-gray-200/60 flex items-center px-5 bg-gradient-to-br from-white via-white to-gray-50/30">
        <div className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#273492]/10 to-[#273492]/5 border-2 border-[#273492]/20 transition-all duration-300 group-hover:scale-110 group-hover:border-[#273492]/40 premium-hover">
            {user?.company_logo_url ? (
              <img 
                src={user.company_logo_url} 
                alt={user.company_name || "Company Logo"} 
                className="w-full h-full object-contain p-1.5"
              />
            ) : (
              <img 
                src="/glanz_logo.png" 
                alt="Glanz Logo" 
                className="w-full h-full object-contain p-1.5"
              />
            )}
          </div>
          <div>
            <div className="font-bold text-[#273492] text-base tracking-tight">
              {/* ✅ FIX: Always show company name from profile, fallback to "Rental System" */}
              {user?.company_name || "Rental System"}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Menu Items */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
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
                  "sidebar-link sidebar-menu-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group",
                  isActive
                    ? "active text-white font-semibold !bg-gradient-to-r from-[#273492] to-[#1f2a7a]"
                    : "text-gray-700 hover:text-[#273492]"
                )}
                style={{ animationDelay: "0.05s" }}
              >
                <Icon
                  className={cn(
                    "sidebar-icon h-5 w-5 flex-shrink-0 transition-all duration-300",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-[#273492]"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-sm font-medium">{dashboardMenuItem.label}</span>
                {isActive && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Sparkles className="h-3 w-3 text-white/80 animate-pulse" />
                  </div>
                )}
              </Link>
            );
          })()
        ) : null}

        {/* Base menu items - available to all roles */}
        {baseMenuItems.map((item, index) => {
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
                "sidebar-link sidebar-menu-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group",
                isActive
                  ? "active text-white font-semibold !bg-gradient-to-r from-[#273492] to-[#1f2a7a]"
                  : "text-gray-700 hover:text-[#273492]"
              )}
              style={{ animationDelay: `${(index + 1) * 0.05 + 0.1}s` }}
            >
              <Icon
                className={cn(
                  "sidebar-icon h-5 w-5 flex-shrink-0 transition-all duration-300",
                  isActive ? "text-white" : "text-gray-500 group-hover:text-[#273492]"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Sparkles className="h-3 w-3 text-white/80 animate-pulse" />
                </div>
              )}
            </Link>
          );
        })}

        {/* Management Section */}
        {adminMenuItems.filter(canAccess).length > 0 && (
          <>
            <div className="px-4 py-3 mt-6 mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Management
              </div>
            </div>
            {adminMenuItems
              .filter(canAccess)
              .map((item, index) => {
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
                      "sidebar-link sidebar-menu-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group",
                      isActive
                        ? "active text-white font-semibold !bg-gradient-to-r from-[#273492] to-[#1f2a7a]"
                        : "text-gray-700 hover:text-[#273492]"
                    )}
                    style={{ animationDelay: `${(index + baseMenuItems.length + 1) * 0.05 + 0.25}s` }}
                  >
                    <Icon
                      className={cn(
                        "sidebar-icon h-5 w-5 flex-shrink-0 transition-all duration-300",
                        isActive ? "text-white" : "text-gray-500 group-hover:text-[#273492]"
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Sparkles className="h-3 w-3 text-white/80 animate-pulse" />
                      </div>
                    )}
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

      {/* Premium Footer */}
      <div className="border-t border-gray-200/60 p-4 space-y-1.5 bg-gradient-to-b from-transparent to-gray-50/30">
        {/* Profile - Only for super admin */}
        {user?.role === "super_admin" && (
          <Link
            href="/profile"
            prefetch={true}
            className={cn(
              "sidebar-link sidebar-menu-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
              pathname === "/profile"
                ? "bg-gradient-to-r from-[#273492]/10 to-[#273492]/5 text-[#273492] font-semibold border border-[#273492]/20"
                : "text-gray-700 hover:bg-gray-50/80 hover:text-[#273492]"
            )}
            style={{ animationDelay: "0.45s" }}
          >
            <UserCircle className="h-5 w-5 flex-shrink-0" strokeWidth={2} />
            <span className="text-sm font-medium">Profile</span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full sidebar-link sidebar-menu-item flex items-center gap-3 px-4 py-3 rounded-xl text-[#e7342f] hover:bg-[#e7342f]/10 transition-all duration-300 hover:translate-x-1"
          style={{ animationDelay: "0.5s" }}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" strokeWidth={2} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}

