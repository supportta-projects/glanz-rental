import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { startOfDay, endOfDay } from "date-fns";
import type { DashboardStats, Order } from "@/lib/types";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";

export function useDashboardStats(
  branchId: string | null,
  dateRange?: { start: Date; end: Date }
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
      if (!branchId) throw new Error("Branch ID required");

      // Try RPC function first (if available), fallback to direct query
      try {
        const { data, error } = await (supabase.rpc as any)("get_dashboard_stats", {
          p_branch_id: branchId,
          p_start_date: rangeStart,
          p_end_date: rangeEnd,
        });

        if (!error && data) {
          return data as DashboardStats;
        }
      } catch (rpcError: any) {
        // Fallback if RPC function doesn't exist (404) or fails
        if (rpcError?.code === "PGRST116" || rpcError?.status === 404) {
          console.warn("[useDashboardStats] RPC function not found, using fallback query");
        }
      }

      // Fallback to direct query
      let ordersQuery = supabase
        .from("orders")
        .select("status, total_amount, created_at")
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd)
        .eq("branch_id", branchId);

      const { data: ordersData, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      const orders = (ordersData || []) as Array<{ status: string; total_amount?: number }>;
      
      return {
        active: orders.filter((o) => o.status === "active").length || 0,
        pending_return: orders.filter((o) => o.status === "pending_return").length || 0,
        completed: orders.filter((o) => o.status === "completed").length || 0,
        today_collection: orders
          .filter((o) => o.status === "completed")
          .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
      };
    },
    enabled: !!branchId,
    staleTime: 30000, // 30s as per requirements
    gcTime: 300000, // 5m as per requirements
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
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
    staleTime: 30000, // 30s as per requirements
    gcTime: 300000, // 5m as per requirements
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
