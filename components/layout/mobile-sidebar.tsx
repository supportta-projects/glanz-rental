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
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
              <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
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
                    ? "bg-sky-500 text-white font-medium"
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
                          ? "bg-sky-500 text-white font-medium"
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
        </nav>

        <div className="border-t border-gray-200 p-4 space-y-1">
          <Link
            href="/profile"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              pathname === "/profile"
                ? "bg-sky-50 text-sky-600 font-medium"
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
                ? "bg-sky-50 text-sky-600 font-medium"
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

