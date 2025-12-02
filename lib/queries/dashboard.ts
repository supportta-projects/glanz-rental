import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { startOfDay, endOfDay } from "date-fns";
import type { DashboardStats, Order } from "@/lib/types";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";

export function useDashboardStats(
  branchId: string | null,
  dateRange?: { start: Date; end: Date; option?: string }
) {
  const supabase = createClient();
  
  // Set up real-time subscription for dashboard stats
  useRealtimeSubscription("orders", branchId);
  const range = dateRange || {
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  };
  const rangeStart = startOfDay(range.start).toISOString();
  const rangeEnd = endOfDay(range.end).toISOString();

  return useQuery({
    queryKey: ["dashboard-stats", branchId, rangeStart, rangeEnd],
    queryFn: async (): Promise<DashboardStats> => {
      if (!branchId) {
        console.error("[useDashboardStats] Branch ID is required but not provided");
        // Return default stats instead of throwing to prevent UI breakage
        return {
          scheduled_today: 0,
          ongoing: 0,
          late_returns: 0,
          partial_returns: 0,
          total_orders: 0,
          total_completed: 0,
          total_revenue: 0,
          total_customers: 0,
          today_collection: 0,
          today_completed: 0,
          today_new_orders: 0,
          active: 0,
          pending_return: 0,
          completed: 0,
        };
      }

      console.log("[useDashboardStats] Fetching stats for branch:", branchId);
      
      // Try RPC function first (if available), fallback to direct query
      try {
        const { data, error } = await (supabase.rpc as any)("get_dashboard_stats", {
          p_branch_id: branchId,
          p_start_date: rangeStart,
          p_end_date: rangeEnd,
        });

        if (error) {
          console.error("[useDashboardStats] RPC function error:", error);
          // Continue to fallback query
        } else if (data) {
          // Validate that RPC returned actual data structure
          const rpcStats = data as DashboardStats;
          // Check if it has the required fields and they're valid numbers
          if (rpcStats && typeof rpcStats.total_orders === 'number') {
            console.log("[useDashboardStats] ✅ RPC function returned data:", rpcStats);
            return rpcStats;
          } else {
            console.warn("[useDashboardStats] ⚠️ RPC function returned invalid data structure, using fallback");
            console.log("[useDashboardStats] RPC data:", data);
          }
        }
      } catch (rpcError: any) {
        // Fallback if RPC function doesn't exist (404) or fails
        if (rpcError?.code === "PGRST116" || rpcError?.status === 404) {
          console.warn("[useDashboardStats] RPC function not found, using fallback query");
        } else {
          console.error("[useDashboardStats] RPC function exception:", rpcError);
        }
      }

      // Fallback to comprehensive direct queries
      // Use dateRange to filter orders, or default to today if not provided
      console.log("[useDashboardStats] Using date range:", { rangeStart, rangeEnd });

      // Fetch orders for the branch WITHIN DATE RANGE (for filtered stats)
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at, start_date, start_datetime, late_returned, booking_date")
        .eq("branch_id", branchId)
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd);

      if (allOrdersError) {
        console.error("[useDashboardStats] ❌ Error fetching all orders:", allOrdersError);
        throw allOrdersError;
      }

      const fetchedOrdersCount = allOrders?.length || 0;
      console.log("[useDashboardStats] ✅ Fetched all orders:", fetchedOrdersCount, "orders");
      
      if (fetchedOrdersCount === 0) {
        console.warn("[useDashboardStats] ⚠️ No orders found for branch:", branchId);
        console.log("[useDashboardStats] This might be normal if no orders exist yet");
      } else {
        console.log("[useDashboardStats] Sample order statuses:", 
          allOrders?.slice(0, 5).map((o: any) => ({ id: o.id, status: o.status }))
        );
      }

      // Fetch orders within date range (for "today's activity" section - filtered by date range)
      const { data: todayOrders, error: todayOrdersError } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at, start_date, start_datetime")
        .eq("branch_id", branchId)
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd);

      if (todayOrdersError) throw todayOrdersError;

      // Fetch ALL orders to check for late returns (not just active/pending/partial)
      // This includes scheduled orders that might be overdue
      const { data: allOrdersForLate, error: allOrdersForLateError } = await supabase
        .from("orders")
        .select("id, late_returned, end_date, end_datetime, status, items:order_items(late_return)")
        .eq("branch_id", branchId)
        .in("status", ["active", "pending_return", "partially_returned", "scheduled"]);

      if (allOrdersForLateError) {
        console.error("[useDashboardStats] Error fetching orders for late check:", allOrdersForLateError);
        throw allOrdersForLateError;
      }

      // Count late returns (orders with late_returned=true, items with late_return=true, or past end date)
      const now = new Date();
      const lateReturnCount = (allOrdersForLate || []).filter((order: any) => {
        // Check if order has late_returned flag
        if (order.late_returned) return true;
        
        // Check if any items have late_return flag
        const items = order.items || [];
        if (items.some((item: any) => item.late_return === true)) return true;
        
        // Check if order is past end date and not completed/cancelled
        const endDate = order.end_datetime || order.end_date;
        if (endDate) {
          const end = new Date(endDate);
          if (end < now && order.status !== "completed" && order.status !== "cancelled") {
            return true;
          }
        }
        
        return false;
      }).length;

      // Fetch scheduled orders - filter based on date range option
      // For "all time" filter, show all scheduled orders regardless of start_date
      // For specific date ranges, filter by start_date
      const dateRangeOption = dateRange?.option;
      const isAllTimeFilter = dateRangeOption === "alltime" || dateRangeOption === "clear" || 
        Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)) >= 700;
      
      let scheduledOrders;
      let scheduledOrdersError;
      
      if (isAllTimeFilter) {
        // For "all time", fetch all scheduled orders
        const { data, error } = await supabase
          .from("orders")
          .select("id, status, start_date, start_datetime")
          .eq("branch_id", branchId)
          .eq("status", "scheduled");
        
        scheduledOrders = data;
        scheduledOrdersError = error;
      } else {
        // For specific date ranges, filter by start_date
        const rangeStartDate = rangeStart.split("T")[0];
        const rangeEndDate = rangeEnd.split("T")[0];
        
        const { data, error } = await supabase
          .from("orders")
          .select("id, status, start_date, start_datetime")
          .eq("branch_id", branchId)
          .eq("status", "scheduled")
          .gte("start_date", rangeStartDate)
          .lte("start_date", rangeEndDate);
        
        scheduledOrders = data;
        scheduledOrdersError = error;
      }

      if (scheduledOrdersError) {
        console.error("[useDashboardStats] Error fetching scheduled orders:", scheduledOrdersError);
        // Don't throw, just use empty array
      }

      // Count scheduled orders within the selected date range
      const scheduledToday = (scheduledOrders || []).length;

      // Fetch total customers
      // Note: Customers might not have branch_id - they could be global
      // If customers table has branch_id, use it; otherwise count all customers
      let totalCustomers = 0;
      try {
        const { count, error: customersError } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true });
        
        if (customersError) {
          // Try with branch_id filter if the error suggests the column doesn't exist
          console.warn("[useDashboardStats] Customers query without branch_id failed, trying with branch_id:", customersError);
          const { count: countWithBranch, error: branchError } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branchId);
          
          if (branchError) {
            console.error("[useDashboardStats] Error fetching customers:", branchError);
            // Don't throw - just use 0 as fallback
            totalCustomers = 0;
          } else {
            totalCustomers = countWithBranch || 0;
          }
        } else {
          totalCustomers = count || 0;
        }
      } catch (err) {
        console.error("[useDashboardStats] Exception fetching customers:", err);
        totalCustomers = 0;
      }

      // Calculate statistics
      const orders = allOrders || [];
      const todayOrdersList = todayOrders || [];

      console.log("[useDashboardStats] Processing orders:", {
        totalOrders: orders.length,
        ordersByStatus: {
          active: orders.filter((o: any) => o.status === "active").length,
          completed: orders.filter((o: any) => o.status === "completed").length,
          scheduled: orders.filter((o: any) => o.status === "scheduled").length,
          partially_returned: orders.filter((o: any) => o.status === "partially_returned").length,
          pending_return: orders.filter((o: any) => o.status === "pending_return").length,
          cancelled: orders.filter((o: any) => o.status === "cancelled").length,
        }
      });

      // Current day operational stats
      const scheduled_today = scheduledToday;
      const ongoing = orders.filter((o: any) => o.status === "active").length;
      const late_returns = lateReturnCount;
      const partial_returns = orders.filter((o: any) => o.status === "partially_returned").length;

      // All-time business metrics
      const total_orders = orders.length;
      const total_completed = orders.filter((o: any) => o.status === "completed").length;
      const total_revenue = orders
        .filter((o: any) => o.status === "completed")
        .reduce((sum: number, o: any) => {
          const amount = Number(o.total_amount) || 0;
          return sum + amount;
        }, 0);
      const total_customers_count = totalCustomers;

      // Today's activity
      const today_collection = todayOrdersList
        .filter((o: any) => o.status === "completed")
        .reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
      const today_completed = todayOrdersList.filter((o: any) => o.status === "completed").length;
      const today_new_orders = todayOrdersList.length;

      const stats: DashboardStats = {
        scheduled_today,
        ongoing,
        late_returns,
        partial_returns,
        total_orders,
        total_completed,
        total_revenue,
        total_customers: total_customers_count,
        today_collection,
        today_completed,
        today_new_orders,
        // Legacy fields for backward compatibility
        active: ongoing,
        pending_return: orders.filter((o: any) => o.status === "pending_return").length,
        completed: today_completed,
      };

      // Debug logging
      const ordersCount = orders.length;
      console.log("[useDashboardStats] 📊 Calculated stats:", {
        scheduled_today,
        ongoing,
        late_returns,
        partial_returns,
        total_orders,
        total_completed,
        total_revenue,
        total_customers: total_customers_count,
        today_collection,
        today_completed,
        today_new_orders,
        pending_return: orders.filter((o: any) => o.status === "pending_return").length,
      });
      
      // Validate stats before returning
      if (total_orders === 0 && ordersCount > 0) {
        console.error("[useDashboardStats] ⚠️ WARNING: Orders fetched but total_orders is 0!");
      }
      
      if (total_orders === 0 && ordersCount === 0) {
        console.log("[useDashboardStats] ℹ️ No orders found in database for branch:", branchId);
      } else if (total_orders > 0) {
        console.log("[useDashboardStats] ✅ Successfully calculated stats from", total_orders, "orders");
      }

      return stats;
    },
    enabled: !!branchId, // Only enable if branchId exists
    staleTime: 0, // Always consider stale to ensure fresh data
    gcTime: 300000, // 5m as per requirements
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // CRITICAL: Load data on mount
    refetchOnReconnect: true, // Refresh after reconnection
  });
}

export function useRecentOrders(branchId: string | null) {
  const supabase = createClient();
  
  // Set up real-time subscription for recent orders
  useRealtimeSubscription("orders", branchId);

  return useQuery({
    queryKey: ["recent-orders", branchId],
    queryFn: async (): Promise<Order[]> => {
      if (!branchId) throw new Error("Branch ID required");

      let query = supabase
        .from("orders")
        .select("id, invoice_number, start_date, end_date, status, total_amount, created_at, customer:customers(id, name), branch:branches(id, name)")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(8);

      const { data, error } = await query;

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!branchId,
    staleTime: 0, // Always consider stale to ensure fresh data
    gcTime: 300000, // 5m as per requirements
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // CRITICAL: Load data on mount
    refetchOnReconnect: true, // Refresh after reconnection
  });
}
