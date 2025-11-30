"use client";

// Force dynamic for realtime (as per requirements)
export const dynamic = 'force-dynamic';

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Package,
  Play,
  AlertTriangle,
  RefreshCw,
  ArrowLeftCircle,
  Phone,
  Eye,
  Edit,
  Check,
  Download,
  Plus,
  Calendar,
  List,
  PlayCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useOrders, useOrdersInfinite, useUpdateOrderStatus } from "@/lib/queries/orders";
import { VirtualizedTable } from "@/components/orders/virtualized-table";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { OrdersHeader } from "@/components/layout/orders-header";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { getOrderStatus, formatCurrency, isOrderLate, isBooking } from "@/lib/utils/date";
import { differenceInHours, differenceInDays, differenceInMinutes, format, startOfToday, endOfToday, subDays } from "date-fns";
import { OrderCard } from "@/components/orders/order-card";
import { useQueryClient } from "@tanstack/react-query";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Menu } from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { showToast } = useToast();
  const updateStatusMutation = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // State
  const [activeTab, setActiveTab] = useState<"all" | "scheduled" | "ongoing" | "late" | "returned" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Debounce: 300ms as per requirements for search/filters
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(startOfToday(), 365), // 1 year ago for "All Time"
    end: endOfToday(),
    option: "clear", // Default to "All Time"
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const pageSize = 20;

  // Map tab to filter status
  const statusFilter = useMemo(() => {
    if (activeTab === "all") return "all";
    if (activeTab === "scheduled") return "all"; // Will filter client-side
    if (activeTab === "ongoing") return "active";
    if (activeTab === "late") return "all"; // Changed to "all" - filter client-side (late orders can have "active" status)
    if (activeTab === "returned") return "completed";
    if (activeTab === "cancelled") return "cancelled"; // Filter cancelled orders
    return "all";
  }, [activeTab]);

  // Use infinite query for optimized performance (RPC + virtualization)
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useOrdersInfinite(
    user?.branch_id || null,
    {
      status: statusFilter,
      dateRange: dateRange,
      // Search is client-side only for better performance
    }
  );

  // Flatten infinite query pages
  const allOrdersFromServer = useMemo(() => {
    return infiniteData?.pages.flatMap((page) => page.data) || [];
  }, [infiniteData]);

  // Helper function to check if order can be cancelled
  // Only scheduled orders can be cancelled, and only within 5 minutes of creation
  const canCancelOrder = useCallback((order: any): boolean => {
    // Only scheduled orders can be cancelled
    const startDate = (order as any).start_datetime || order.start_date;
    const isFutureBooking = isBooking(startDate);
    
    if (!isFutureBooking || order.status === "completed" || order.status === "cancelled") {
      return false;
    }
    
    // Check if order was created within last 5 minutes
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const minutesSinceCreation = differenceInMinutes(now, createdAt);
    
    return minutesSinceCreation <= 5;
  }, []);

  // Ultra-optimized category calculation - memoized date parsing for performance
  const getOrderCategory = useCallback((order: any): "scheduled" | "ongoing" | "late" | "returned" | "cancelled" => {
    // Fast path: Check status first (most common filter)
    const status = order.status;
    if (status === "cancelled") return "cancelled";
    if (status === "completed") return "returned";
    
    // Parse dates once and reuse
    const startDate = (order as any).start_datetime || order.start_date;
    const endDate = (order as any).end_datetime || order.end_date;
    
    // Cache date objects to avoid repeated parsing
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    // Optimized date checks (single pass)
    const isFutureBooking = start > now;
    const isLate = end < now && status !== "completed" && status !== "cancelled";
    
    // Priority-based return (early exits for performance)
    if (isLate) return "late";
    if (isFutureBooking) return "scheduled";
    if (status === "active") return "ongoing";
    
    return "ongoing";
  }, []);

  // Ultra-fast single-pass filtering: Combine search + tab filtering in one loop
  // Pre-compute categories to avoid recalculating - O(n) instead of O(2n)
  const orders = useMemo(() => {
    if (!allOrdersFromServer.length) return [];
    
    const searchLower = debouncedSearch.trim().toLowerCase();
    const hasSearch = searchLower.length > 0;
    const isAllTab = activeTab === "all";
    
    // Single-pass filtering for maximum performance
    const result: typeof allOrdersFromServer = [];
    
    for (let i = 0; i < allOrdersFromServer.length; i++) {
      const order = allOrdersFromServer[i];
      
      // Search filter (client-side for comprehensive search)
      if (hasSearch) {
        const invoice = order.invoice_number?.toLowerCase() || "";
        const name = order.customer?.name?.toLowerCase() || "";
        const phone = order.customer?.phone?.toLowerCase() || "";
        const customerNumber = order.customer?.customer_number?.toLowerCase() || "";
        
        if (!invoice.includes(searchLower) && 
            !name.includes(searchLower) && 
            !phone.includes(searchLower) &&
            !customerNumber.includes(searchLower)) {
          continue;
        }
      }
      
      // Tab filter (if not "all")
      if (!isAllTab) {
        const category = getOrderCategory(order);
        if (category !== activeTab) {
          continue;
        }
      }
      
      result.push(order);
    }
    
    return result;
  }, [allOrdersFromServer, activeTab, debouncedSearch, getOrderCategory]);

  // Calculate stats - each order counted in exactly ONE category
  const stats = useMemo(() => {
    if (!allOrdersFromServer.length) {
      return { total: 0, scheduled: 0, ongoing: 0, late: 0, returned: 0, cancelled: 0 };
    }
    
    let ongoing = 0;
    let late = 0;
    let returned = 0;
    let scheduled = 0;
    let cancelled = 0;

    // Single pass through orders - optimized counting
    for (let i = 0; i < allOrdersFromServer.length; i++) {
      const category = getOrderCategory(allOrdersFromServer[i]);
      switch (category) {
        case "cancelled": cancelled++; break;
        case "returned": returned++; break;
        case "late": late++; break;
        case "scheduled": scheduled++; break;
        case "ongoing": ongoing++; break;
      }
    }

    return {
      total: infiniteData?.pages[0]?.total || allOrdersFromServer.length,
      scheduled,
      ongoing,
      late,
      returned,
      cancelled,
    };
  }, [allOrdersFromServer, infiniteData, getOrderCategory]);

  // Handle mark returned
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

  // Handle cancel order
  const handleCancelOrder = useCallback(async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        status: "cancelled",
      });
      showToast("Order cancelled successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to cancel order", "error");
    }
  }, [updateStatusMutation, showToast]);

  // Format phone number
  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length >= 10) {
      return `+91 ${cleaned.slice(0, 2)}...${cleaned.slice(-3)}`;
    }
    return phone;
  };

  // Calculate duration
  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = differenceInDays(end, start);
    const totalHours = differenceInHours(end, start);
    const days = Math.max(1, totalDays);
    const hours = totalHours % 24;
    return { days, hours };
  };

  // Get order items count
  const getItemsCount = (order: any) => {
    if (order.items && Array.isArray(order.items)) {
      return order.items.length;
    }
    return 0;
  };

  // Bulk select
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)));
    }
  };

  // Export CSV
  const handleExportCSV = useCallback(() => {
    const headers = ["Order #", "Customer", "Phone", "Start Date", "End Date", "Status", "Amount Due"];
    const rows = orders.map((order) => {
      const status = getOrderStatus(order.start_date, order.end_date, order.status);
      return [
        order.invoice_number,
        order.customer?.name || "Unknown",
        order.customer?.phone || "",
        format(new Date((order as any).start_datetime || order.start_date), "dd MMM yyyy HH:mm"),
        format(new Date((order as any).end_datetime || order.end_date), "dd MMM yyyy HH:mm"),
        status,
        order.total_amount.toString(),
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported successfully", "success");
  }, [orders, showToast]);

  // Pull to refresh
  const pullStartRef = useRef<number>(0);
  const pullDistanceRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector('main[data-scroll-container="true"]') as HTMLElement;
    if (!scrollContainer) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (scrollContainer.scrollTop === 0) {
        pullStartRef.current = e.touches[0].clientY;
        isPullingRef.current = false;
      } else {
        pullStartRef.current = 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pullStartRef.current === 0 || scrollContainer.scrollTop > 0) return;
      const currentY = e.touches[0].clientY;
      pullDistanceRef.current = currentY - pullStartRef.current;
      if (pullDistanceRef.current > 50) {
        isPullingRef.current = true;
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistanceRef.current > 80 && scrollContainer.scrollTop === 0 && isPullingRef.current) {
        setIsRefreshing(true);
        try {
          await queryClient.invalidateQueries({ queryKey: ["orders"] });
        } finally {
          setTimeout(() => setIsRefreshing(false), 500);
        }
      }
      pullStartRef.current = 0;
      pullDistanceRef.current = 0;
      isPullingRef.current = false;
    };

    scrollContainer.addEventListener("touchstart", handleTouchStart, { passive: true });
    scrollContainer.addEventListener("touchmove", handleTouchMove, { passive: true });
    scrollContainer.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      scrollContainer.removeEventListener("touchstart", handleTouchStart);
      scrollContainer.removeEventListener("touchmove", handleTouchMove);
      scrollContainer.removeEventListener("touchend", handleTouchEnd);
    };
  }, [queryClient]);

  return (
    <>
      <MobileSidebar open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen} />
      
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Hamburger */}
        <div className="md:hidden fixed top-0 left-0 z-30 p-2 bg-white border-b border-transparent">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileSidebarOpen(true)}
            className="h-10 w-10 p-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Header */}
        <OrdersHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewOrder={() => router.push("/orders/new")}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        {/* Main Content */}
        <div className="px-4 py-4">
          {/* Tabs - Scrollable on Mobile */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-4">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="gap-2 min-w-max md:min-w-0">
                <TabsTrigger value="all" className="gap-1.5 whitespace-nowrap">
                  <List className="h-3.5 w-3.5" />
                  All
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="gap-1.5 whitespace-nowrap">
                  <Calendar className="h-3.5 w-3.5" />
                  Scheduled
                </TabsTrigger>
                <TabsTrigger value="ongoing" className="gap-1.5 whitespace-nowrap">
                  <Play className="h-3.5 w-3.5" />
                  Ongoing
                </TabsTrigger>
                <TabsTrigger value="late" className={`gap-1.5 whitespace-nowrap ${stats.late > 0 ? "text-red-600" : ""}`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Late
                </TabsTrigger>
                <TabsTrigger value="returned" className="gap-1.5 whitespace-nowrap">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Returned
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="gap-1.5 whitespace-nowrap">
                  <X className="h-3.5 w-3.5" />
                  Cancelled
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          {/* Stats Row - Scrollable on Mobile */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4">
            <div className="flex items-center gap-2 h-8 min-w-max md:min-w-0 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-1 h-8 border-gray-200 whitespace-nowrap">
                <Package className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">{stats.total} total</span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-1 h-8 border-gray-200 whitespace-nowrap">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{stats.scheduled} scheduled</span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-1 h-8 border-gray-200 whitespace-nowrap">
                <Play className="h-4 w-4 text-[#f59e0b]" />
                <span className="text-sm font-medium">{stats.ongoing} ongoing</span>
              </Badge>
              <Badge variant="outline" className={`flex items-center gap-1.5 px-2 py-1 h-8 border-gray-200 whitespace-nowrap ${stats.late > 0 ? "border-red-200" : ""}`}>
                <AlertTriangle className={`h-4 w-4 ${stats.late > 0 ? "text-red-600" : "text-gray-600"}`} />
                <span className={`text-sm font-medium ${stats.late > 0 ? "text-red-600" : ""}`}>{stats.late} late</span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-1 h-8 border-gray-200 whitespace-nowrap">
                <X className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{stats.cancelled} cancelled</span>
              </Badge>
            </div>
          </div>

          {/* Pull to Refresh Indicator */}
          {isRefreshing && (
            <div className="flex justify-center py-2 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0b63ff]" />
            </div>
          )}

          {/* Error State */}
          {error && !isInitialLoading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
              <p className="text-red-600 font-medium mb-2">Failed to load orders</p>
              <p className="text-sm text-red-500 mb-4">Please check your connection and try again</p>
              <Button
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["orders"] })}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Table Structure - Always render immediately for LCP optimization */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order & Customer</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Loading State - Skeletons */}
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : !error && orders.length > 0 ? (
                  // Render actual orders
                  orders.length > 10 ? (
                    // Virtualized for >10 rows
                    <VirtualizedTable
                      orders={orders}
                      height={400}
                      rowHeight={72}
                      renderRow={(order, index) => {
                        const startDate = (order as any).start_datetime || order.start_date;
                        const endDate = (order as any).end_datetime || order.end_date;
                        const orderCategory = getOrderCategory(order);
                        const duration = getDuration(startDate, endDate);
                        const itemsCount = getItemsCount(order);

                        return (
                          <>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/orders/${order.id}`}
                                    className="font-semibold text-sm text-gray-900 hover:text-[#0b63ff]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    #{order.invoice_number}
                                  </Link>
                                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 border-gray-200">
                                    {itemsCount} {itemsCount === 1 ? "item" : "items"}
                                  </Badge>
                                </div>
                                <div className="font-medium text-sm text-gray-900">{order.customer?.name || "Unknown"}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <div className="text-sm text-gray-900 tabular-nums">
                                  From {format(new Date(startDate), "dd MMM, HH:mm")} to {format(new Date(endDate), "dd MMM, HH:mm")}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Duration: {duration.days} day{duration.days !== 1 ? "s" : ""} {duration.hours} hour{duration.hours !== 1 ? "s" : ""}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {orderCategory === "cancelled" ? (
                                <Badge className="bg-gray-500 text-white flex items-center gap-1 w-fit">
                                  <AlertTriangle className="h-3 w-3" />
                                  Cancelled
                                </Badge>
                              ) : orderCategory === "scheduled" ? (
                                <Badge className="bg-[#9ca3af] text-white flex items-center gap-1 w-fit">
                                  <Calendar className="h-3 w-3" />
                                  Scheduled
                                </Badge>
                              ) : orderCategory === "late" ? (
                                <Badge className="bg-[#ef4444] text-white flex items-center gap-1 w-fit">
                                  <AlertTriangle className="h-3 w-3" />
                                  Late
                                </Badge>
                              ) : orderCategory === "ongoing" ? (
                                <Badge className="bg-[#f59e0b] text-white flex items-center gap-1 w-fit">
                                  <PlayCircle className="h-3 w-3" />
                                  Ongoing
                                </Badge>
                              ) : (
                                <Badge className="bg-[#3b82f6] text-white flex items-center gap-1 w-fit">
                                  <CheckCircle className="h-3 w-3" />
                                  Returned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`tel:${order.customer?.phone || ""}`}
                                className="text-sm text-gray-900 hover:text-[#0b63ff] flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3.5 w-3.5 text-gray-500" />
                                <span className="tabular-nums font-semibold">{order.customer?.phone || "N/A"}</span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2 justify-end">
                                {canCancelOrder(order) && (
                                  <Tooltip content="Cancel Order">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCancelOrder(order.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </Tooltip>
                                )}
                                {(orderCategory === "ongoing" || orderCategory === "late") && (
                                  <Tooltip content="Mark as Returned">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMarkReturned(order.id)}
                                      className="h-8 w-8 p-0 text-[#10b981] hover:text-[#10b981] hover:bg-green-50"
                                    >
                                      <ArrowLeftCircle className="h-4 w-4" />
                                    </Button>
                                  </Tooltip>
                                )}
                                <Tooltip content="View Details">
                                  <Link href={`/orders/${order.id}`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </>
                        );
                      }}
                    />
                  ) : (
                    // Regular table for <=10 rows
                    orders.map((order) => {
                      const startDate = (order as any).start_datetime || order.start_date;
                      const endDate = (order as any).end_datetime || order.end_date;
                      const orderCategory = getOrderCategory(order);
                      const duration = getDuration(startDate, endDate);
                      const itemsCount = getItemsCount(order);

                      return (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button, a')) return;
                            router.push(`/orders/${order.id}`);
                          }}
                        >
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/orders/${order.id}`}
                                  className="font-semibold text-sm text-gray-900 hover:text-[#0b63ff]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  #{order.invoice_number}
                                </Link>
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 border-gray-200">
                                  {itemsCount} {itemsCount === 1 ? "item" : "items"}
                                </Badge>
                              </div>
                              <div className="font-medium text-sm text-gray-900">{order.customer?.name || "Unknown"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <div className="text-sm text-gray-900 tabular-nums">
                                From {format(new Date(startDate), "dd MMM, HH:mm")} to {format(new Date(endDate), "dd MMM, HH:mm")}
                              </div>
                              <div className="text-xs text-gray-500">
                                Duration: {duration.days} day{duration.days !== 1 ? "s" : ""} {duration.hours} hour{duration.hours !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {orderCategory === "cancelled" ? (
                              <Badge className="bg-gray-500 text-white flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Cancelled
                              </Badge>
                            ) : orderCategory === "scheduled" ? (
                              <Badge className="bg-[#9ca3af] text-white flex items-center gap-1 w-fit">
                                <Calendar className="h-3 w-3" />
                                Scheduled
                              </Badge>
                            ) : orderCategory === "late" ? (
                              <Badge className="bg-[#ef4444] text-white flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Late
                              </Badge>
                            ) : orderCategory === "ongoing" ? (
                              <Badge className="bg-[#f59e0b] text-white flex items-center gap-1 w-fit">
                                <PlayCircle className="h-3 w-3" />
                                Ongoing
                              </Badge>
                            ) : (
                              <Badge className="bg-[#3b82f6] text-white flex items-center gap-1 w-fit">
                                <CheckCircle className="h-3 w-3" />
                                Returned
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`tel:${order.customer?.phone || ""}`}
                              className="text-sm text-gray-900 hover:text-[#0b63ff] flex items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3.5 w-3.5 text-gray-500" />
                              <span className="tabular-nums font-semibold">{order.customer?.phone || "N/A"}</span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 justify-end">
                              {canCancelOrder(order) && (
                                <Tooltip content="Cancel Order">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                              )}
                              {(orderCategory === "ongoing" || orderCategory === "late") && (
                                <Tooltip content="Mark as Returned">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkReturned(order.id)}
                                    className="h-8 w-8 p-0 text-[#10b981] hover:text-[#10b981] hover:bg-green-50"
                                  >
                                    <ArrowLeftCircle className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                              )}
                              <Tooltip content="View Details">
                                <Link href={`/orders/${order.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mt-4">
              <p className="text-red-600 font-medium mb-2">Failed to load orders</p>
              <p className="text-sm text-red-500 mb-4">Please check your connection and try again</p>
              <Button
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["orders"] })}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && orders.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200 mt-4">
              <p className="text-gray-500 text-lg mb-2">No orders found</p>
              <p className="text-gray-400 text-sm mb-6">Create your first order to get started</p>
              <Button
                onClick={() => router.push("/orders/new")}
                className="bg-[#0b63ff] hover:bg-[#0a5ce6] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
          )}


          {/* Mobile: Cards */}
          {!isLoading && !error && orders.length > 0 && (
            <div className="md:hidden space-y-3">
              {orders.map((order) => {
                const startDate = (order as any).start_datetime || order.start_date;
                return (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onMarkReturned={handleMarkReturned}
                    onCancel={handleCancelOrder}
                    canCancel={canCancelOrder(order)}
                  />
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isInitialLoading && !error && orders.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 text-lg mb-2">No orders?</p>
              <p className="text-gray-400 text-sm mb-6">Create your first order to get started</p>
              <Button
                onClick={() => router.push("/orders/new")}
                className="bg-[#0b63ff] hover:bg-[#0a5ce6] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedOrders.size > 0 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {selectedOrders.size} selected
              </span>
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedOrders(new Set())}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Infinite Scroll Load More */}
          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="h-8 px-4"
              >
                {isFetchingNextPage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0b63ff] mr-2" />
                    Loading...
                  </>
                ) : (
                  "Load More Orders"
                )}
              </Button>
            </div>
          )}

          {/* Orders Count */}
          {orders.length > 0 && (
            <div className="mt-4 text-center text-sm text-[#6b7280]">
              Showing {orders.length} of {stats.total} orders
              {debouncedSearch && ` (filtered)`}
            </div>
          )}
        </div>

        {/* Mobile Floating Action Button */}
        <div className="md:hidden fixed bottom-20 right-4 z-30">
          <Button
            onClick={() => router.push("/orders/new")}
            className="h-14 w-14 rounded-full bg-[#0b63ff] hover:bg-[#0a5ce6] text-white shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </>
  );
}
