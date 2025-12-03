"use client";

// Force dynamic for realtime (as per requirements)
export const dynamic = 'force-dynamic';

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Search,
  Sparkles,
  Zap,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useOrders, useOrdersInfinite, useUpdateOrderStatus, useStartRental } from "@/lib/queries/orders";
import { useToast } from "@/components/ui/toast";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";
import { Button } from "@/components/ui/button";
import { StandardButton } from "@/components/shared/standard-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Pagination } from "@/components/shared";
import { getOrderStatus, formatCurrency, isOrderLate, isBooking } from "@/lib/utils/date";
import { differenceInHours, differenceInDays, differenceInMinutes, format, startOfToday, endOfToday, subDays, startOfWeek, startOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { OrderCard } from "@/components/orders/order-card";
import { useQueryClient } from "@tanstack/react-query";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Menu } from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUserStore();
  const { showToast } = useToast();
  const updateStatusMutation = useUpdateOrderStatus();
  const startRentalMutation = useStartRental();
  const queryClient = useQueryClient();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Subscribe to both orders and order_items for real-time updates
  useRealtimeSubscription("orders", user?.branch_id || null);
  useRealtimeSubscription("order_items", user?.branch_id || null);

  // Initialize activeTab from URL parameter if present
  const statusFromUrl = searchParams.get("status");
  const dateOptionFromUrl = searchParams.get("dateOption");
  
  const getInitialTab = (): "all" | "scheduled" | "ongoing" | "late" | "returned" | "partially_returned" | "cancelled" => {
    if (statusFromUrl === "scheduled") return "scheduled";
    if (statusFromUrl === "active") return "ongoing";
    if (statusFromUrl === "late") return "late";
    if (statusFromUrl === "completed") return "returned";
    if (statusFromUrl === "partially_returned") return "partially_returned";
    if (statusFromUrl === "cancelled") return "cancelled";
    return "all";
  };

  // Function to get initial date range based on URL parameter
  const getInitialDateRange = (): DateRange => {
    if (dateOptionFromUrl === "today") {
      return {
        start: startOfToday(),
        end: endOfToday(),
        option: "today",
      };
    }
    if (dateOptionFromUrl === "yesterday") {
      const yesterday = subDays(startOfToday(), 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
        option: "yesterday",
      };
    }
    if (dateOptionFromUrl === "thisweek") {
      return {
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfToday(),
        option: "thisweek",
      };
    }
    if (dateOptionFromUrl === "thismonth") {
      return {
        start: startOfMonth(new Date()),
        end: endOfToday(),
        option: "thismonth",
      };
    }
    if (dateOptionFromUrl === "custom") {
      // For custom, we'd need start/end dates in URL, but for now default to last 7 days
      return {
        start: startOfDay(subDays(startOfToday(), 6)),
        end: endOfToday(),
        option: "custom",
      };
    }
    if (dateOptionFromUrl === "alltime") {
      return {
        start: subDays(startOfToday(), 365 * 2),
        end: endOfToday(),
        option: "alltime",
      };
    }
    // Default to "All Time" if no date option specified
    return {
      start: subDays(startOfToday(), 365 * 2), // 2 years ago
      end: endOfToday(),
      option: "alltime",
    };
  };

  // State
  const [activeTab, setActiveTab] = useState<"all" | "scheduled" | "ongoing" | "late" | "returned" | "partially_returned" | "cancelled">(getInitialTab());

  // Update tab when URL parameter changes
  useEffect(() => {
    const newTab = getInitialTab();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFromUrl]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Debounce: 300ms as per requirements for search/filters
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange());

  // Update dateRange when URL parameter changes
  useEffect(() => {
    const newDateRange = getInitialDateRange();
    // Only update if the option actually changed to avoid unnecessary re-renders
    if (newDateRange.option !== dateRange.option || 
        newDateRange.start.getTime() !== dateRange.start.getTime() ||
        newDateRange.end.getTime() !== dateRange.end.getTime()) {
      setDateRange(newDateRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateOptionFromUrl]);
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
    if (activeTab === "partially_returned") return "partially_returned"; // Filter partially returned orders
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
      dateRange: {
        ...dateRange,
        option: dateRange.option, // Pass the option to the query
      },
      // Search is client-side only for better performance
    }
  );

  // Flatten infinite query pages
  const allOrdersFromServer = useMemo(() => {
    return infiniteData?.pages.flatMap((page) => page.data) || [];
  }, [infiniteData]);

  // Helper function to check if order can be cancelled
  // Scheduled orders: Can be cancelled anytime until they become ongoing
  // Ongoing orders: Can be cancelled only within 10 minutes of becoming active
  const canCancelOrder = useCallback((order: any): boolean => {
    const status = order.status;
    
    // Already cancelled or completed orders cannot be cancelled
    if (status === "cancelled" || status === "completed") {
      return false;
    }
    
    // Scheduled orders can be cancelled anytime (until they become ongoing)
    if (status === "scheduled") {
      return true;
    }
    
    // Ongoing orders can be cancelled only within 10 minutes of becoming active
    if (status === "active") {
      const createdAt = new Date(order.created_at);
      const now = new Date();
      const startDatetime = (order as any).start_datetime ? new Date((order as any).start_datetime) : null;
      
      // Determine when the order actually became active
      // For orders created directly as "active": use created_at (when order was created)
      // For scheduled orders that were started: use start_datetime (when "Start Rental" was clicked)
      // Rule: If start_datetime is significantly before created_at (more than 1 hour), 
      //       it means the order was created with a past start_date, so use created_at instead
      let activeSinceDate: Date;
      
      if (startDatetime) {
        const timeDiffBetweenStartAndCreated = Math.abs(startDatetime.getTime() - createdAt.getTime());
        const oneHourInMs = 60 * 60 * 1000;
        
        // If start_datetime is more than 1 hour before created_at, it means the order
        // was created with a start_date in the past, so use created_at instead
        if (startDatetime < createdAt && timeDiffBetweenStartAndCreated > oneHourInMs) {
          // Order was created with a past start_date - use created_at
          activeSinceDate = createdAt;
        } else if (startDatetime > createdAt) {
          // start_datetime is in the future (shouldn't happen for active orders) - use created_at
          activeSinceDate = createdAt;
        } else {
          // start_datetime is close to or equal to created_at - use start_datetime
          // This handles scheduled orders that were started via "Start Rental"
          activeSinceDate = startDatetime;
        }
      } else {
        // No start_datetime - use created_at
        activeSinceDate = createdAt;
      }
      
      // Calculate minutes since order became active
      const minutesSinceActive = differenceInMinutes(now, activeSinceDate);
      
      // Can cancel if less than 10 minutes since becoming active
      return minutesSinceActive <= 10;
    }
    
    // Other statuses (pending_return, partially_returned) cannot be cancelled
    return false;
  }, []);

  // Ultra-optimized category calculation - memoized date parsing for performance
  const getOrderCategory = useCallback((order: any): "scheduled" | "ongoing" | "late" | "returned" | "cancelled" | "partially_returned" => {
    // Fast path: Check status first (most common filter)
    const status = order.status;
    if (status === "cancelled") return "cancelled";
    if (status === "partially_returned") return "partially_returned";
    if (status === "completed") return "returned";
    
    // IMPORTANT: If status is "scheduled", always return "scheduled" regardless of date
    // Scheduled orders remain scheduled until explicitly started via "Start Rental" action
    if (status === "scheduled") {
      return "scheduled";
    }
    
    // Check if order has items with return status (for detecting partial returns)
    const items = order.items || [];
    if (items.length > 0) {
      const hasReturnedItems = items.some((item: any) => item.return_status === "returned");
      const hasNotReturnedItems = items.some((item: any) => 
        !item.return_status || item.return_status === "not_yet_returned"
      );
      const hasMissingItems = items.some((item: any) => item.return_status === "missing");
      
      // If some items are returned but not all, it's partially returned
      if (hasReturnedItems && (hasNotReturnedItems || hasMissingItems)) {
        return "partially_returned";
      }
    }
    
    // Parse dates once and reuse
    const startDate = (order as any).start_datetime || order.start_date;
    const endDate = (order as any).end_datetime || order.end_date;
    
    // Cache date objects to avoid repeated parsing
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    // Check if order is late (end date passed and not completed/cancelled/partially_returned)
    const isLate = end < now && status !== "completed" && status !== "cancelled" && status !== "partially_returned";
    
    // Priority-based return (early exits for performance)
    if (isLate) return "late";
    if (status === "active") return "ongoing";
    
    // Default to ongoing for safety
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

  // Paginate filtered orders
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return orders.slice(start, end);
  }, [orders, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(orders.length / pageSize);
  }, [orders.length, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch, dateRange]);

  // Calculate stats - each order counted in exactly ONE category
  const stats = useMemo(() => {
    if (!allOrdersFromServer.length) {
      return { total: 0, scheduled: 0, ongoing: 0, late: 0, returned: 0, partially_returned: 0, cancelled: 0 };
    }
    
    let ongoing = 0;
    let late = 0;
    let returned = 0;
    let scheduled = 0;
    let cancelled = 0;
    let partially_returned = 0;

    // Single pass through orders - optimized counting
    for (let i = 0; i < allOrdersFromServer.length; i++) {
      const category = getOrderCategory(allOrdersFromServer[i]);
      switch (category) {
        case "cancelled": cancelled++; break;
        case "returned": returned++; break;
        case "partially_returned": partially_returned++; break;
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
      partially_returned,
      cancelled,
    };
  }, [allOrdersFromServer, infiniteData, getOrderCategory]);


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

  // Handle Start Rental: Convert scheduled order to active
  const handleStartRental = useCallback(async (orderId: string) => {
    try {
      await startRentalMutation.mutateAsync(orderId);
      showToast("Rental started successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to start rental", "error");
    }
  }, [startRentalMutation, showToast]);

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
      
      <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb]">
        {/* Premium Background Pattern */}
        <div className="fixed inset-0 -z-10 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(39,52,146,0.05),transparent_50%)]" />
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden fixed top-0 left-0 z-30 p-2 bg-white/80 backdrop-blur-sm border-b border-gray-200/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileSidebarOpen(true)}
            className="h-10 w-10 p-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="px-4 md:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
          {/* Premium Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200/60">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-[#273492] to-gray-900 bg-clip-text text-transparent">
                  Orders
                </h1>
                <Sparkles className="h-6 w-6 text-[#273492] animate-pulse" />
              </div>
              <p className="text-sm md:text-base text-gray-500 font-medium">
                Manage and track all your rental orders
              </p>
            </div>
          </div>
          {/* Premium Search and Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Enhanced Search - Premium Shopify-style */}
            <div className="relative flex-1 w-full md:max-w-2xl">
              <div className="relative premium-hover">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none transition-colors duration-200 group-focus-within:text-[#273492]" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search orders, customers, invoice numbers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-12 h-12 w-full rounded-xl border-2 border-gray-200 bg-white/80 backdrop-blur-sm text-sm placeholder:text-gray-400 
                             focus:border-[#273492] focus:ring-4 focus:ring-[#273492]/10 focus:outline-none 
                             transition-all duration-300 shadow-sm hover:shadow-md hover:border-gray-300
                             font-medium premium-hover"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200 
                               focus:outline-none focus:ring-2 focus:ring-[#273492]/20 group"
                    aria-label="Clear search"
                    type="button"
                  >
                    <X className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>
                )}
                {!searchQuery && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 bg-gray-50 text-xs font-mono text-gray-500 shadow-sm">
                      <span className="text-[10px]">Ctrl</span>
                      <span>K</span>
                    </kbd>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Action Buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              <StandardButton
                onClick={() => router.push("/orders/new")}
                variant="default"
                icon={Plus}
                className="flex-shrink-0 premium-hover bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] shadow-lg hover:shadow-xl"
              >
                New Order
              </StandardButton>
            </div>
          </div>

          {/* Premium Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-4">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="gap-2 min-w-max md:min-w-0 bg-white/80 backdrop-blur-sm border border-gray-200/60 p-1 rounded-xl">
                <TabsTrigger value="all" className="gap-2 whitespace-nowrap premium-hover">
                  <List className="h-4 w-4" />
                  All
                  {stats.total > 0 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                      {stats.total}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="gap-2 whitespace-nowrap premium-hover">
                  <Calendar className="h-4 w-4" />
                  Scheduled
                  {stats.scheduled > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {stats.scheduled}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="ongoing" className="gap-2 whitespace-nowrap premium-hover">
                  <Play className="h-4 w-4" />
                  Ongoing
                  {stats.ongoing > 0 && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                      {stats.ongoing}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="late" className={`gap-2 whitespace-nowrap premium-hover ${stats.late > 0 ? "text-red-600" : ""}`}>
                  <AlertTriangle className="h-4 w-4" />
                  Late
                  {stats.late > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold pulse-glow">
                      {stats.late}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="returned" className="gap-2 whitespace-nowrap premium-hover">
                  <RefreshCw className="h-4 w-4" />
                  Returned
                  {stats.returned > 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      {stats.returned}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="partially_returned" className={`gap-2 whitespace-nowrap premium-hover ${stats.partially_returned > 0 ? "text-orange-600" : ""}`}>
                  <Package className="h-4 w-4" />
                  Partial
                  {stats.partially_returned > 0 && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                      {stats.partially_returned}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="gap-2 whitespace-nowrap premium-hover">
                  <X className="h-4 w-4" />
                  Cancelled
                  {stats.cancelled > 0 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                      {stats.cancelled}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          {/* Premium Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              { label: "Total", value: stats.total, icon: Package, color: "gray" },
              { label: "Scheduled", value: stats.scheduled, icon: Calendar, color: "blue" },
              { label: "Ongoing", value: stats.ongoing, icon: Play, color: "orange" },
              { label: "Late", value: stats.late, icon: AlertTriangle, color: "red", urgent: stats.late > 0 },
              { label: "Returned", value: stats.returned, icon: CheckCircle, color: "green" },
              { label: "Partial", value: stats.partially_returned, icon: Package, color: "orange" },
              { label: "Cancelled", value: stats.cancelled, icon: X, color: "gray" },
            ].map((stat, index) => (
              <Card
                key={stat.label}
                className={`p-4 rounded-xl border premium-hover ${
                  stat.urgent ? "border-red-200 bg-red-50/50 pulse-glow" : "border-gray-200 bg-white/80 backdrop-blur-sm"
                }`}
                style={{
                  animation: `fadeInUp 0.5s ease-out ${index * 0.05}s forwards`,
                  opacity: 0,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    stat.color === "red" ? "bg-red-100" :
                    stat.color === "orange" ? "bg-orange-100" :
                    stat.color === "green" ? "bg-green-100" :
                    stat.color === "blue" ? "bg-blue-100" :
                    "bg-gray-100"
                  }`}>
                    <stat.icon className={`h-4 w-4 ${
                      stat.color === "red" ? "text-red-600" :
                      stat.color === "orange" ? "text-orange-600" :
                      stat.color === "green" ? "text-green-600" :
                      stat.color === "blue" ? "text-blue-600" :
                      "text-gray-600"
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{stat.label}</p>
                    <p className={`text-xl font-bold ${
                      stat.urgent ? "text-red-600" : "text-gray-900"
                    }`}>{stat.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pull to Refresh Indicator */}
          {isRefreshing && (
            <div className="flex justify-center py-2 mb-4 animate-fade-in">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#273492]" />
            </div>
          )}

          {/* Premium Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/60 overflow-hidden shadow-lg">
            <Table>
              <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b-2 border-gray-200">
                <TableRow className="border-b border-gray-200 hover:bg-transparent">
                  <TableHead className="min-w-[200px] font-bold text-gray-900">Order & Customer</TableHead>
                  <TableHead className="min-w-[250px] font-bold text-gray-900">Schedule</TableHead>
                  <TableHead className="min-w-[120px] font-bold text-gray-900">Status</TableHead>
                  <TableHead className="min-w-[150px] font-bold text-gray-900">Phone Number</TableHead>
                  <TableHead className="min-w-[120px] font-bold text-gray-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Loading State - Skeletons */}
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`} className="border-b border-gray-200">
                      <TableCell>
                        <Skeleton className="h-6 w-32 shimmer-premium" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-48 shimmer-premium" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full shimmer-premium" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-28 shimmer-premium" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-24 shimmer-premium" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !error && paginatedOrders.length > 0 ? (
                  // Table rows with paginated orders - Premium with animations
                  paginatedOrders.map((order, index) => {
                      const startDate = (order as any).start_datetime || order.start_date;
                      const endDate = (order as any).end_datetime || order.end_date;
                      const orderCategory = getOrderCategory(order);
                      const duration = getDuration(startDate, endDate);
                      const itemsCount = getItemsCount(order);

                      return (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer border-b border-gray-200 premium-hover group"
                          style={{
                            animation: `fadeInUp 0.5s ease-out ${index * 0.03}s forwards`,
                            opacity: 0,
                          }}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button, a')) return;
                            router.push(`/orders/${order.id}`);
                          }}
                        >
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/orders/${order.id}`}
                                  className="font-bold text-sm text-gray-900 hover:text-[#273492] transition-colors duration-200 group-hover:translate-x-1 inline-block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  #{order.invoice_number}
                                </Link>
                                <Badge variant="outline" className="text-xs px-2 py-1 h-5 border-gray-200 bg-gray-50 font-semibold">
                                  {itemsCount} {itemsCount === 1 ? "item" : "items"}
                                </Badge>
                              </div>
                              <div className="font-semibold text-sm text-gray-900">{order.customer?.name || "Unknown"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-1">
                              <div className="text-sm text-gray-900 tabular-nums font-medium">
                                {format(new Date(startDate), "dd MMM, HH:mm")} → {format(new Date(endDate), "dd MMM, HH:mm")}
                              </div>
                              <div className="text-xs text-gray-500">
                                {duration.days} day{duration.days !== 1 ? "s" : ""} • {duration.hours} hour{duration.hours !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </TableCell>
                        <TableCell className="py-4 align-middle">
                          {orderCategory === "cancelled" ? (
                            <Badge className="bg-gray-500 text-white flex items-center gap-1.5 w-fit px-3 py-1.5 shadow-sm">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Cancelled
                            </Badge>
                          ) : orderCategory === "partially_returned" ? (
                            <Badge className="bg-orange-500 text-white flex items-center gap-1.5 w-fit px-3 py-1.5 shadow-sm">
                              <Package className="h-3.5 w-3.5" />
                              Partial
                            </Badge>
                          ) : orderCategory === "scheduled" ? (
                            <Badge className="bg-blue-500 text-white flex items-center gap-1.5 w-fit px-3 py-1.5 shadow-sm">
                              <Calendar className="h-3.5 w-3.5" />
                              Scheduled
                            </Badge>
                          ) : orderCategory === "late" ? (
                            <Badge className="bg-red-500 text-white flex items-center gap-1.5 w-fit px-3 py-1.5 shadow-sm pulse-glow">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Late
                            </Badge>
                          ) : orderCategory === "ongoing" ? (
                            <Badge className="bg-orange-500 text-white flex items-center gap-1.5 w-fit px-3 py-1.5 shadow-sm">
                              <PlayCircle className="h-3.5 w-3.5" />
                              Ongoing
                            </Badge>
                          ) : (
                            <Badge className="bg-[#273492] text-white flex items-center gap-1.5 w-fit px-3 py-1.5 shadow-sm">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Returned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 align-middle">
                          <Link
                            href={`tel:${order.customer?.phone || ""}`}
                            className="text-sm text-gray-900 hover:text-[#273492] flex items-center gap-2 transition-all duration-200 group-hover:translate-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="tabular-nums font-semibold">{order.customer?.phone || "N/A"}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {orderCategory === "scheduled" && (
                              <Tooltip content="Start Rental">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartRental(order.id)}
                                  disabled={startRentalMutation.isPending}
                                  className="h-9 w-9 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 premium-hover rounded-lg"
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            )}
                            {canCancelOrder(order) && (
                              <Tooltip content="Cancel Order">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 premium-hover rounded-lg"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            )}
                            {(orderCategory === "ongoing" || orderCategory === "late") && (
                              <Tooltip content="Check Products">
                                <Link href={`/orders/${order.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 text-[#273492] hover:text-[#1f2a7a] hover:bg-[#273492]/10 premium-hover rounded-lg"
                                  >
                                    <Package className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </Tooltip>
                            )}
                            <Tooltip content="View Details">
                              <Link href={`/orders/${order.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50 premium-hover rounded-lg"
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
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isLoading && !error && orders.length > 0 && totalPages > 1 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={orders.length}
                pageSize={pageSize}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  // Scroll to top smoothly
                  const scrollContainer = document.querySelector('main[data-scroll-container="true"]') as HTMLElement;
                  if (scrollContainer) {
                    scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              />
            </div>
          )}

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

          {/* Premium Error State */}
          {error && !isLoading && (
            <Card className="bg-red-50/80 border-2 border-red-200 rounded-xl p-8 text-center shadow-lg animate-fade-in">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-700 font-bold text-lg mb-2">Failed to load orders</p>
              <p className="text-sm text-red-600 mb-6">Please check your connection and try again</p>
              <Button
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["orders"] })}
                className="premium-hover"
              >
                Retry
              </Button>
            </Card>
          )}

          {/* Premium Empty State */}
          {!isLoading && !error && orders.length === 0 && (
            <Card className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-gray-200/60 shadow-lg animate-fade-in">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-700 font-bold text-xl mb-2">No orders found</p>
              <p className="text-gray-500 text-sm mb-8">Create your first order to get started</p>
              <StandardButton
                onClick={() => router.push("/orders/new")}
                variant="default"
                icon={Plus}
                className="premium-hover bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] shadow-lg hover:shadow-xl"
              >
                New Order
              </StandardButton>
            </Card>
          )}

          {/* Mobile: Premium Cards */}
          {!isLoading && !error && paginatedOrders.length > 0 && (
            <div className="md:hidden space-y-4 mt-4">
              {paginatedOrders.map((order, index) => {
                const startDate = (order as any).start_datetime || order.start_date;
                return (
                  <div
                    key={order.id}
                    style={{
                      animation: `fadeInUp 0.5s ease-out ${index * 0.05}s forwards`,
                      opacity: 0,
                    }}
                  >
                    <OrderCard
                      order={order}
                      onCancel={handleCancelOrder}
                      canCancel={canCancelOrder(order)}
                    />
                  </div>
                );
              })}
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

        </div>

        {/* Premium Mobile Floating Action Button */}
        <div className="md:hidden fixed bottom-20 right-4 z-30">
          <Button
            onClick={() => router.push("/orders/new")}
            className="h-14 w-14 rounded-full bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] text-white shadow-xl hover:shadow-2xl premium-hover transition-all duration-300 hover:scale-110"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

      </div>
    </>
  );
}
