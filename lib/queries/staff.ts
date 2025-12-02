import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { User, UserRole } from "@/lib/types";

export function useStaff(branchId?: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["staff", branchId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*, branch:branches(*)")
        .order("full_name", { ascending: true });

      // Filter by branch if provided
      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as User[];
    },
    enabled: true,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staffData: {
      email: string;
      password: string;
      full_name: string;
      phone: string;
      role: UserRole;
      branch_id: string;
      username: string;
    }) => {
      // Use API route that has service role access
      const response = await fetch("/api/staff/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(staffData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create staff member");
      }

      const { data } = await response.json();
      return data as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useUpdateStaff() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      full_name?: string;
      phone?: string;
      role?: UserRole;
      branch_id?: string;
    }) => {
      const { data, error } = await (supabase
        .from("profiles") as any)
        .update(updates)
        .eq("id", id)
        .select("*, branch:branches(*)")
        .single();

      if (error) throw error;
      return data as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

