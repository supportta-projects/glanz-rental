"use client";

// Force dynamic for realtime (as per requirements)
export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  ShoppingBag, 
  AlertCircle, 
  IndianRupee, 
  CheckCircle, 
  Calendar,
  Clock,
  Package,
  Users,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useDashboardStats, useRecentOrders } from "@/lib/queries/dashboard";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/date";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { startOfToday, subDays, endOfToday } from "date-fns";
import { RouteGuard } from "@/components/auth/route-guard";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useUserStore();
  const queryClient = useQueryClient();
  
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(startOfToday(), 365 * 2), // 2 years ago
    end: endOfToday(),
    option: "alltime",
  });

  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats(
    user?.branch_id || null,
    dateRange
  );
  const { data: recentOrders, isLoading: ordersLoading, error: ordersError } = useRecentOrders(
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

  // Show different dashboard based on role
  const isSuperAdmin = user?.role === "super_admin";
  const isBranchAdmin = user?.role === "branch_admin";

  const getDateRangeLabel = () => {
    if (dateRange.option === "alltime" || dateRange.option === "clear") return "All Time";
    if (dateRange.option === "today") return "Today";
    if (dateRange.option === "yesterday") return "Yesterday";
    if (dateRange.option === "tomorrow") return "Tomorrow";
    if (dateRange.option === "thisweek") return "This Week";
    if (dateRange.option === "thismonth") return "This Month";
    return "Custom Range";
  };

  return (
    <RouteGuard allowedRoles={["super_admin", "branch_admin"]}>
      <div className="min-h-screen bg-[#f7f9fb] pb-24">
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
          {/* Pull to Refresh Indicator */}
          {isRefreshing && (
            <div className="flex justify-center py-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#273492]" />
            </div>
          )}

          {/* Modern Header - Shopify-like */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                {isSuperAdmin ? "Dashboard" : isBranchAdmin ? "Dashboard" : "Dashboard"}
              </h1>
              <p className="text-sm text-gray-500">
                {isSuperAdmin 
                  ? "Complete overview of all branches and operations" 
                  : isBranchAdmin 
                  ? `Real-time overview of ${user?.branch?.name || "your branch"}` 
                  : "Real-time overview of your rental business"}
              </p>
            </div>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          {/* Error Display */}
          {statsError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-800 text-sm font-medium mb-1">Error loading dashboard statistics</p>
              <p className="text-red-600 text-xs">{statsError.message || "Please refresh the page"}</p>
            </Card>
          )}
          {!user?.branch_id && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <p className="text-yellow-800 text-sm">No branch assigned. Please contact your administrator.</p>
            </Card>
          )}
          {!statsLoading && !stats && !statsError && (
            <Card className="p-4 bg-gray-50 border-gray-200">
              <p className="text-gray-600 text-sm">No data available. Please check your database connection.</p>
            </Card>
          )}

          {/* Operational Overview - Clean Design */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Operational Overview</h2>
              <span className="text-xs text-gray-500 font-medium">{getDateRangeLabel()}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Scheduled Orders */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title={
                    dateRange.option === "alltime" || dateRange.option === "clear"
                      ? "Scheduled Orders"
                      : dateRange.option === "today"
                      ? "Scheduled Today"
                      : dateRange.option === "yesterday"
                      ? "Scheduled Yesterday"
                      : dateRange.option === "tomorrow"
                      ? "Scheduled Tomorrow"
                      : dateRange.option === "thisweek"
                      ? "Scheduled This Week"
                      : dateRange.option === "thismonth"
                      ? "Scheduled This Month"
                      : "Scheduled Orders"
                  }
                  value={stats?.scheduled_today || 0}
                  icon={Calendar}
                  variant="primary"
                  href={`/orders?status=scheduled&dateOption=${dateRange.option}`}
                  blinking={(stats?.scheduled_today || 0) > 0}
                />
              )}

              {/* Ongoing Rentals */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title="Ongoing Rentals"
                  value={stats?.ongoing || 0}
                  icon={ShoppingBag}
                  variant="success"
                  href={`/orders?status=active&dateOption=${dateRange.option}`}
                />
              )}

              {/* Late Returns */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title="Late Returns"
                  value={stats?.late_returns || 0}
                  icon={AlertCircle}
                  variant="danger"
                  href={`/orders?status=late&dateOption=${dateRange.option}`}
                  blinking={(stats?.late_returns || 0) > 0}
                />
              )}

              {/* Partial Returns */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title="Partial Returns"
                  value={stats?.partial_returns || 0}
                  icon={Package}
                  variant="warning"
                  href={`/orders?status=partially_returned&dateOption=${dateRange.option}`}
                  blinking={(stats?.partial_returns || 0) > 0}
                />
              )}
            </div>
          </div>

          {/* Business Metrics - Clean Design */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Business Metrics</h2>
              <span className="text-xs text-gray-500 font-medium">{getDateRangeLabel()}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Orders */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title="Total Orders"
                  value={stats?.total_orders || 0}
                  icon={ShoppingBag}
                  variant="default"
                  href={`/orders?dateOption=${dateRange.option}`}
                />
              )}

              {/* Total Completed */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title="Total Completed"
                  value={stats?.total_completed || 0}
                  icon={CheckCircle}
                  variant="success"
                  href={`/orders?status=completed&dateOption=${dateRange.option}`}
                />
              )}

              {/* Total Revenue */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title="Total Revenue"
                  value={formatCurrencyCompact(stats?.total_revenue || 0)}
                  icon={IndianRupee}
                  variant="primary"
                />
              )}

              {/* Total Customers */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title="Total Customers"
                  value={stats?.total_customers || 0}
                  icon={Users}
                  variant="default"
                  href="/customers"
                />
              )}
            </div>
          </div>

          {/* Today's Activity - Clean Design */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Today's Activity</h2>
              <span className="text-xs text-gray-500 font-medium">Today</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Today's Collection */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title="Today's Collection"
                  value={formatCurrencyCompact(stats?.today_collection || 0)}
                  icon={IndianRupee}
                  variant="primary"
                  badge="Today"
                />
              )}

              {/* Today's Completed */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title="Today's Completed"
                  value={stats?.today_completed || 0}
                  icon={CheckCircle}
                  variant="success"
                  badge="Today"
                />
              )}

              {/* Today's New Orders */}
              {statsLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : (
                <StatCard
                  title="Today's New Orders"
                  value={stats?.today_new_orders || 0}
                  icon={Plus}
                  variant="primary"
                  badge="Today"
                />
              )}
            </div>
          </div>

          {/* Quick Actions - Modern Design */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/orders/new" className="flex-1">
              <Button variant="default" size="default" className="w-full h-11">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </Link>
            <Link href="/orders" className="flex-1">
              <Button
                variant="outline"
                size="default"
                className="w-full h-11"
              >
                View All Orders
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Recent Activity - Clean Design */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Link href="/orders" className="text-xs font-medium text-[#273492] hover:text-[#1f2a7a] transition-colors">
                View all
              </Link>
            </div>
            {ordersLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
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
      </div>
    </RouteGuard>
  );
}
