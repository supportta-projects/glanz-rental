import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface OrderTimelineEvent {
  id: string;
  order_id: string;
  order_item_id?: string;
  action: string;
  previous_status?: string;
  new_status?: string;
  user_id: string;
  user_name?: string;
  notes?: string;
  created_at: string;
}

export function useOrderTimeline(orderId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["order-timeline", orderId],
    queryFn: async () => {
      // Fetch audit logs for this order
      const { data: auditLogs, error: auditError } = await supabase
        .from("order_return_audit")
        .select(`
          *,
          user:profiles!order_return_audit_user_id_fkey(full_name, username)
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (auditError) throw auditError;

      // Also get order creation info from orders table
      const { data: order, error: orderError } = await (supabase
        .from("orders") as any)
        .select(`
          id,
          created_at,
          status,
          staff_id,
          staff:profiles!orders_staff_id_fkey(full_name, username)
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Build timeline events
      const events: OrderTimelineEvent[] = [];

      // Add order creation event
      if (order) {
        const orderData = order as {
          id: string;
          created_at: string;
          status: string;
          staff_id: string;
          staff?: { full_name?: string; username?: string };
        };
        events.push({
          id: `created-${orderData.id}`,
          order_id: orderData.id,
          action: "order_created",
          new_status: orderData.status,
          user_id: orderData.staff_id,
          user_name: orderData.staff?.full_name || orderData.staff?.username || "Unknown",
          created_at: orderData.created_at,
        });
      }

      // Add audit log events
      if (auditLogs) {
        auditLogs.forEach((log: any) => {
          events.push({
            id: log.id,
            order_id: log.order_id,
            order_item_id: log.order_item_id,
            action: log.action,
            previous_status: log.previous_status,
            new_status: log.new_status,
            user_id: log.user_id,
            user_name: log.user?.full_name || log.user?.username || "Unknown",
            notes: log.notes,
            created_at: log.created_at,
          });
        });
      }

      // Sort by created_at descending (newest first)
      return events.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!orderId,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
}

