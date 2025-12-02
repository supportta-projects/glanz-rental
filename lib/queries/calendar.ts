import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";

export interface CalendarOrderCounts {
  [date: string]: {
    scheduled: number;
    active: number;
    completed: number;
  };
}

export interface CalendarOrdersByDate {
  [date: string]: Order[];
}

/**
 * Fetch orders for a specific month to populate calendar
 */
export function useCalendarOrders(
  branchId: string | null,
  month: Date // First day of the month
) {
  const supabase = createClient();

  // Enable real-time subscription for calendar updates
  useRealtimeSubscription("orders", branchId);

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  return useQuery({
    queryKey: ["calendar-orders", branchId, format(monthStart, "yyyy-MM")],
    queryFn: async (): Promise<{ counts: CalendarOrderCounts; orders: CalendarOrdersByDate }> => {
      if (!branchId) {
        return { counts: {}, orders: {} };
      }

      // Fetch only scheduled orders for this month (future dates and today)
      const todayStr = format(new Date(), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, invoice_number, branch_id, customer_id, start_date, start_datetime, status, total_amount, created_at, customer:customers(id, name, phone)"
        )
        .eq("branch_id", branchId)
        .eq("status", "scheduled")
        // Use start_date for filtering (DATE type, no timezone issues)
        .gte("start_date", format(monthStart, "yyyy-MM-dd"))
        .lte("start_date", format(monthEnd, "yyyy-MM-dd"))
        .order("start_date", { ascending: true });

      if (error) throw error;

      const orders = (data || []) as Order[];

      // Group orders by date and calculate counts
      const counts: CalendarOrderCounts = {};
      const ordersByDate: CalendarOrdersByDate = {};

      orders.forEach((order) => {
        // Extract date from start_date (DATE type from database)
        // start_date is a DATE type, so it should be in YYYY-MM-DD format
        // Parse it directly without timezone conversion to avoid date shifting
        let orderDate: string;
        if (order.start_date) {
          const dateStr = order.start_date.toString();
          // Extract just the date portion (YYYY-MM-DD) before any time/timezone info
          // This handles both DATE type (YYYY-MM-DD) and TIMESTAMP type (YYYY-MM-DDTHH:mm:ss)
          const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            orderDate = dateMatch[1]; // Use the matched YYYY-MM-DD portion
          } else {
            // Fallback: try to parse as date string
            orderDate = dateStr.split('T')[0].split(' ')[0];
          }
        } else if (order.start_datetime) {
          // Fallback to start_datetime if start_date is not available
          const datetimeStr = order.start_datetime.toString();
          orderDate = datetimeStr.split('T')[0].split(' ')[0];
        } else {
          // Last fallback to created_at
          const createdStr = order.created_at.toString();
          orderDate = createdStr.split('T')[0].split(' ')[0];
        }

        if (!counts[orderDate]) {
          counts[orderDate] = {
            scheduled: 0,
            active: 0,
            completed: 0,
          };
          ordersByDate[orderDate] = [];
        }

        ordersByDate[orderDate].push(order);

        // Only count scheduled orders
        if (order.status === "scheduled") {
          counts[orderDate].scheduled++;
        }
      });


      return { counts, orders: ordersByDate };
    },
    enabled: !!branchId,
    staleTime: 30000, // 30s - balance between freshness and performance
    refetchOnMount: false, // Use cached data if available
    refetchOnReconnect: true, // Refresh after reconnection
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });
}

