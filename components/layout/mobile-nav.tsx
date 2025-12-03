"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Home, FileText, Users, Calendar, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUserStore } from "@/lib/stores/useUserStore";

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

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUserStore();

  // Prefetch data on link press/touch for ultra-fast navigation
  const handleLinkInteraction = (href: string) => {
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

  // Build menu items based on user role
  const menuItems = [];
  
  // Add dashboard if user has access
  if (user?.role === "super_admin" || user?.role === "branch_admin") {
    menuItems.push(dashboardMenuItem);
  }
  
  // Add base menu items (Orders, Calendar, Customers)
  menuItems.push(...baseMenuItems);
  
  // Add Profile only for super admin
  if (user?.role === "super_admin") {
    menuItems.push({ href: "/profile", icon: UserCircle, label: "Profile" });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden safe-bottom">
      <div className="flex items-center justify-around h-16">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onTouchStart={() => handleLinkInteraction(item.href)}
              onMouseEnter={() => handleLinkInteraction(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full",
                isActive ? "text-[#273492]" : "text-gray-500"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

