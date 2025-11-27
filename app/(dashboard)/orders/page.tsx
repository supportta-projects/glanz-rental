"use client";

import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useOrders } from "@/lib/queries/orders";
import { useUpdateOrderStatus } from "@/lib/queries/orders";
import { formatDateTime, calculateDays, getOrderStatus, formatCurrency } from "@/lib/utils/date";
import { useToast } from "@/components/ui/toast";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { startOfToday, endOfToday } from "date-fns";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { OrderCard } from "@/components/orders/order-card";

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfToday(),
    end: endOfToday(),
    option: "today",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { data: ordersData, isLoading, error: ordersError } = useOrders(user?.branch_id || null, currentPage, pageSize);
  const orders = ordersData?.data || [];
  const updateStatusMutation = useUpdateOrderStatus();
  
  // Log error if query fails
  useEffect(() => {
    if (ordersError) {
      console.error("Error loading orders:", ordersError);
      showToast("Failed to load orders. Please refresh the page.", "error");
    }
  }, [ordersError, showToast]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartRef = useRef<number>(0);
  const pullDistanceRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);

  // Pull to refresh handler - attaches to the actual scroll container from layout
  useEffect(() => {
    // Find the actual scroll container (main element from layout)
    const scrollContainer = document.querySelector('main[data-scroll-container="true"]') as HTMLElement;
    if (!scrollContainer) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only enable pull-to-refresh when at the top of the scroll container
      if (scrollContainer.scrollTop === 0) {
        pullStartRef.current = e.touches[0].clientY;
        isPullingRef.current = false;
      } else {
        pullStartRef.current = 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Only handle if we started at the top
      if (pullStartRef.current === 0 || scrollContainer.scrollTop > 0) {
        return;
      }

      const currentY = e.touches[0].clientY;
      pullDistanceRef.current = currentY - pullStartRef.current;

      // Only show pull-to-refresh if pulling down significantly
      if (pullDistanceRef.current > 50) {
        isPullingRef.current = true;
      }
    };

    const handleTouchEnd = async () => {
      // Only trigger refresh if we pulled down enough and were at the top
      if (pullDistanceRef.current > 80 && scrollContainer.scrollTop === 0 && isPullingRef.current) {
        setIsRefreshing(true);
        try {
          await queryClient.invalidateQueries({ queryKey: ["orders"] });
        } catch (error) {
          console.error("Error refreshing orders:", error);
        } finally {
          setTimeout(() => setIsRefreshing(false), 500);
        }
      }

      // Reset state
      pullStartRef.current = 0;
      pullDistanceRef.current = 0;
      isPullingRef.current = false;
    };

    // Use passive listeners for better performance - don't block scrolling
    scrollContainer.addEventListener("touchstart", handleTouchStart, { passive: true });
    scrollContainer.addEventListener("touchmove", handleTouchMove, { passive: true });
    scrollContainer.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      scrollContainer.removeEventListener("touchstart", handleTouchStart);
      scrollContainer.removeEventListener("touchmove", handleTouchMove);
      scrollContainer.removeEventListener("touchend", handleTouchEnd);
    };
  }, [queryClient]);

  const handleMarkReturned = useCallback(async (orderId: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        status: "completed",
      });
      showToast("Order marked as returned", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to update order", "error");
    }
  }, [updateStatusMutation, showToast]);

  // Memoize filtered orders to avoid recalculating on every render
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    const query = debouncedSearch.toLowerCase();
    
    return orders.filter((order) => {
      // Filter by status
      if (filter !== "all") {
        const status = getOrderStatus(order.start_date, order.end_date, order.status);
        if (filter === "active" && status !== "active") return false;
        if (filter === "pending" && status !== "pending_return") return false;
        if (filter === "completed" && status !== "completed") return false;
      }

      // Filter by search query
      if (query) {
        const matchesInvoice = order.invoice_number.toLowerCase().includes(query);
        const matchesCustomer = order.customer?.name?.toLowerCase().includes(query);
        const matchesPhone = order.customer?.phone?.includes(query);
        if (!matchesInvoice && !matchesCustomer && !matchesPhone) return false;
      }

      // Filter by date range
      const orderDate = new Date(order.created_at);
      if (orderDate < dateRange.start || orderDate > dateRange.end) {
        return false;
      }

      return true;
    });
  }, [orders, filter, debouncedSearch, dateRange]);

  // Helper function to scroll to top smoothly - memoized
  const scrollToTop = useCallback(() => {
    const scrollContainer = document.querySelector('main[data-scroll-container="true"]') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Pull to Refresh Indicator */}
      {isRefreshing && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500" />
        </div>
      )}

      {/* Header with Date Picker and Search */}
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Orders</h1>
        
        <div className="flex flex-col md:flex-row gap-4">
          <DateRangePicker value={dateRange} onChange={setDateRange} className="flex-1" />
          
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by invoice, customer, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-10 rounded-xl"
              />
            </div>
            
            {/* Create Order Button - Desktop Only */}
            <Button
              onClick={() => router.push("/orders/new")}
              className="hidden md:flex items-center gap-2 h-12 px-6 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
            >
              <Plus className="h-5 w-5" />
              <span>Create Order</span>
            </Button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(["all", "active", "pending", "completed"] as const).map((f) => (
            <Badge
              key={f}
              variant={filter === f ? "default" : "outline"}
              className={`px-4 py-2 cursor-pointer whitespace-nowrap ${
                filter === f ? "bg-sky-500 text-white" : ""
              }`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error State */}
      {ordersError && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-red-500 font-medium">Error loading orders</p>
          <p className="text-sm text-gray-400 mt-2">
            Please check your connection and try again
          </p>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["orders"] })}
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Orders List - Mobile: Cards, Desktop: Table */}
      {!isLoading && !ordersError && (
        <>
          <div className="space-y-4 md:hidden">
            {filteredOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No orders found</p>
              </Card>
            ) : (
              filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} onMarkReturned={handleMarkReturned} />
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Start Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      End Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const status = getOrderStatus(
                        order.start_date,
                        order.end_date,
                        order.status
                      );
                      const isPendingReturn = status === "pending_return";
                      const days = calculateDays(order.start_date, order.end_date);

                      return (
                        <tr
                          key={order.id}
                          className={`border-t ${
                            isPendingReturn ? "bg-red-50" : "bg-white"
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            {order.invoice_number}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {order.customer?.name || "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div>
                              <div className="font-medium">
                                {formatDateTime((order as any).start_datetime || order.start_date)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div>
                              <div className="font-medium">
                                {formatDateTime((order as any).end_datetime || order.end_date)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">
                            {formatCurrency(order.total_amount)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                status === "active"
                                  ? "bg-green-500"
                                  : status === "pending_return"
                                  ? "bg-red-500"
                                  : "bg-gray-500"
                              }
                            >
                              {status === "active"
                                ? "Active"
                                : status === "pending_return"
                                ? "Pending Return"
                                : "Completed"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Link href={`/orders/${order.id}`}>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                              {isPendingReturn && (
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => handleMarkReturned(order.id)}
                                >
                                  Mark Returned
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pagination */}
      {ordersData && ordersData.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t sticky bottom-0 bg-zinc-50 pb-4">
          <div className="text-sm text-gray-600 text-center sm:text-left">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, ordersData.total)} of {ordersData.total} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                scrollToTop();
              }}
              disabled={currentPage === 1 || isLoading}
              className="h-10 px-4 min-w-[100px]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm text-gray-600 px-3 font-medium">
              Page {currentPage} of {ordersData.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage((p) => Math.min(ordersData.totalPages, p + 1));
                scrollToTop();
              }}
              disabled={currentPage >= ordersData.totalPages || isLoading}
              className="h-10 px-4 min-w-[100px]"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile Only */}
      <FloatingActionButton href="/orders/new" />
    </div>
  );
}
