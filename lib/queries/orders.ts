import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus, OrderItemReturnStatus } from "@/lib/types";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";
import { isOrderLate } from "@/lib/utils/date";

const PAGE_SIZE = 50; // Optimized page size for infinite scroll

// Infinite query using RPC function for <10ms queries
export function useOrdersInfinite(
  branchId: string | null,
  filters?: {
    status?: "all" | "active" | "pending" | "completed" | "cancelled" | "partially_returned";
    searchQuery?: string; // Client-side only
    dateRange?: { start: Date; end: Date; option?: string };
  }
) {
  const supabase = createClient();
  
  // Realtime only for orders page (as per requirements)
  useRealtimeSubscription("orders", branchId);

  return useInfiniteQuery({
    queryKey: ["orders-infinite", branchId, filters],
    queryFn: async ({ pageParam = 0 }) => {
      // Add small delay to prevent flash of loading state
      await new Promise(resolve => setTimeout(resolve, 0));
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
        // Fallback to direct query if RPC function doesn't exist (404) or fails
        if (rpcError?.code === "PGRST116" || rpcError?.status === 404) {
          console.warn("[useOrdersInfinite] RPC function not found, using fallback query");
        }
        
        const from = pageParam * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("orders")
          .select("id, invoice_number, branch_id, staff_id, customer_id, booking_date, start_date, end_date, start_datetime, end_datetime, status, total_amount, late_fee, late_returned, created_at, customer:customers(id, name, phone, customer_number), branch:branches(id, name), items:order_items(id, return_status, actual_return_date, late_return, missing_note)", { count: "exact" })
          .eq("branch_id", branchId)
          .order("created_at", { ascending: false });

        // For scheduled orders: we need to filter by start_date (client-side)
        // For other orders: filter by created_at (server-side)
        // So we fetch scheduled orders without date filter, then filter client-side
        if (filters?.dateRange) {
          const startDate = filters.dateRange.start.toISOString().split("T")[0];
          const endDate = filters.dateRange.end.toISOString().split("T")[0];
          
          // Fetch scheduled orders without date filter (will be filtered client-side by start_date)
          // Fetch other orders with created_at filter
          // Use OR to get both: scheduled orders OR (non-scheduled orders within date range)
          query = query.or(
            `status.eq.scheduled,` +
            `and(status.neq.scheduled,created_at.gte.${startDate},created_at.lte.${endDate + "T23:59:59"})`
          );
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
          }
        }

        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        // Filter scheduled orders by start_date if dateRange is provided
        // BUT: Skip filtering scheduled orders for "all time" (to show all scheduled orders)
        let filteredData = (data as Order[]) || [];
        if (filters?.dateRange) {
          const startDate = filters.dateRange.start.toISOString().split("T")[0];
          const endDate = filters.dateRange.end.toISOString().split("T")[0];
          
          // Check if this is "all time" filter by checking the option OR date range days
          const dateRangeDays = Math.ceil((filters.dateRange.end.getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
          const dateRangeOption = (filters.dateRange as any).option;
          const isAllTimeFilter = dateRangeDays >= 700 || dateRangeOption === "alltime" || dateRangeOption === "clear";
          
          filteredData = filteredData.filter((order) => {
            // For scheduled orders: only filter by start_date if NOT "all time"
            if (order.status === "scheduled") {
              if (isAllTimeFilter) {
                // Show all scheduled orders for "all time" filter
                return true;
              }
              // For specific date ranges (including tomorrow), filter by start_date
              const orderStartDate = (order.start_datetime || order.start_date || "").toString().split("T")[0];
              // For "tomorrow" filter, check if order's start_date matches tomorrow
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
    staleTime: 0, // Mark as stale immediately so real-time updates trigger refetch
    gcTime: 300000, // 5m as per requirements
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Allow refetch on mount for real-time updates
    refetchOnReconnect: true, // Refetch on reconnect to catch missed updates
  });
}

// Legacy paginated query (for backward compatibility)
export function useOrders(
  branchId: string | null, 
  page: number = 1, 
  pageSize: number = 20,
  filters?: {
    status?: "all" | "active" | "pending" | "completed" | "cancelled" | "partially_returned";
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
        .select("id, invoice_number, branch_id, staff_id, customer_id, booking_date, start_date, end_date, start_datetime, end_datetime, status, total_amount, late_fee, late_returned, created_at, customer:customers(id, name, phone, customer_number), branch:branches(id, name), items:order_items(id, return_status, actual_return_date, late_return, missing_note)", { count: "exact" })
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
    staleTime: 30000, // 30s
    gcTime: 300000, // 5m
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
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

      console.log("[useOrder] 🔍 Fetching order:", orderId);
      
      // Fix #1: Explicit Supabase query with raw error logging
      const { data, error } = await supabase
        .from("orders")
        .select("*, customer:customers(id, name, phone, address), staff:profiles(id, full_name), branch:branches(id, name), items:order_items(*)")
        .eq("id", orderId)
        .single();
      
      // Fix #1: Log raw Supabase error IMMEDIATELY (this will show RLS messages)
      if (error) {
        console.error("[useOrder] ⚠️ Supabase raw error:", error);
        console.error("[useOrder] Error code:", (error as any)?.code);
        console.error("[useOrder] Error message:", (error as any)?.message);
        console.error("[useOrder] Error details:", (error as any)?.details);
        console.error("[useOrder] Error hint:", (error as any)?.hint);
        
        // Throw error to bubble up to TanStack Query
        throw error;
      }
      
      // Fix #3: Force error on null data (don't treat as success)
      if (!data) {
        console.error("[useOrder] ❌ No data returned (likely RLS blocking or order doesn't exist)");
        throw new Error(`Order not found: ${orderId}`);
      }
      
      // Type assertion to help TypeScript understand the data structure
      const orderData = data as Order;
      
      console.log("[useOrder] ✅ Order loaded successfully:", {
        id: orderData.id,
        invoiceNumber: (orderData as any).invoice_number,
        branchId: (orderData as any).branch_id,
      });
      
      return orderData;
    },
    enabled: !!orderId && typeof orderId === "string" && orderId !== "undefined" && orderId !== "null",
    retry: false, // Fix #3: Don't retry 404s or RLS errors
    refetchOnWindowFocus: true,
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
      
      // Log for debugging
      console.log("[useCreateOrder] Status calculation:", {
        startDate: startDate.toISOString(),
        today: today.toISOString(),
        calculatedStatus: orderStatus,
        isFuture: startDate > today
      });
      
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

      // Batch insert all items at once (much faster than sequential)
      const { error: itemsError } = await (supabase
        .from("order_items") as any)
        .insert(itemsWithOrderId);

      if (itemsError) throw itemsError;

      // Return order with items for optimistic updates
      return { ...order, items: itemsWithOrderId };
    },
    onSuccess: (_, variables) => {
      // Invalidate all orders queries (with and without branchId)
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      // Also invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
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
      const startDateOnly = orderData.start_date.split("T")[0];
      const endDateOnly = orderData.end_date.split("T")[0];

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

      return order;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
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
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
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
      status: "active" | "pending_return" | "completed" | "cancelled";
      lateFee?: number;
    }) => {
      const { data: currentOrderData, error: fetchError } = await supabase
        .from("orders")
        .select("total_amount, late_fee")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

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
      return data;
    },
    onSuccess: (_, orderId) => {
      // Invalidate all order-related queries
      queryClient.invalidateQueries({ queryKey: ["orders-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
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
        returnStatus: "returned" | "missing";
        actualReturnDate?: string;
        missingNote?: string;
      }>;
      lateFee?: number;
    }) => {
      // Get current authenticated user (cached, fast)
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error("Authentication required");
      }

      // Prepare item returns JSONB format
      const itemReturnsJsonb = itemReturns.map((ir) => ({
        item_id: ir.itemId,
        return_status: ir.returnStatus,
        actual_return_date: ir.actualReturnDate || new Date().toISOString(),
        missing_note: ir.missingNote || null,
      }));

      // Single database function call - all operations in one transaction (~50-100ms)
      const { data, error } = await (supabase.rpc as any)("process_order_return_optimized", {
        p_order_id: orderId,
        p_item_returns: itemReturnsJsonb,
        p_user_id: authUser.id,
        p_late_fee: lateFee,
      });

      if (error) {
        console.error("[useProcessOrderReturn] Database function error:", error);
        throw error;
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
          return {
            ...item,
            return_status: itemReturn.returnStatus as OrderItemReturnStatus,
            actual_return_date: itemReturn.actualReturnDate || new Date().toISOString(),
            late_return: isOrderLate(endDate),
            missing_note: itemReturn.missingNote || undefined,
          };
        }
        return item;
      });

      // Calculate new status
      const allReturned = updatedItems?.every((item) => item.return_status === "returned");
      const hasMissing = updatedItems?.some((item) => item.return_status === "missing");
      const hasNotReturned = updatedItems?.some(
        (item) => !item.return_status || item.return_status === "not_yet_returned"
      );

      let newStatus: OrderStatus = previousOrder.status;
      if (allReturned) {
        newStatus = "completed";
      } else if (hasMissing || hasNotReturned) {
        newStatus = "partially_returned";
      }

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
    // On success, invalidate to ensure consistency (background refetch)
    onSuccess: (_, variables) => {
      // Invalidate queries (will refetch in background, but UI already updated)
      queryClient.invalidateQueries({ queryKey: ["orders-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      
      // Force immediate refetch for orders list (ensures category updates)
      queryClient.refetchQueries({ queryKey: ["orders-infinite"] });
    },
  });
}

