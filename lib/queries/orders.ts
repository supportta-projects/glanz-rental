import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus, OrderItemReturnStatus } from "@/lib/types";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";
import { isOrderLate } from "@/lib/utils/date";

// Function to check and auto-cancel expired scheduled orders
// Made resilient to handle missing RPC function gracefully
async function checkAndCancelExpiredScheduledOrders(branchId: string | null): Promise<number> {
  const supabase = createClient();
  
  try {
    // Call the database function - handle gracefully if it doesn't exist
    const { data, error } = await supabase.rpc('auto_cancel_expired_scheduled_orders');
    
    // Check for specific error codes
    if (error) {
      // If function doesn't exist (PostgreSQL error code 42883), silently skip
      if (error.code === '42883' || error.message?.includes('does not exist') || error.message?.includes('function') && error.message?.includes('not found')) {
        // Function not created yet - this is expected if migration hasn't been run
        return 0;
      }
      // Log other errors but don't break the app
      if (error.code && error.message) {
        console.warn('[checkAndCancelExpiredScheduledOrders] Error:', error.code, error.message);
      }
      return 0;
    }
    
    // If any orders were cancelled, the data will be the count
    const cancelledCount = data !== null && data !== undefined ? Number(data) : 0;
    if (cancelledCount > 0) {
      console.log(`[checkAndCancelExpiredScheduledOrders] Cancelled ${cancelledCount} expired scheduled orders`);
    }
    return cancelledCount;
  } catch (error: any) {
    // Handle network errors or other exceptions
    if (error?.code === '42883' || error?.message?.includes('does not exist') || error?.message?.includes('function') && error?.message?.includes('not found')) {
      // Function not created yet - expected behavior
      return 0;
    }
    // Only log unexpected errors
    if (error?.message) {
      console.warn('[checkAndCancelExpiredScheduledOrders] Exception:', error.message);
    }
    return 0;
  }
}

const PAGE_SIZE = 50; // Optimized page size for infinite scroll

// ============================================================================
// TIMELINE EVENT LOGGING HELPER
// ============================================================================
/**
 * Logs a timeline event for an order. This tracks all order activities.
 * Errors are caught silently to prevent breaking main operations.
 */
async function logTimelineEvent(
  supabase: ReturnType<typeof createClient>,
  event: {
    orderId: string;
    action: string;
    userId: string;
    previousStatus?: string;
    newStatus?: string;
    orderItemId?: string;
    notes?: string;
  }
) {
  try {
    await (supabase.from("order_return_audit") as any).insert({
      order_id: event.orderId,
      order_item_id: event.orderItemId || null,
      action: event.action,
      previous_status: event.previousStatus || null,
      new_status: event.newStatus || null,
      user_id: event.userId,
      notes: event.notes || null,
    });
  } catch (error) {
    console.error("[logTimelineEvent] Failed to log timeline event:", error);
    // Don't throw - timeline logging shouldn't break the main operation
  }
}

// Infinite query using RPC function for <10ms queries
export function useOrdersInfinite(
  branchId: string | null,
  filters?: {
    status?: "all" | "active" | "pending" | "completed" | "cancelled" | "partially_returned" | "flagged" | "scheduled";
    searchQuery?: string; // Client-side only
    dateRange?: { start: Date; end: Date; option?: string };
  }
) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  // Realtime only for orders page (as per requirements)
  useRealtimeSubscription("orders", branchId);
  
  // Track last check time to prevent excessive calls
  const lastCheckRef = useRef<{ branchId: string | null; timestamp: number }>({ branchId: null, timestamp: 0 });
  const CHECK_INTERVAL = 30000; // Check every 30 seconds max per branch
  
  // Check and cancel expired scheduled orders on mount and when branchId changes
  useEffect(() => {
    if (!branchId) return;
    
    const now = Date.now();
    const lastCheck = lastCheckRef.current;
    
    // Only check if branch changed or enough time has passed
    if (lastCheck.branchId === branchId && (now - lastCheck.timestamp) < CHECK_INTERVAL) {
      return;
    }
    
    // Update ref before async call
    lastCheckRef.current = { branchId, timestamp: now };
    
    // Call auto-cancel function
    checkAndCancelExpiredScheduledOrders(branchId).then((cancelledCount) => {
      // Only invalidate if orders were actually cancelled
      if (cancelledCount > 0) {
        // Use setTimeout to batch invalidations and prevent rapid re-renders
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["orders-infinite", branchId] });
          queryClient.invalidateQueries({ queryKey: ["orders", branchId] });
        }, 100);
      }
    }).catch(() => {
      // Silently handle errors - don't break the app
    });
  }, [branchId]); // Only depend on branchId - queryClient is stable

  return useInfiniteQuery({
    queryKey: ["orders-infinite", branchId, filters],
    queryFn: async ({ pageParam = 0 }) => {
      if (!branchId) throw new Error("Branch ID required");

      // Try RPC function first (if available), fallback to direct query
      let result: { data: Order[]; total: number };
      
      try {
        const { data, error } = await (supabase.rpc as any)("get_orders_with_items", {
          p_branch_id: branchId,
          p_status: filters?.status === "all" ? null : filters?.status || null,
          p_start_date: filters?.dateRange?.start.toISOString() || null,
          p_end_date: filters?.dateRange?.end.toISOString() || null,
          p_limit: PAGE_SIZE,
          p_offset: pageParam * PAGE_SIZE,
        });

        if (error) throw error;
        result = data as { data: Order[]; total: number };
      } catch (rpcError: any) {
        // ✅ FIX: Better error logging for debugging missing items issue
        console.error("[useOrdersInfinite] RPC function error:", {
          error: rpcError,
          code: rpcError?.code,
          message: rpcError?.message,
          details: rpcError?.details,
          hint: rpcError?.hint,
          branchId,
          filters,
        });
        
        // Fallback to direct query if RPC function doesn't exist (404) or fails
        const from = pageParam * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("orders")
          .select("id, invoice_number, branch_id, staff_id, customer_id, booking_date, start_date, end_date, start_datetime, end_datetime, status, total_amount, late_fee, late_returned, damage_fee_total, completion_notes, created_at, customer:customers(id, name, phone, customer_number), branch:branches(id, name, address, phone, logo_url), items:order_items(id, photo_url, product_name, quantity, price_per_day, days, line_total, return_status, actual_return_date, late_return, missing_note, returned_quantity, damage_fee, damage_description)", { count: "exact" })
          .eq("branch_id", branchId)
          .order("created_at", { ascending: false });

        // ✅ FIX: For scheduled orders, don't filter by date range (they have future start dates)
        // For other orders: filter by created_at (server-side)
        // When status filter is "scheduled" or "all", include all scheduled orders regardless of date range
        if (filters?.dateRange) {
          const startDate = filters.dateRange.start.toISOString().split("T")[0];
          const endDate = filters.dateRange.end.toISOString().split("T")[0];
          
          // If filtering specifically for scheduled orders, don't apply date filter to scheduled orders
          // Otherwise, fetch scheduled orders without date filter (will be filtered client-side by start_date)
          // Fetch other orders with created_at filter
          // Use OR to get both: scheduled orders OR (non-scheduled orders within date range)
          if (filters?.status === "scheduled") {
            // When filtering for scheduled orders only, don't apply date range filter
            // This ensures all scheduled orders are shown regardless of their start date
            query = query.eq("status", "scheduled");
          } else {
            // For "all" status or other statuses, include scheduled orders without date filter
            query = query.or(
              `status.eq.scheduled,` +
              `and(status.neq.scheduled,created_at.gte.${startDate},created_at.lte.${endDate + "T23:59:59"})`
            );
          }
        }

        if (filters?.status && filters.status !== "all") {
          if (filters.status === "active") {
            query = query.eq("status", "active");
          } else if (filters.status === "pending") {
            query = query.eq("status", "pending_return");
          } else if (filters.status === "completed") {
            query = query.eq("status", "completed");
          } else if (filters.status === "cancelled") {
            query = query.eq("status", "cancelled");
          } else if (filters.status === "partially_returned") {
            query = query.eq("status", "partially_returned");
          } else if (filters.status === "flagged") {
            query = query.eq("status", "flagged");
          } else if (filters.status === "scheduled") {
            query = query.eq("status", "scheduled");
          }
        }

        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        // ✅ FIX: Filter scheduled orders by start_date if dateRange is provided
        // BUT: Don't filter scheduled orders when status filter is "scheduled" or "all" (show all scheduled orders)
        // This ensures scheduled orders with future dates are always visible
        let filteredData = (data as Order[]) || [];
        if (filters?.dateRange) {
          const startDate = filters.dateRange.start.toISOString().split("T")[0];
          const endDate = filters.dateRange.end.toISOString().split("T")[0];
          
          // Check if this is "all time" filter by checking the option OR date range days
          const dateRangeDays = Math.ceil((filters.dateRange.end.getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
          const dateRangeOption = (filters.dateRange as any).option;
          const isAllTimeFilter = dateRangeDays >= 700 || dateRangeOption === "alltime" || dateRangeOption === "clear";
          
          // ✅ FIX: When filtering for scheduled orders specifically, don't filter by date range
          // This ensures all scheduled orders (including future ones) are shown
          const isScheduledFilter = filters?.status === "scheduled" || filters?.status === "all";
          
          filteredData = filteredData.filter((order) => {
            // For scheduled orders: don't filter by date range when showing scheduled tab or all orders
            // This ensures scheduled orders with future start dates are always visible
            if (order.status === "scheduled") {
              // If filtering for scheduled orders or all orders, show all scheduled orders
              if (isScheduledFilter || isAllTimeFilter) {
                return true;
              }
              // For specific date ranges when NOT on scheduled tab, filter by start_date
              const orderStartDate = (order.start_datetime || order.start_date || "").toString().split("T")[0];
              return orderStartDate >= startDate && orderStartDate <= endDate;
            }
            // For other orders, use created_at (already filtered by query, but double-check)
            const orderCreatedDate = order.created_at.toString().split("T")[0];
            return orderCreatedDate >= startDate && orderCreatedDate <= endDate;
          });
        }

        result = {
          data: filteredData,
          total: filteredData.length, // Use filtered count for accuracy
        };
      }
      
      return {
        data: result.data || [],
        total: result.total || 0,
        nextPage: result.data?.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage, pages) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!branchId,
    staleTime: 10000, // 10s - Short stale time to allow quick refetch after creation
    gcTime: 600000, // 10m - keep in cache longer for instant access
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: true, // ✅ FIX: Always refetch on mount, especially when branch_id changes
    refetchOnReconnect: true, // Refetch on reconnect to catch missed updates
    placeholderData: (previousData) => previousData, // Optimistic UI updates
  });

  // ✅ FIX: Explicitly refetch when branchId becomes available
  useEffect(() => {
    if (branchId) {
      // Explicitly refetch when branchId becomes available
      queryClient.refetchQueries({ queryKey: ["orders-infinite", branchId] });
    }
  }, [branchId, queryClient]);
}

// Legacy paginated query (for backward compatibility)
export function useOrders(
  branchId: string | null, 
  page: number = 1, 
  pageSize: number = 20,
  filters?: {
    status?: "all" | "active" | "pending" | "completed" | "cancelled" | "partially_returned" | "flagged" | "scheduled";
    searchQuery?: string;
    dateRange?: { start: Date; end: Date; option?: string };
  }
) {
  const supabase = createClient();
  
  useRealtimeSubscription("orders", branchId);

  return useQuery({
    queryKey: ["orders", branchId, page, pageSize, filters],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("orders")
        .select("id, invoice_number, branch_id, staff_id, customer_id, booking_date, start_date, end_date, start_datetime, end_datetime, status, total_amount, late_fee, late_returned, damage_fee_total, completion_notes, created_at, customer:customers(id, name, phone, customer_number), branch:branches(id, name, address, phone, logo_url), items:order_items(id, photo_url, product_name, quantity, price_per_day, days, line_total, return_status, actual_return_date, late_return, missing_note, returned_quantity, damage_fee, damage_description)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      if (filters?.dateRange) {
        const startDate = filters.dateRange.start.toISOString().split("T")[0];
        const endDate = filters.dateRange.end.toISOString().split("T")[0];
        query = query.gte("created_at", startDate).lte("created_at", endDate + "T23:59:59");
      }

      if (filters?.status && filters.status !== "all") {
        if (filters.status === "active") {
          query = query.eq("status", "active");
        } else if (filters.status === "pending") {
          query = query.eq("status", "pending_return");
        } else if (filters.status === "completed") {
          query = query.eq("status", "completed");
        } else if (filters.status === "cancelled") {
          query = query.eq("status", "cancelled");
        } else if (filters.status === "partially_returned") {
          query = query.eq("status", "partially_returned");
        } else if (filters.status === "flagged") {
          query = query.eq("status", "flagged");
        } else if (filters.status === "scheduled") {
          query = query.eq("status", "scheduled");
        }
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      return {
        data: data as Order[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!branchId,
    staleTime: 60000, // 60s - longer cache for ultra-fast navigation
    gcTime: 600000, // 10m - keep in cache longer
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData, // Optimistic UI
  });
}

export function useOrder(orderId: string) {
  const supabase = createClient();
  
  // Set up real-time subscriptions for order and its items
  useRealtimeSubscription("orders");
  useRealtimeSubscription("order_items");

  return useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      // Fix #2: Validate orderId early and throw if invalid
      if (!orderId || typeof orderId !== "string" || orderId === "undefined" || orderId === "null") {
        const error = new Error(`Invalid order ID: ${orderId}`);
        console.error("[useOrder] ❌ Invalid order ID:", orderId);
        throw error;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          invoice_number,
          branch_id,
          staff_id,
          customer_id,
          booking_date,
          start_date,
          end_date,
          start_datetime,
          end_datetime,
          status,
          total_amount,
          subtotal,
          gst_amount,
          late_fee,
          late_returned,
          damage_fee_total,
          completion_notes,
          created_at,
          customer:customers(id, name, phone, address),
          staff:profiles(id, full_name),
          branch:branches(id, name, address, phone, logo_url),
          items:order_items(
            id,
            photo_url,
            product_name,
            quantity,
            price_per_day,
            days,
            line_total,
            return_status,
            actual_return_date,
            late_return,
            missing_note,
            returned_quantity,
            damage_fee,
            damage_description
          )
        `)
        .eq("id", orderId)
        .single();
      
      if (error) {
        console.error("[useOrder] Error fetching order:", error);
        throw error;
      }
      
      if (!data) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // ✅ CRITICAL FIX: Type assertion to fix TypeScript error
      const orderData = data as any;

      // ✅ CRITICAL FIX: If items are missing, fetch them separately as fallback
      // This handles cases where nested select fails due to RLS or other issues
      if (!orderData.items || (Array.isArray(orderData.items) && orderData.items.length === 0)) {
        console.warn(`[useOrder] Order ${orderId} has no items in nested select. Fetching separately...`);
        
        try {
          const { data: itemsData, error: itemsError } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", orderId)
            .order("created_at", { ascending: true });
          
          if (itemsError) {
            console.error("[useOrder] Error fetching items separately:", itemsError);
            // Don't throw - return order without items rather than failing completely
          } else if (itemsData && itemsData.length > 0) {
            console.log(`[useOrder] ✅ Found ${itemsData.length} items via separate query`);
            // Map the items to match the expected structure
            orderData.items = itemsData.map((item: any) => ({
              id: item.id,
              photo_url: item.photo_url,
              product_name: item.product_name,
              quantity: item.quantity,
              price_per_day: item.price_per_day,
              days: item.days,
              line_total: item.line_total,
              return_status: item.return_status,
              actual_return_date: item.actual_return_date,
              late_return: item.late_return,
              missing_note: item.missing_note,
              returned_quantity: item.returned_quantity,
              damage_fee: item.damage_fee,
              damage_description: item.damage_description,
            }));
          } else {
            console.warn(`[useOrder] ⚠️ No items found for order ${orderId} in order_items table`);
            orderData.items = []; // Ensure items is always an array
          }
        } catch (fallbackError: any) {
          console.error("[useOrder] Exception during fallback item fetch:", fallbackError);
          orderData.items = []; // Ensure items is always an array even on error
        }
      } else {
        console.log(`[useOrder] ✅ Order ${orderId} has ${orderData.items.length} items from nested select`);
      }
      
      return orderData as Order;
    },
    enabled: !!orderId && typeof orderId === "string" && orderId !== "undefined" && orderId !== "null",
    retry: false, // Don't retry 404s or RLS errors
    refetchOnWindowFocus: false, // Use cached data for instant navigation
    staleTime: 60000, // 60s - longer cache for ultra-fast navigation
    gcTime: 600000, // 10m - keep in cache longer
    placeholderData: (previousData) => previousData, // Optimistic UI updates
  });
}

export function useCreateOrder() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: {
      branch_id: string;
      staff_id: string;
      customer_id: string;
      invoice_number: string;
      start_date: string;
      end_date: string;
      total_amount: number;
      subtotal?: number;
      gst_amount?: number;
      items: Array<{
        photo_url: string;
        product_name?: string;
        quantity: number;
        price_per_day: number;
        days: number;
        line_total: number;
      }>;
    }) => {
      // Pre-calculate date strings for faster processing
      const startDateOnly = orderData.start_date.split("T")[0];
      const endDateOnly = orderData.end_date.split("T")[0];
      
      // Determine order status: scheduled if start date is in future, active if today or past
      const startDate = new Date(orderData.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      
      // Calculate status with proper date comparison
      const orderStatus: OrderStatus = startDate > today ? "scheduled" : "active";
      
      // Removed verbose logging for better performance
      
      // Prepare order data
      const orderInsert = {
        branch_id: orderData.branch_id,
        staff_id: orderData.staff_id,
        customer_id: orderData.customer_id,
        invoice_number: orderData.invoice_number,
        booking_date: new Date().toISOString(), // When order was booked/created
        start_date: startDateOnly,
        end_date: endDateOnly,
        start_datetime: orderData.start_date,
        end_datetime: orderData.end_date,
        status: orderStatus, // Use calculated status instead of hardcoded "active"
        total_amount: orderData.total_amount,
        subtotal: orderData.subtotal ?? null,
        gst_amount: orderData.gst_amount ?? null,
      };

      // Use RPC call for faster batch insert (if available) or optimized sequential insert
      // First, create the order
      const { data: order, error: orderError } = await (supabase
        .from("orders") as any)
        .insert(orderInsert)
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Prepare items with order_id in parallel (no await needed for mapping)
      const itemsWithOrderId = orderData.items.map((item) => ({
        photo_url: item.photo_url,
        product_name: item.product_name || null,
        quantity: item.quantity,
        price_per_day: item.price_per_day,
        days: item.days,
        line_total: item.line_total,
        order_id: order.id,
      }));

      // ✅ CRITICAL FIX: Batch insert all items with verification
      const { error: itemsError, data: insertedItems } = await (supabase
        .from("order_items") as any)
        .insert(itemsWithOrderId)
        .select(); // Select inserted items to verify

      if (itemsError) {
        console.error("[useCreateOrder] ❌ Error inserting items:", {
          error: itemsError,
          orderId: order.id,
          itemsCount: itemsWithOrderId.length,
          items: itemsWithOrderId.map((i: any) => ({ product_name: i.product_name, quantity: i.quantity })),
        });
        throw itemsError;
      }

      // ✅ FIX: Verify items were actually inserted
      if (!insertedItems || insertedItems.length !== orderData.items.length) {
        const errorMsg = `Failed to insert all items. Expected ${orderData.items.length}, got ${insertedItems?.length || 0}`;
        console.error("[useCreateOrder] ❌ Item count mismatch:", {
          orderId: order.id,
          expected: orderData.items.length,
          inserted: insertedItems?.length || 0,
          insertedItems,
        });
        throw new Error(errorMsg);
      }

      console.log(`[useCreateOrder] ✅ Successfully inserted ${insertedItems.length} items for order ${order.id}`);

      // Log timeline event: Order Created
      await logTimelineEvent(supabase, {
        orderId: order.id,
        action: "order_created",
        userId: orderData.staff_id,
        newStatus: orderStatus,
        notes: `${orderData.items.length} item${orderData.items.length !== 1 ? 's' : ''}`,
      });

      // Return order with items for optimistic updates
      return { ...order, items: itemsWithOrderId };
    },
    onSuccess: async (data, variables) => {
      // Invalidate all orders queries first (marks them as stale)
      queryClient.invalidateQueries({ queryKey: ["orders-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", data.id] });
      queryClient.invalidateQueries({ queryKey: ["order-timeline", data.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      // Force immediate refetch of orders-infinite query
      // Use type: "all" to refetch even if query is not currently active
      // This ensures new orders appear immediately when navigating to orders page
      await queryClient.refetchQueries({ 
        queryKey: ["orders-infinite"],
        type: "all" // Refetch all matching queries (active and inactive)
      });
    },
  });
}

export function useUpdateOrder() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: {
      orderId: string;
      invoice_number: string;
      start_date: string;
      end_date: string;
      total_amount: number;
      subtotal?: number;
      gst_amount?: number;
      items: Array<{
        id?: string;
        photo_url: string;
        product_name?: string;
        quantity: number;
        price_per_day: number;
        days: number;
        line_total: number;
      }>;
    }) => {
      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error("Authentication required");
      }

      // Fetch current order to compare changes
      const { data: currentOrder, error: fetchError } = await supabase
        .from("orders")
        .select("status, invoice_number, start_date, end_date, total_amount")
        .eq("id", orderData.orderId)
        .single() as { data: any; error: any };

      if (fetchError) throw fetchError;

      // Get current item count
      const { data: currentItems, error: itemsFetchError } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderData.orderId);

      if (itemsFetchError) throw itemsFetchError;

      const currentItemCount = currentItems?.length || 0;
      const newItemCount = orderData.items.length;
      const itemCountChanged = currentItemCount !== newItemCount;

      const startDateOnly = orderData.start_date.split("T")[0];
      const endDateOnly = orderData.end_date.split("T")[0];

      // Track changes
      const changes: string[] = [];
      if (currentOrder?.invoice_number !== orderData.invoice_number) {
        changes.push("invoice number");
      }
      if (currentOrder?.start_date !== startDateOnly) {
        changes.push("start date");
      }
      if (currentOrder?.end_date !== endDateOnly) {
        changes.push("end date");
      }
      if (Math.abs((currentOrder?.total_amount || 0) - orderData.total_amount) > 0.01) {
        changes.push("total amount");
      }
      if (itemCountChanged) {
        if (newItemCount > currentItemCount) {
          changes.push(`added ${newItemCount - currentItemCount} item${newItemCount - currentItemCount !== 1 ? 's' : ''}`);
        } else {
          changes.push(`removed ${currentItemCount - newItemCount} item${currentItemCount - newItemCount !== 1 ? 's' : ''}`);
        }
      }

      // Update order
      const { data: order, error: orderError } = await (supabase
        .from("orders") as any)
        .update({
          invoice_number: orderData.invoice_number,
          start_date: startDateOnly,
          end_date: endDateOnly,
          start_datetime: orderData.start_date,
          end_datetime: orderData.end_date,
          total_amount: orderData.total_amount,
          subtotal: orderData.subtotal,
          gst_amount: orderData.gst_amount,
        })
        .eq("id", orderData.orderId)
        .select()
        .single();

      if (orderError) throw orderError;

      // Delete existing items
      await supabase.from("order_items").delete().eq("order_id", orderData.orderId);

      // Insert updated items
      const itemsWithOrderId = orderData.items.map((item) => ({
        ...item,
        order_id: orderData.orderId,
      }));

      const { error: itemsError } = await (supabase
        .from("order_items") as any)
        .insert(itemsWithOrderId);

      if (itemsError) throw itemsError;

      // Log ONE timeline event: Order Edited with all changes combined
      if (changes.length > 0) {
        // Simple format: just show what changed
        const changeDescription = changes.join(", ");
        
        await logTimelineEvent(supabase, {
          orderId: orderData.orderId,
          action: "order_edited",
          userId: authUser.id,
          previousStatus: currentOrder?.status,
          notes: changeDescription,
        });
      }

      return order;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-timeline", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

/**
 * Update only invoice number and billing details (subtotal, GST, total)
 * Can be used for any order status at any time
 */
export function useUpdateOrderBilling() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      invoice_number,
      subtotal,
      gst_amount,
      total_amount,
    }: {
      orderId: string;
      invoice_number: string;
      subtotal?: number;
      gst_amount?: number;
      total_amount: number;
    }) => {
      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error("Authentication required");
      }

      const { data, error } = await (supabase
        .from("orders") as any)
        .update({
          invoice_number,
          subtotal: subtotal ?? null,
          gst_amount: gst_amount ?? null,
          total_amount,
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;

      // Log timeline event: Billing Updated
      await logTimelineEvent(supabase, {
        orderId,
        action: "billing_updated",
        userId: authUser.id,
        notes: `Total: ₹${total_amount.toFixed(0)}`,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-timeline", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      lateFee = 0,
    }: {
      orderId: string;
      status: "active" | "pending_return" | "completed" | "cancelled" | "partially_returned";
      lateFee?: number;
    }) => {
      const { data: currentOrderData, error: fetchError } = await supabase
        .from("orders")
        .select("total_amount, late_fee")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error("Authentication required");
      }

      // Get current status
      const { data: currentStatusData } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();

      const currentOrder = currentOrderData as { total_amount?: number; late_fee?: number } | null;
      const originalTotal = (currentOrder?.total_amount || 0) - (currentOrder?.late_fee || 0);
      const newTotal = originalTotal + lateFee;

      const { data, error } = await (supabase
        .from("orders") as any)
        .update({
          status,
          late_fee: lateFee,
          total_amount: newTotal,
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;

      // Log timeline event: Specific action based on what happened
      const previousStatus = (currentStatusData as any)?.status;
      if (previousStatus && previousStatus !== status) {
        // Map status changes to specific meaningful actions
        let action = "status_changed"; // fallback
        let actionNotes: string | undefined = undefined;
        
        if (status === "completed") {
          action = "order_completed";
          if (lateFee > 0) {
            actionNotes = `All items returned. Late fee: Rs ${lateFee.toFixed(2)}`;
          } else {
            actionNotes = "All items returned";
          }
        } else if (status === "cancelled") {
          action = "order_cancelled";
          actionNotes = "Order was cancelled";
        } else if (status === "partially_returned") {
          action = "partial_return";
          if (lateFee > 0) {
            actionNotes = `Some items returned. Late fee: Rs ${lateFee.toFixed(2)}`;
          } else {
            actionNotes = "Some items returned";
          }
        } else if (status === "pending_return") {
          action = "order_pending_return";
          actionNotes = "Order is pending return";
        } else {
          // For other status changes, still log but with better notes
          actionNotes = lateFee > 0 ? `Late fee: Rs ${lateFee.toFixed(2)}` : undefined;
        }
        
        await logTimelineEvent(supabase, {
          orderId,
          action,
          userId: authUser.id,
          previousStatus,
          newStatus: status,
          notes: actionNotes,
        });
      }

      return data;
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["orders-infinite"] });
      
      const previousData = queryClient.getQueriesData({ queryKey: ["orders-infinite"] });
      
      // Optimistically update infinite query cache
      queryClient.setQueriesData({ queryKey: ["orders-infinite"] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((order: Order) =>
              order.id === orderId ? { ...order, status } : order
            ),
          })),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-timeline", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

/**
 * Start Rental: Convert scheduled order to active
 * Simple one-click action for staff when customer picks up items
 */
export function useStartRental() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // First, fetch the order to get original scheduled dates
      const { data: order, error: fetchError } = await (supabase
        .from("orders") as any)
        .select("start_datetime, end_datetime, start_date, end_date")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;
      if (!order) throw new Error("Order not found");

      // Calculate rental duration from original scheduled dates
      const originalStart = new Date(order.start_datetime || order.start_date);
      const originalEnd = new Date(order.end_datetime || order.end_date);
      const rentalDurationMs = originalEnd.getTime() - originalStart.getTime();
      const rentalDurationDays = Math.ceil(rentalDurationMs / (1000 * 60 * 60 * 24));

      // Set start_datetime to NOW (current time)
      const now = new Date();
      const newStartDatetime = now.toISOString();
      
      // Calculate new end_datetime: NOW + original rental duration
      const newEndDatetime = new Date(now.getTime() + rentalDurationMs).toISOString();

      // Extract date-only strings for start_date and end_date
      const newStartDate = now.toISOString().split("T")[0];
      const newEndDate = new Date(now.getTime() + rentalDurationMs).toISOString().split("T")[0];

      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error("Authentication required");
      }

      // Update order: status to active, set new start/end datetimes
      const { data, error } = await (supabase
        .from("orders") as any)
        .update({ 
          status: "active" as OrderStatus,
          start_datetime: newStartDatetime,
          end_datetime: newEndDatetime,
          start_date: newStartDate,
          end_date: newEndDate,
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;

      // Log timeline event: Rental Started
      await logTimelineEvent(supabase, {
        orderId,
        action: "rental_started",
        userId: authUser.id,
        previousStatus: "scheduled",
        newStatus: "active",
        notes: `${rentalDurationDays} day${rentalDurationDays !== 1 ? 's' : ''}`,
      });

      return data;
    },
    onSuccess: (_, orderId) => {
      // Invalidate all order-related queries
      queryClient.invalidateQueries({ queryKey: ["orders-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-timeline", orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
    },
  });
}

/**
 * Optimized: Process item-wise order return using single database function
 * Reduces 6-10 network calls to 1 call (~50-100ms total)
 * Includes optimistic updates for instant UI feedback (<1ms)
 */
export function useProcessOrderReturn() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      itemReturns,
      lateFee = 0,
    }: {
      orderId: string;
      itemReturns: Array<{
        itemId: string;
        returnStatus: "returned" | "missing" | "not_yet_returned";
        actualReturnDate?: string;
        missingNote?: string;
        returned_quantity?: number;
        damage_fee?: number;
        damage_description?: string;
      }>;
      lateFee?: number;
    }) => {
      // Get current authenticated user (cached, fast)
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error("Authentication required");
      }

      // Prepare item returns JSONB format with proper type validation
      const itemReturnsJsonb = itemReturns.map((ir) => {
        // Ensure returned_quantity is a number (not string)
        const returnedQty = typeof ir.returned_quantity === 'number' 
          ? ir.returned_quantity 
          : (ir.returned_quantity ? Number(ir.returned_quantity) : 0);
        
        // Ensure damage_fee is a number (not string)
        const damageFee = typeof ir.damage_fee === 'number'
          ? ir.damage_fee
          : (ir.damage_fee ? Number(ir.damage_fee) : 0);
        
        return {
          item_id: ir.itemId,
          return_status: ir.returnStatus,
          actual_return_date: ir.actualReturnDate || (returnedQty > 0 ? new Date().toISOString() : null),
          missing_note: ir.missingNote || null,
          returned_quantity: returnedQty > 0 ? returnedQty : null,
          damage_fee: damageFee > 0 ? damageFee : null,
          damage_description: ir.damage_description || null,
        };
      });

      // Validate payload before sending
      if (!itemReturnsJsonb || itemReturnsJsonb.length === 0) {
        throw new Error("No item returns to process");
      }

      // Validate each item return
      for (const ir of itemReturnsJsonb) {
        if (!ir.item_id) {
          throw new Error("Invalid item ID in return data");
        }
        if (ir.returned_quantity !== null && (ir.returned_quantity < 0 || !Number.isInteger(ir.returned_quantity))) {
          throw new Error(`Invalid returned_quantity for item ${ir.item_id}: must be a non-negative integer`);
        }
        if (ir.damage_fee !== null && (ir.damage_fee < 0 || isNaN(ir.damage_fee))) {
          throw new Error(`Invalid damage_fee for item ${ir.item_id}: must be a non-negative number`);
        }
      }

      // Log payload for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log("[useProcessOrderReturn] Calling function with:", {
          p_order_id: orderId,
          p_item_returns_count: itemReturnsJsonb.length,
          p_item_returns_sample: itemReturnsJsonb[0],
          p_user_id: authUser.id,
          p_late_fee: lateFee,
        });
      }

      // Single database function call - all operations in one transaction (~50-100ms)
      let data, error;
      try {
        const result = await (supabase.rpc as any)("process_order_return_optimized", {
          p_order_id: orderId,
          p_item_returns: itemReturnsJsonb,
          p_user_id: authUser.id,
          p_late_fee: lateFee,
        });
        data = result.data;
        error = result.error;
      } catch (rpcError: any) {
        // Catch any exceptions from the RPC call
        console.error("[useProcessOrderReturn] RPC call exception:", {
          error: rpcError,
          message: rpcError?.message,
          stack: rpcError?.stack,
          name: rpcError?.name,
          toString: String(rpcError),
        });
        throw new Error(rpcError?.message || "Failed to call database function");
      }

      if (error) {
        // Enhanced error logging - handle empty error objects
        const errorInfo: any = {
          hasError: true,
          message: error.message || "Unknown error",
          details: error.details || null,
          hint: error.hint || null,
          code: error.code || null,
        };
        
        // Try to extract more info from error object
        try {
          errorInfo.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch (e) {
          errorInfo.fullError = String(error);
        }
        
        // Also try to get all properties
        try {
          errorInfo.allProperties = Object.keys(error);
          errorInfo.errorObject = error;
        } catch (e) {
          // Ignore
        }
        
        console.error("[useProcessOrderReturn] Database function error:", errorInfo);
        
        // ✅ FIX (Issue O7): Map PostgreSQL errors to user-friendly messages
        let errorMessage = "Failed to process order return";
        
        if (error.code) {
          // Map common PostgreSQL error codes to user-friendly messages
          switch (error.code) {
            case '23505': // Unique constraint violation
              errorMessage = "This return has already been processed. Please refresh the page.";
              break;
            case '23503': // Foreign key violation
              errorMessage = "Invalid order or item reference. Please refresh and try again.";
              break;
            case '23514': // Check constraint violation
              errorMessage = "Invalid return data. Please check quantities and fees.";
              break;
            case 'P0001': // Raise exception
              errorMessage = error.message || "Return processing failed. Please check your input.";
              break;
            case '42883': // Function does not exist
              errorMessage = "Database function not available. Please contact support.";
              break;
            default:
              errorMessage = error.message || error.details || error.hint || "Database function failed. Please try again.";
          }
        } else {
          errorMessage = error.message || error.details || error.hint || "Failed to process return. Please try again.";
        }
        
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error("Database function returned no data");
      }

      // Validate response structure
      if (!data.new_status || data.total_amount === undefined) {
        console.error("[useProcessOrderReturn] Invalid response structure:", data);
        throw new Error("Database function returned invalid data structure");
      }

      return {
        orderId,
        newStatus: data.new_status as OrderStatus,
        totalAmount: data.total_amount as number,
      };
    },
    // Optimistic update for instant UI feedback (<1ms)
    onMutate: async ({ orderId, itemReturns, lateFee = 0 }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["order", orderId] });
      await queryClient.cancelQueries({ queryKey: ["orders-infinite"] });
      await queryClient.cancelQueries({ queryKey: ["orders"] });

      // Snapshot previous values
      const previousOrder = queryClient.getQueryData<Order>(["order", orderId]);
      
      if (!previousOrder) return { previousOrder: null };

      // Optimistically update order items
      const updatedItems = previousOrder.items?.map((item) => {
        const itemReturn = itemReturns.find((ir) => ir.itemId === item.id);
        if (itemReturn) {
          const endDate = (previousOrder as any).end_datetime || previousOrder.end_date;
          // Clear actual_return_date when reverting to not_yet_returned
          const shouldClearReturnDate = itemReturn.returnStatus === "not_yet_returned";
          return {
            ...item,
            return_status: itemReturn.returnStatus as OrderItemReturnStatus,
            actual_return_date: shouldClearReturnDate 
              ? undefined 
              : (itemReturn.actualReturnDate || (itemReturn.returned_quantity && itemReturn.returned_quantity > 0 ? new Date().toISOString() : undefined)),
            late_return: itemReturn.returnStatus === "returned" ? isOrderLate(endDate) : undefined,
            missing_note: itemReturn.missingNote || undefined,
            returned_quantity: itemReturn.returned_quantity ?? item.returned_quantity ?? 0,
            damage_fee: itemReturn.damage_fee ?? item.damage_fee ?? 0,
            damage_description: itemReturn.damage_description ?? item.damage_description ?? undefined,
          };
        }
        return item;
      });

      // ✅ CRITICAL FIX (Issue P2): Calculate new status with proper priority
      // Status priority: completed > flagged > partially_returned > active
      // 
      // Rules:
      // 1. completed: All items fully returned (returned_quantity = quantity) AND no damage AND no missing
      // 2. flagged: Any damage OR any partial returns (returned_quantity < quantity) OR any missing items
      // 3. partially_returned: Some items returned but no damage and no missing
      // 4. active: No items returned yet
      
      const allReturned = updatedItems?.every((item) => {
        const returnedQty = item.returned_quantity ?? 0;
        return item.return_status === "returned" && returnedQty === item.quantity;
      });
      
      const hasMissing = updatedItems?.some((item) => item.return_status === "missing");
      
      const hasNotReturned = updatedItems?.some(
        (item) => {
          const returnedQty = item.returned_quantity ?? 0;
          return (!item.return_status || item.return_status === "not_yet_returned") && returnedQty === 0;
        }
      );
      
      // Check for partial returns: returned_quantity > 0 AND returned_quantity < quantity
      const hasPartialReturns = updatedItems?.some(
        (item) => {
          const returnedQty = item.returned_quantity ?? 0;
          return returnedQty > 0 && returnedQty < item.quantity;
        }
      );
      
      // Check for damage: damage_fee > 0 OR damage_description exists
      const hasDamage = updatedItems?.some(
        (item) => {
          const damageFee = item.damage_fee ?? 0;
          return damageFee > 0 || (item.damage_description && item.damage_description.trim().length > 0);
        }
      );

      let newStatus: OrderStatus = previousOrder.status;
      
      // Priority 1: All items fully returned, no damage, no missing → completed
      if (allReturned && !hasPartialReturns && !hasDamage && !hasMissing) {
        newStatus = "completed";
      }
      // Priority 2: Any damage OR partial returns OR missing items → flagged
      else if (hasDamage || hasPartialReturns || hasMissing) {
        newStatus = "flagged";
      }
      // Priority 3: Some items returned but no damage and no missing → partially_returned
      else if (!hasNotReturned && !allReturned) {
        newStatus = "partially_returned";
      }
      // Priority 4: No items returned yet → keep current status (likely "active" or "pending_return")
      // Don't change status if nothing has been returned

      // Calculate new total
      const originalTotal = (previousOrder.total_amount || 0) - (previousOrder.late_fee || 0);
      const newTotal = originalTotal + lateFee;
      const endDate = (previousOrder as any).end_datetime || previousOrder.end_date;

      // Optimistically update order
      const optimisticOrder: Order = {
        ...previousOrder,
        status: newStatus,
        late_fee: lateFee,
        late_returned: lateFee > 0 || isOrderLate(endDate),
        total_amount: newTotal,
        items: updatedItems,
      };

      // Update cache immediately (instant UI update)
      queryClient.setQueryData<Order>(["order", orderId], optimisticOrder);

      // Optimistically update orders list (all query keys)
      queryClient.setQueriesData({ queryKey: ["orders-infinite"] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((order: Order) => {
              if (order.id === orderId) {
                // Return the optimistic order with updated status
                return optimisticOrder;
              }
              return order;
            }),
          })),
        };
      });

      // Also update the regular orders query cache
      queryClient.setQueriesData({ queryKey: ["orders"] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((order: Order) =>
            order.id === orderId ? optimisticOrder : order
          ),
        };
      });

      return { previousOrder };
    },
    // On error, rollback optimistic update
    onError: (err, variables, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(["order", variables.orderId], context.previousOrder);
      }
    },
    // On success, log SINGLE timeline event and invalidate queries
    onSuccess: async (_, variables) => {
      // Get current authenticated user for timeline logging
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Fetch current order to get item details for concise notes
        const { data: orderData } = await supabase
          .from("orders")
          .select("items:order_items(id, product_name, quantity)")
          .eq("id", variables.orderId)
          .single();
        
        const items = (orderData as any)?.items || [];
        
        // Calculate counts and totals for concise timeline event
        const returnedCount = variables.itemReturns.filter(
          ir => ir.returnStatus === "returned"
        ).length;
        const revertedCount = variables.itemReturns.filter(
          ir => ir.returnStatus === "not_yet_returned"
        ).length;
        const missingCount = variables.itemReturns.filter(
          ir => ir.returnStatus === "missing"
        ).length;
        
        // Build simple, concise summary
        let action = "items_updated";
        const noteParts: string[] = [];
        
        if (returnedCount > 0) {
          // Calculate returned quantities
          let totalReturnedQty = 0;
          let totalExpectedQty = 0;
          let totalDamageFee = 0;
          
          variables.itemReturns.forEach((ir) => {
            if (ir.returnStatus === "returned" && ir.returned_quantity) {
              const item = items.find((i: any) => i.id === ir.itemId);
              if (item) {
                totalReturnedQty += ir.returned_quantity;
                totalExpectedQty += item.quantity;
                if (ir.damage_fee && ir.damage_fee > 0) {
                  totalDamageFee += ir.damage_fee;
                }
              }
            }
          });
          
          action = returnedCount === variables.itemReturns.length 
            ? "order_completed" 
            : "partial_return";
          
          // Simple format: "X/Y qty, ₹Z damage" or just "X items"
          if (totalReturnedQty > 0) {
            if (totalReturnedQty < totalExpectedQty) {
              noteParts.push(`${totalReturnedQty}/${totalExpectedQty} qty`);
            } else {
              noteParts.push(`${returnedCount} item${returnedCount !== 1 ? 's' : ''}`);
            }
          }
          
          if (totalDamageFee > 0) {
            noteParts.push(`₹${totalDamageFee.toFixed(0)} damage`);
          }
        } else if (revertedCount > 0) {
          action = "items_reverted";
          noteParts.push(`${revertedCount} item${revertedCount !== 1 ? 's' : ''}`);
        } else if (missingCount > 0) {
          action = "items_marked_missing";
          noteParts.push(`${missingCount} item${missingCount !== 1 ? 's' : ''}`);
        }
        
        const lateFee = variables.lateFee || 0;
        if (lateFee > 0) {
          noteParts.push(`₹${lateFee.toFixed(0)} late fee`);
        }
        
        // Log ONE simple timeline event
        await logTimelineEvent(supabase, {
          orderId: variables.orderId,
          action,
          userId: authUser.id,
          notes: noteParts.length > 0 ? noteParts.join(", ") : undefined,
        });
      }
      
      // Invalidate queries (will refetch in background, but UI already updated)
      queryClient.invalidateQueries({ queryKey: ["orders-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-timeline", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      
      // Force immediate refetch for orders list (ensures category updates)
      queryClient.refetchQueries({ queryKey: ["orders-infinite"] });
    },
  });
}

