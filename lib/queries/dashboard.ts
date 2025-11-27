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
      let ordersQuery = supabase
        .from("orders")
        .select("status, total_amount, created_at")
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd);

      if (branchId) {
        ordersQuery = ordersQuery.eq("branch_id", branchId);
      }

      const { data: orders, error } = await ordersQuery;

      if (error) throw error;

      const active = orders?.filter((o) => o.status === "active").length || 0;
      const pendingReturn =
        orders?.filter((o) => o.status === "pending_return").length || 0;
      const completed =
        orders?.filter((o) => o.status === "completed").length || 0;
      const todayCollection =
        orders
          ?.filter((o) => o.status === "completed")
          .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      return {
        active,
        pending_return: pendingReturn,
        today_collection: todayCollection,
        completed,
      };
    },
    enabled: !!branchId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useRecentOrders(branchId: string | null) {
  const supabase = createClient();
  
  // Set up real-time subscription for recent orders
  useRealtimeSubscription("orders", branchId);

  return useQuery({
    queryKey: ["recent-orders", branchId],
    queryFn: async (): Promise<Order[]> => {
      // Optimize: Only select fields we actually use
      let query = supabase
        .from("orders")
        .select("id, invoice_number, start_date, end_date, status, total_amount, created_at, customer:customers(id, name), branch:branches(id, name)")
        .order("created_at", { ascending: false })
        .limit(8);

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!branchId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
