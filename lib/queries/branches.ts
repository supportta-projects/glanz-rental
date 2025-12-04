import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Branch } from "@/lib/types";

export function useBranches() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as Branch[];
    },
  });
}

export function useCreateBranch() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (branchData: { name: string; address: string; phone?: string }) => {
      const { data, error } = await (supabase
        .from("branches") as any)
        .insert([branchData])
        .select()
        .single();

      if (error) throw error;
      return data as Branch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useUpdateBranch() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      address?: string;
      phone?: string;
    }) => {
      const { data, error } = await (supabase
        .from("branches") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Branch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["branch"] });
    },
  });
}

export function useBranch(branchId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["branch", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("id", branchId)
        .single();

      if (error) throw error;
      return data as Branch;
    },
    enabled: !!branchId,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
}

export function useDeleteBranch() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (branchId: string) => {
      // Check for orders first
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("branch_id", branchId)
        .limit(1);

      if (ordersError) throw ordersError;

      if (orders && orders.length > 0) {
        throw new Error("Cannot delete branch with existing orders. Please delete or reassign orders first.");
      }

      // Delete branch (staff.branch_id will be set to NULL automatically via ON DELETE SET NULL)
      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", branchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["branch"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] }); // Invalidate staff to refresh branch assignments
    },
  });
}

