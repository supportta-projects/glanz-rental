"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Sets up Supabase Realtime subscriptions for automatic cache updates
 * This ensures that when one staff member makes a change, it reflects immediately
 * on all other devices/sessions viewing the same data
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
    if (!supabase) {
      console.warn(`[Realtime] Supabase client not available for ${table}`);
      return;
    }

    // Create a stable channel name to reuse channels and prevent duplicates
    // Use a consistent name based on table and branchId (not timestamp)
    const channelName = branchId 
      ? `${table}-changes-${branchId}` 
      : `${table}-changes-global`;

    try {
      // Helper function to invalidate queries
      const invalidateQueries = () => {
        if (table === "orders") {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["order"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
          queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
          queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
        } else if (table === "customers") {
          queryClient.invalidateQueries({ queryKey: ["customers"] });
          queryClient.invalidateQueries({ queryKey: ["customer"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        } else if (table === "order_items") {
          queryClient.invalidateQueries({ queryKey: ["order"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        }
      };

      // Create channel
      const channel = supabase.channel(channelName);

      // Subscribe to INSERT events
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: table,
        },
        (payload) => {
          // Filter by branch_id on the client side if needed
          if (branchId && table === "orders" && (payload.new as any)?.branch_id !== branchId) {
            return; // Ignore changes from other branches
          }
          console.log(`[Realtime] INSERT on ${table}:`, payload.new);
          invalidateQueries();
        }
      );

      // Subscribe to UPDATE events
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: table,
        },
        (payload) => {
          // Filter by branch_id on the client side if needed
          if (branchId && table === "orders" && (payload.new as any)?.branch_id !== branchId) {
            return; // Ignore changes from other branches
          }
          console.log(`[Realtime] UPDATE on ${table}:`, payload.new);
          invalidateQueries();
        }
      );

      // Subscribe to DELETE events
      channel.on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: table,
        },
        (payload) => {
          // Filter by branch_id on the client side if needed
          if (branchId && table === "orders" && (payload.old as any)?.branch_id !== branchId) {
            return; // Ignore changes from other branches
          }
          console.log(`[Realtime] DELETE on ${table}:`, payload.old);
          invalidateQueries();
        }
      );

      // Subscribe to channel
      channel
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            // Success - subscription is active
            // Silently succeed (no console log to reduce noise)
          } else if (status === "CHANNEL_ERROR") {
            // Realtime subscription failed - this is okay, we have polling fallback
            // Only log if there's meaningful error information to avoid empty object logs
            if (err && typeof err === "object") {
              const errorKeys = Object.keys(err);
              // Only log if error object has properties
              if (errorKeys.length > 0) {
                try {
                  const errorStr = JSON.stringify(err);
                  if (errorStr !== "{}") {
                    console.warn(`[Realtime] Subscription error for ${table}:`, err);
                  }
                } catch {
                  // If stringify fails, the error might have circular refs - just skip logging
                }
              }
            }
            // Don't throw - app continues with polling/refetch intervals
          } else if (status === "TIMED_OUT") {
            // Subscription timed out - will retry automatically
            // Silently handle (no console log to reduce noise)
          } else if (status === "CLOSED") {
            // Subscription closed - normal cleanup
            // Silently handle (no console log to reduce noise)
          }
        });

      channelRef.current = channel;

      return () => {
        // Cleanup: unsubscribe when component unmounts
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current).then((status) => {
            if (status === "ok") {
              console.log(`[Realtime] 🧹 Cleaned up subscription for ${table}`);
            }
          });
          channelRef.current = null;
        }
      };
    } catch (error) {
      console.error(`[Realtime] ❌ Failed to create subscription for ${table}:`, error);
      // Don't throw - just log the error so the app continues to work
    }
  }, [table, branchId, queryClient]);
}

