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
  X,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBranches } from "@/lib/queries/branches";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMainBranch, getMainBranchId } from "@/lib/utils/branches";

// Base menu items - available to all roles
const baseMenuItems = [
  { href: "/orders", icon: ShoppingBag, label: "Orders" },
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

function MobileBranchSwitcher({ onClose }: { onClose: () => void }) {
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
                // ✅ FIX: Restore branch object for persisted branch_id
                switchBranch(user.branch_id, selectedBranch);
                queryClient.invalidateQueries();
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

  // ✅ FIX: Get display name - show main branch name as default instead of "Select Branch"
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
    // ✅ FIX: switchBranch persists to localStorage automatically via Zustand persist middleware
    switchBranch(branchId, selectedBranch);
    
    // Invalidate all queries to refresh data for new branch
    queryClient.invalidateQueries();
    
    // Refresh the page to reload data
    router.refresh();
    setIsOpen(false);
    onClose();
  };

  return (
    <div className="border-t border-gray-200 pt-2 mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Building2 className="h-5 w-5 flex-shrink-0 text-gray-500" />
          <span className="text-sm font-medium truncate">
            {getDisplayName()}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 flex-shrink-0 text-gray-500 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1">
          {/* ✅ REMOVED: "All Branches" button and "Main Branch" button - only show actual branches */}
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
      )}
    </div>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useUserStore();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUser();
    router.push("/login");
    onOpenChange(false);
  };

  const canAccess = (item: typeof adminMenuItems[0]) => {
    if (!item.role) return true;
    if (Array.isArray(item.role)) {
      return item.role.includes(user?.role || "");
    }
    return user?.role === item.role;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="left">
      <SheetContent onClose={() => onOpenChange(false)} className="w-64 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                {user?.company_logo_url ? (
                  <img 
                    src={user.company_logo_url} 
                    alt={user.company_name || "Company Logo"} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img 
                    src="/glanz_logo.png" 
                    alt="Glanz Logo" 
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">
                  {/* ✅ FIX: Always show company name from profile, fallback to "Rental System" */}
                  {user?.company_name || "Rental System"}
                </div>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
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
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-[#273492] text-white font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
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
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-[#273492] text-white font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}

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
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-[#273492] text-white font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
            </>
          )}

          {/* Branch Switcher - Only for Super Admin */}
          {user?.role === "super_admin" && (
            <MobileBranchSwitcher onClose={() => onOpenChange(false)} />
          )}
        </nav>

        <div className="border-t border-gray-200 p-4 space-y-1">
          <Link
            href="/profile"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              pathname === "/profile"
                ? "bg-[#273492]/10 text-[#273492] font-medium"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <User className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Profile</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

