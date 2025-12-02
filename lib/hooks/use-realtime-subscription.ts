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
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      // Clear existing timeout
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      
      // Debounce refetch by 300ms to batch multiple rapid updates
      refetchTimeoutRef.current = setTimeout(() => {
        // Use invalidateQueries instead of refetchQueries for better performance
        // This allows React Query to batch updates and only refetch when needed
        queryClient.invalidateQueries({ 
          queryKey: ["orders-infinite"],
          refetchType: "active" // Only refetch active queries
        });
        queryClient.invalidateQueries({ 
          queryKey: ["orders"],
          refetchType: "active"
        });
        queryClient.invalidateQueries({ 
          queryKey: ["dashboard-stats"],
          refetchType: "active"
        });
        queryClient.invalidateQueries({ 
          queryKey: ["recent-orders"],
          refetchType: "active"
        });
        queryClient.invalidateQueries({ 
          queryKey: ["order"],
          refetchType: "active"
        });
        queryClient.invalidateQueries({ 
          queryKey: ["calendar-orders"],
          refetchType: "active"
        });
      }, 300);
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
          // Removed verbose logging for better performance
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
          // Removed verbose logging for better performance
          refetchQueries();
        }
      );
    }

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        // Only log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Realtime] Channel error for ${table}`);
        }
      } else if (status === "TIMED_OUT") {
        // Auto-resubscribe on timeout
        setTimeout(() => {
          channel.subscribe();
        }, 1000);
      }
    });

    channelRef.current = channel;

    return () => {
      // Clear debounce timeout
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
        refetchTimeoutRef.current = null;
      }
      // Unsubscribe on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, branchId, queryClient]);
}

