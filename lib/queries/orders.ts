import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";

export function useOrders(
  branchId: string | null, 
  page: number = 1, 
  pageSize: number = 20,
  filters?: {
    status?: "all" | "active" | "pending" | "completed";
    searchQuery?: string;
    dateRange?: { start: Date; end: Date };
  }
) {
  const supabase = createClient();
  
  // Set up real-time subscription for orders (updates across all devices)
  useRealtimeSubscription("orders", branchId);

  return useQuery({
    queryKey: ["orders", branchId, page, pageSize, filters],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Optimize: Only select fields we actually use
      let query = supabase
        .from("orders")
        .select("id, invoice_number, branch_id, staff_id, customer_id, start_date, end_date, start_datetime, end_datetime, status, total_amount, created_at, customer:customers(id, name, phone), branch:branches(id, name)", { count: "exact" })
        .order("created_at", { ascending: false });

      // Branch filter
      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      // Date range filter (server-side) - only apply if provided
      if (filters?.dateRange) {
        const startDate = filters.dateRange.start.toISOString().split("T")[0];
        const endDate = filters.dateRange.end.toISOString().split("T")[0];
        // Use gte and lte for date range filtering on created_at
        query = query.gte("created_at", startDate).lte("created_at", endDate + "T23:59:59");
      }

      // Status filter (server-side)
      if (filters?.status && filters.status !== "all") {
        if (filters.status === "active") {
          query = query.eq("status", "active");
        } else if (filters.status === "pending") {
          query = query.eq("status", "pending_return");
        } else if (filters.status === "completed") {
          query = query.eq("status", "completed");
        }
      }

      // Search filter (server-side) - search in invoice number
      // Note: Customer name/phone search requires a different approach with joins
      // For now, we search invoice_number server-side and filter customer fields client-side if needed
      if (filters?.searchQuery?.trim()) {
        const search = filters.searchQuery.trim();
        // Search invoice number (most common search)
        query = query.ilike("invoice_number", `%${search}%`);
      }

      // Apply pagination after all filters
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
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 30000, // Fallback refetch every 30 seconds
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
      
      // Prepare order data
      const orderInsert = {
        branch_id: orderData.branch_id,
        staff_id: orderData.staff_id,
        customer_id: orderData.customer_id,
        invoice_number: orderData.invoice_number,
        start_date: startDateOnly,
        end_date: endDateOnly,
        start_datetime: orderData.start_date,
        end_datetime: orderData.end_date,
        status: "active" as const,
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
      status: "active" | "pending_return" | "completed";
      lateFee?: number;
    }) => {
      // Get current order to calculate new total
      const { data: currentOrderData, error: fetchError } = await supabase
        .from("orders")
        .select("total_amount, late_fee")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      const currentOrder = currentOrderData as { total_amount?: number; late_fee?: number } | null;

      // Calculate new total: original total + new late fee - old late fee
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
    onSuccess: () => {
      // Invalidate all related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] }); // Customer dues may change
    },
  });
}

