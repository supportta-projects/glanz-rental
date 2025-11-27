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
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Fetch customers with pagination
      let customersQuery = supabase
        .from("customers")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (searchQuery && searchQuery.trim()) {
        customersQuery = customersQuery.or(
          `name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        );
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

      // Fetch pending orders for all customers to calculate dues
      const customerIds = (customers as Customer[]).map((c) => c.id);
      const { data: pendingOrders, error: ordersError } = await supabase
        .from("orders")
        .select("customer_id, total_amount, status")
        .in("customer_id", customerIds)
        .in("status", ["active", "pending_return"]);

      if (ordersError) throw ordersError;

      // Calculate dues for each customer
      const duesMap = new Map<string, number>();
      (pendingOrders || []).forEach((order: any) => {
        const current = duesMap.get(order.customer_id) || 0;
        duesMap.set(order.customer_id, current + (order.total_amount || 0));
      });

      // Add due_amount to each customer
      const customersWithDues = (customers as Customer[]).map((customer) => ({
        ...customer,
        due_amount: duesMap.get(customer.id) || 0,
      })) as CustomerWithDues[];

      return {
        data: customersWithDues,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 30000, // Fallback refetch every 30 seconds
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

