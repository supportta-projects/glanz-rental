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
  Settings,
  X,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBranches } from "@/lib/queries/branches";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const menuItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/orders", icon: ShoppingBag, label: "Orders" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
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

function MobileBranchSwitcher({ onClose }: { onClose: () => void }) {
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
            {currentBranch?.name || "No Branch"}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 flex-shrink-0 text-gray-500 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1">
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
                <img 
                  src="/glanz_logo.png" 
                  alt="Glanz Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">GLANZ</div>
                <div className="text-xs text-gray-500">RENTAL</div>
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
          {menuItems.map((item) => {
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
          <Link
            href="/settings"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              pathname === "/settings"
                ? "bg-[#273492]/10 text-[#273492] font-medium"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Settings</span>
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

