"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Optimized Realtime subscription hook
 * Only subscribes to orders for dashboard/orders pages (as per requirements)
 * Channel format: orders:${branch_id} - unsubscribe on unmount
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

    // Only subscribe to orders for realtime (as per requirements)
    if (table !== "orders") return;

    // Channel format: orders:${branch_id} (as per requirements)
    const channelName = branchId 
      ? `orders:${branchId}` 
      : `orders:global`;

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
      queryClient.invalidateQueries({ queryKey: ["orders-infinite", branchId] });
      queryClient.invalidateQueries({ queryKey: ["orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", branchId] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders", branchId] });
    };

    // Subscribe to all postgres changes with branch filter
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: branchId ? `branch_id=eq.${branchId}` : undefined,
        },
        () => invalidateQueries()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Success - subscription active
        } else if (status === "CHANNEL_ERROR") {
          // Realtime failed - app continues with cache
        }
      });

    channelRef.current = channel;

    return () => {
      // Unsubscribe on unmount (as per requirements)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, branchId, queryClient]);
}

