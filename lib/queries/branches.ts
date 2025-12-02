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
    },
  });
}

