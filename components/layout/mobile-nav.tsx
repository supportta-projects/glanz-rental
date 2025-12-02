"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Home, ShoppingCart, Users, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUserStore } from "@/lib/stores/useUserStore";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/orders", icon: ShoppingCart, label: "Orders" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/profile", icon: User, label: "Profile" },
];

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
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

