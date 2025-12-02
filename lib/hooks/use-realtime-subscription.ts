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

    const invalidateQueries = () => {
      // Invalidate all order-related queries when orders or order_items change
      queryClient.invalidateQueries({ queryKey: ["orders-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      // Also invalidate individual order queries that might be affected
      queryClient.invalidateQueries({ queryKey: ["order"] });
    };

    // Subscribe to orders table changes
    if (table === "orders") {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: branchId ? `branch_id=eq.${branchId}` : undefined,
        },
        () => invalidateQueries()
      );
    }

    // Subscribe to order_items table changes (for return status updates)
    if (table === "order_items") {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        () => invalidateQueries()
      );
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Realtime] ✅ Subscribed to ${table}`);
      } else if (status === "CHANNEL_ERROR") {
        console.warn(`[Realtime] ⚠️ Channel error for ${table}`);
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

