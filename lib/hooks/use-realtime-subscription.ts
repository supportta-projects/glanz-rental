"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Optimized Realtime subscription hook
 * Subscribes to orders AND order_items for complete real-time updates
 * Channel format: orders:${branch_id} and order_items:${branch_id}
 */
export function useRealtimeSubscription(
  table: "orders" | "customers" | "order_items",
  branchId?: string | null
) {
  const queryClient = useQueryClient();
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    // Subscribe to orders and order_items for realtime updates
    if (table !== "orders" && table !== "order_items") return;

    const channelName = branchId 
      ? `${table}:${branchId}` 
      : `${table}:global`;

    // Cleanup previous channel before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: "" },
      },
    });

    const refetchQueries = () => {
      // Force immediate refetch of all order-related queries when orders or order_items change
      // Using refetchQueries instead of invalidateQueries ensures immediate update
      queryClient.refetchQueries({ 
        queryKey: ["orders-infinite"],
        type: "active" // Only refetch active queries (currently being used)
      });
      queryClient.refetchQueries({ 
        queryKey: ["orders"],
        type: "active"
      });
      queryClient.refetchQueries({ 
        queryKey: ["dashboard-stats"],
        type: "active"
      });
      queryClient.refetchQueries({ 
        queryKey: ["recent-orders"],
        type: "active"
      });
      queryClient.refetchQueries({ 
        queryKey: ["order"],
        type: "active"
      });
    };

    // Subscribe to orders table changes
    if (table === "orders") {
      channel.on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "orders",
          filter: branchId ? `branch_id=eq.${branchId}` : undefined,
        },
        (payload: any) => {
          console.log("[Realtime] Orders changed:", payload.eventType, (payload.new as any)?.id || (payload.old as any)?.id);
          refetchQueries();
        }
      );
    }

    // Subscribe to order_items table changes (for return status updates)
    if (table === "order_items") {
      channel.on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "order_items",
        },
        (payload: any) => {
          console.log("[Realtime] Order items changed:", payload.eventType, (payload.new as any)?.order_id || (payload.old as any)?.order_id);
          refetchQueries();
        }
      );
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Realtime] ✅ Subscribed to ${table}${branchId ? ` (branch: ${branchId})` : " (global)"}`);
      } else if (status === "CHANNEL_ERROR") {
        console.warn(`[Realtime] ⚠️ Channel error for ${table}`);
      } else if (status === "TIMED_OUT") {
        console.warn(`[Realtime] ⚠️ Channel timeout for ${table}, resubscribing...`);
        // Auto-resubscribe on timeout
        setTimeout(() => {
          channel.subscribe();
        }, 1000);
      }
    });

    channelRef.current = channel;

    return () => {
      // Unsubscribe on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, branchId, queryClient]);
}

