"use client";

// Force dynamic for realtime (as per requirements)
export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag, AlertCircle, IndianRupee, CheckCircle } from "lucide-react";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useDashboardStats, useRecentOrders } from "@/lib/queries/dashboard";
import { formatCurrency } from "@/lib/utils/date";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { startOfToday, subDays } from "date-fns";

export default function DashboardPage() {
  const { user } = useUserStore();
  const queryClient = useQueryClient();
  
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfToday(),
    end: startOfToday(),
    option: "today",
  });

  const { data: stats, isLoading: statsLoading } = useDashboardStats(
    user?.branch_id || null,
    dateRange
  );
  const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders(
    user?.branch_id || null
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoized refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [queryClient]);

  // Simple pull to refresh - only triggers on actual pull, doesn't block scrolling
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let touchStartY = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      touchEndY = e.changedTouches[0].clientY;
      const pullDistance = touchEndY - touchStartY;

      // Only refresh if pulled down more than 100px from the very top
      if (pullDistance > 100 && window.scrollY === 0) {
        handleRefresh();
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleRefresh]);

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-full">
      {/* Pull to Refresh Indicator */}
      {isRefreshing && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0b63ff]" />
        </div>
      )}

      {/* Header with Date Range Picker */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-gray-200">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0f1724]">Dashboard</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats Cards - Mobile: Stacked, Desktop: 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Orders */}
        {statsLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <StatCard
            title="Active Orders"
            value={stats?.active || 0}
            icon={ShoppingBag}
            borderColor="border-l-green-500"
            iconColor="text-green-500"
          />
        )}

        {/* Pending Return */}
        {statsLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <StatCard
            title="Pending Return"
            value={stats?.pending_return || 0}
            icon={AlertCircle}
            borderColor="border-l-red-500"
            bgColor="bg-red-50"
            textColor="text-red-600"
            iconColor="text-red-500"
            blinking={(stats?.pending_return || 0) > 0}
          />
        )}

        {/* Today Collection */}
        {statsLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <StatCard
            title="Today Collection"
            value={formatCurrency(stats?.today_collection || 0)}
            icon={IndianRupee}
            borderColor="border-l-[#0b63ff]"
            bgColor="bg-[#0b63ff]/5"
            textColor="text-[#0b63ff]"
            iconColor="text-[#0b63ff]"
          />
        )}

        {/* Total Completed Today */}
        {statsLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <StatCard
            title="Total Completed Today"
            value={stats?.completed || 0}
            icon={CheckCircle}
            borderColor="border-l-gray-500"
            bgColor="bg-gray-50"
            textColor="text-gray-600"
            iconColor="text-gray-500"
          />
        )}
      </div>

      {/* Quick Actions - Mobile: Stacked, Desktop: Row */}
      <div className="flex flex-col md:flex-row gap-3">
        <Link href="/orders/new" className="flex-1">
          <Button className="w-full h-9 bg-[#0b63ff] hover:bg-[#0a5ce6] text-white text-sm font-medium rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </Link>
        <Link href="/orders" className="flex-1">
          <Button
            variant="outline"
            className="w-full h-9 border-[#0b63ff] text-[#0b63ff] hover:bg-[#0b63ff] hover:text-white text-sm font-medium rounded-lg transition-colors"
          >
            View All Orders
          </Button>
        </Link>
      </div>

      {/* Recent Activity Timeline */}
      <div>
        <h2 className="text-xl font-bold text-[#0f1724] mb-4">Recent Activity</h2>
        {ordersLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <RecentActivity orders={recentOrders || []} />
        )}
      </div>

      {/* Floating Action Button - Mobile Only */}
      <FloatingActionButton href="/orders/new" />
      
      {/* Scroll to Top Button - Mobile Only */}
      <ScrollToTop />
    </div>
  );
}
