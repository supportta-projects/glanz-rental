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
    // Note: "customers" table subscriptions are not implemented yet
    if (table !== "orders" && table !== "order_items") {
      // Return early for customers table - no subscription needed
      return;
    }

    // Wrap subscription logic in try-catch to prevent errors from breaking the page
    try {
      const channelName = branchId 
        ? `${table}:${branchId}` 
        : `${table}:global`;

      // Cleanup previous channel before creating new one
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          // Silently handle cleanup errors
        }
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
          try {
            refetchQueries();
          } catch (error) {
            // Silently handle refetch errors
          }
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
          try {
            refetchQueries();
          } catch (error) {
            // Silently handle refetch errors
          }
        }
      );
    }

      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // Silently handle channel errors - don't log to prevent console noise
          // The subscription will be automatically cleaned up on unmount
          return;
        } else if (status === "TIMED_OUT") {
          // Auto-resubscribe on timeout with error handling
          setTimeout(() => {
            try {
              channel.subscribe();
            } catch (error) {
              // Silently handle resubscribe errors
            }
          }, 1000);
        }
      });

      channelRef.current = channel;
    } catch (error) {
      // Silently handle subscription setup errors - prevents page breakage
      // This can happen due to CSP violations, network issues, etc.
      return;
    }

    return () => {
      // Clear debounce timeout
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
        refetchTimeoutRef.current = null;
      }
      // Unsubscribe on unmount
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          // Silently handle cleanup errors
        }
        channelRef.current = null;
      }
    };
  }, [table, branchId, queryClient]);
}

