import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";

export interface CustomerWithDues extends Customer {
  due_amount: number;
}

export function useCustomers(searchQuery?: string, page: number = 1, pageSize: number = 20) {
  const supabase = createClient();
  
  // Set up real-time subscription for customers (updates across all devices)
  useRealtimeSubscription("customers");

  return useQuery({
    queryKey: ["customers", searchQuery, page, pageSize],
    queryFn: async () => {
      // If no search query, fetch all customers (for client-side filtering)
      // Otherwise, use server-side filtering with pagination
      const from = (page - 1) * pageSize;
      const to = searchQuery ? from + pageSize - 1 : 9999; // Large limit when fetching all

      // Fetch customers with pagination
      let customersQuery = supabase
        .from("customers")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Only apply range if doing server-side pagination (with search)
      if (searchQuery && searchQuery.trim()) {
        customersQuery = customersQuery
          .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .range(from, to);
      } else {
        // Fetch all customers (up to 9999) for client-side filtering
        customersQuery = customersQuery.range(0, 9999);
      }

      const { data: customers, error: customersError, count } = await customersQuery;

      if (customersError) throw customersError;
      if (!customers || customers.length === 0) {
        return {
          data: [] as CustomerWithDues[],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        };
      }

      // Fetch pending orders for all customers to calculate dues - optimized batch query
      const customerIds = (customers as Customer[]).map((c) => c.id);
      
      // Only fetch orders if we have customers
      let duesMap = new Map<string, number>();
      if (customerIds.length > 0) {
        const { data: pendingOrders, error: ordersError } = await supabase
          .from("orders")
          .select("customer_id, total_amount, status")
          .in("customer_id", customerIds)
          .in("status", ["active", "pending_return"]);

        if (ordersError) throw ordersError;

        // Calculate dues - optimized single pass with Map for O(1) lookups
        if (pendingOrders && pendingOrders.length > 0) {
          for (let i = 0; i < pendingOrders.length; i++) {
            const order = pendingOrders[i] as any;
            const customerId = order.customer_id;
            const amount = order.total_amount || 0;
            duesMap.set(customerId, (duesMap.get(customerId) || 0) + amount);
          }
        }
      }

      // Add due_amount to each customer - optimized single pass with pre-allocated array
      const customersWithDues: CustomerWithDues[] = new Array(customers.length);
      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i] as Customer;
        customersWithDues[i] = {
          ...customer,
          due_amount: duesMap.get(customer.id) || 0,
        } as CustomerWithDues;
      }

      return {
        data: customersWithDues,
        total: count || 0,
        page,
        pageSize,
        totalPages: searchQuery ? Math.ceil((count || 0) / pageSize) : Math.ceil((count || 0) / pageSize),
      };
    },
    staleTime: 300000, // Cache for 5 minutes (increased for ultra-fast navigation)
    gcTime: 900000, // Keep in cache for 15 minutes (increased for instant page loads)
    refetchOnWindowFocus: false, // Disable refetch on focus for better performance
    refetchInterval: false, // Disable interval refetch
    refetchOnMount: false, // Use cached data if available for instant navigation
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}

export function useCustomer(customerId: string) {
  const supabase = createClient();
  
  // Set up real-time subscription for customer updates
  useRealtimeSubscription("customers");

  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (error) throw error;
      return data as Customer;
    },
    enabled: !!customerId,
  });
}

export function useCustomerOrders(customerId: string) {
  const supabase = createClient();
  
  // Set up real-time subscription for customer orders
  useRealtimeSubscription("orders");

  return useQuery({
    queryKey: ["customer-orders", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, branch:branches(*), staff:profiles(*)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!customerId,
  });
}

export function useUpdateCustomer() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      updates,
    }: {
      customerId: string;
      updates: Partial<Customer>;
    }) => {
      // Type assertion needed due to Supabase type generation
      const { data, error } = await (supabase
        .from("customers") as any)
        .update(updates)
        .eq("id", customerId)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (_, variables) => {
      // Invalidate all customer-related queries
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", variables.customerId] });
      // Also invalidate orders since customer changes affect order display
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useCreateCustomer() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData: {
      name: string;
      phone: string;
      address?: string | null;
      id_proof_type?: "aadhar" | "passport" | "voter" | "others" | null;
      id_proof_number?: string | null;
      id_proof_front_url?: string | null;
      id_proof_back_url?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: customerData.name.trim(),
          phone: customerData.phone.trim(),
          address: customerData.address?.trim() || null,
          id_proof_type: customerData.id_proof_type || null,
          id_proof_number: customerData.id_proof_number?.trim() || null,
          id_proof_front_url: customerData.id_proof_front_url || null,
          id_proof_back_url: customerData.id_proof_back_url || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      // Invalidate all customer-related queries
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      // Also invalidate orders since new customer may have orders
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useDeleteCustomer() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all customer-related queries
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      // Also invalidate orders since customer deletion affects orders
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

