import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, Branch } from "@/lib/types";

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  switchBranch: (branchId: string | null, branch?: Branch) => void;
}

// Memoized selector for branch_id (prevents unnecessary re-renders)
export const useBranchId = () => 
  useUserStore((state) => state.user?.branch_id);

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      switchBranch: (branchId, branch) => set((state) => ({
        user: state.user ? { ...state.user, branch_id: branchId, branch } : null,
      })),
    }),
    {
      name: "glanz-user-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist user data, not sensitive info
      partialize: (state) => ({ user: state.user }),
    }
  )
);

