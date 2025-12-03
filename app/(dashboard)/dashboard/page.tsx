"use client";

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
  ArrowRight,
  Sparkles,
  Zap
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
    start: subDays(startOfToday(), 365 * 2),
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [queryClient]);

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
      <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb] pb-24">
        {/* Premium Background Pattern */}
        <div className="fixed inset-0 -z-10 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(39,52,146,0.05),transparent_50%)]" />
        </div>

        <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto relative">
          {/* Pull to Refresh Indicator */}
          {isRefreshing && (
            <div className="flex justify-center py-2 animate-fade-in">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#273492]" />
            </div>
          )}

          {/* Premium Modern Header - Shopify/Flipkart Style */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200/60">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-[#273492] to-gray-900 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <Sparkles className="h-6 w-6 text-[#273492] animate-pulse" />
              </div>
              <p className="text-sm md:text-base text-gray-500 font-medium">
                {isSuperAdmin 
                  ? "Complete overview of all branches and operations" 
                  : isBranchAdmin 
                  ? `Real-time overview of ${user?.branch?.name || "your branch"}` 
                  : "Real-time overview of your rental business"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>

          {/* Error Display */}
          {statsError && (
            <Card className="p-4 bg-red-50 border-red-200 animate-fade-in">
              <p className="text-red-800 text-sm font-medium mb-1">Error loading dashboard statistics</p>
              <p className="text-red-600 text-xs">{statsError.message || "Please refresh the page"}</p>
            </Card>
          )}
          {!user?.branch_id && (
            <Card className="p-4 bg-yellow-50 border-yellow-200 animate-fade-in">
              <p className="text-yellow-800 text-sm">No branch assigned. Please contact your administrator.</p>
            </Card>
          )}

          {/* Operational Overview - Premium Cards */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#273492]" />
                Operational Overview
              </h2>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {getDateRangeLabel()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {statsLoading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-xl shimmer-premium" />
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    title={dateRange.option === "alltime" || dateRange.option === "clear"
                      ? "Scheduled Orders"
                      : dateRange.option === "today"
                      ? "Scheduled Today"
                      : "Scheduled Orders"}
                    value={stats?.scheduled_today || 0}
                    icon={Calendar}
                    variant="primary"
                    href={`/orders?status=scheduled&dateOption=${dateRange.option}`}
                    blinking={(stats?.scheduled_today || 0) > 0}
                    index={0}
                  />
                  <StatCard
                    title="Ongoing Rentals"
                    value={stats?.ongoing || 0}
                    icon={ShoppingBag}
                    variant="success"
                    href={`/orders?status=active&dateOption=${dateRange.option}`}
                    index={1}
                  />
                  <StatCard
                    title="Late Returns"
                    value={stats?.late_returns || 0}
                    icon={AlertCircle}
                    variant="danger"
                    href={`/orders?status=late&dateOption=${dateRange.option}`}
                    blinking={(stats?.late_returns || 0) > 0}
                    index={2}
                  />
                  <StatCard
                    title="Partial Returns"
                    value={stats?.partial_returns || 0}
                    icon={Package}
                    variant="warning"
                    href={`/orders?status=partially_returned&dateOption=${dateRange.option}`}
                    blinking={(stats?.partial_returns || 0) > 0}
                    index={3}
                  />
                </>
              )}
            </div>
          </div>

          {/* Business Metrics - Premium Cards */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#273492]" />
                Business Metrics
              </h2>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {getDateRangeLabel()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {statsLoading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-xl shimmer-premium" />
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    title="Total Orders"
                    value={stats?.total_orders || 0}
                    icon={ShoppingBag}
                    variant="default"
                    href={`/orders?dateOption=${dateRange.option}`}
                    index={4}
                  />
                  <StatCard
                    title="Total Completed"
                    value={stats?.total_completed || 0}
                    icon={CheckCircle}
                    variant="success"
                    href={`/orders?status=completed&dateOption=${dateRange.option}`}
                    index={5}
                  />
                  <StatCard
                    title="Total Revenue"
                    value={formatCurrencyCompact(stats?.total_revenue || 0)}
                    icon={IndianRupee}
                    variant="primary"
                    index={6}
                  />
                  <StatCard
                    title="Total Customers"
                    value={stats?.total_customers || 0}
                    icon={Users}
                    variant="default"
                    href="/customers"
                    index={7}
                  />
                </>
              )}
            </div>
          </div>

          {/* Today's Activity - Premium Cards */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#273492]" />
                Today's Activity
              </h2>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Today
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {statsLoading ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-xl shimmer-premium" />
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    title="Today's Collection"
                    value={formatCurrencyCompact(stats?.today_collection || 0)}
                    icon={IndianRupee}
                    variant="primary"
                    badge="Today"
                    index={8}
                  />
                  <StatCard
                    title="Today's Completed"
                    value={stats?.today_completed || 0}
                    icon={CheckCircle}
                    variant="success"
                    badge="Today"
                    index={9}
                  />
                  <StatCard
                    title="Today's New Orders"
                    value={stats?.today_new_orders || 0}
                    icon={Plus}
                    variant="primary"
                    badge="Today"
                    index={10}
                  />
                </>
              )}
            </div>
          </div>

          {/* Quick Actions - Premium Design */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/orders/new" className="flex-1 group">
              <Button 
                variant="default" 
                size="lg" 
                className="w-full h-14 text-base font-semibold premium-hover bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                New Order
              </Button>
            </Link>
            <Link href="/orders" className="flex-1 group">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 text-base font-semibold premium-hover border-2 hover:border-[#273492] hover:bg-[#273492]/5"
              >
                View All Orders
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </Link>
          </div>

          {/* Recent Activity - Premium Design */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#273492]" />
                Recent Activity
              </h2>
              <Link 
                href="/orders" 
                className="text-sm font-semibold text-[#273492] hover:text-[#1f2a7a] transition-colors flex items-center gap-1 group"
              >
                View all
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
            {ordersLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl shimmer-premium" />
                ))}
              </div>
            ) : (
              <RecentActivity orders={recentOrders || []} />
            )}
          </div>

          <FloatingActionButton href="/orders/new" />
          <ScrollToTop />
        </div>
      </div>
    </RouteGuard>
  );
}
