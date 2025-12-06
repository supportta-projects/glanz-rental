"use client";

import { MobileNav } from "@/components/layout/mobile-nav";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { getMainBranch, getMainBranchId } from "@/lib/utils/branches";
import type { Branch } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname(); // Must be called before any conditional returns
  const { user, setUser } = useUserStore();
  const queryClient = useQueryClient();
  
  // ✅ FIX: Use useRef to store stable supabase client reference
  // This prevents the dependency array from changing size between renders
  const supabaseRef = useRef(createClient());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabaseRef.current.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // ✅ FIX: Wait a tick to ensure Zustand persist has hydrated from localStorage
      // This ensures we can read the persisted branch_id before overwriting it
      await new Promise(resolve => setTimeout(resolve, 0));

      // ✅ FIX: Always fetch fresh profile data from database on refresh
      // This ensures we get the latest data and can reset branch_id for super_admin
      const { data: profileData } = await supabaseRef.current
        .from("profiles")
        .select("*, branch:branches(*)")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        // Type assertion for profile data
        const profile = profileData as any;
        
        // ✅ FIX: Get persisted user state AFTER hydration (read from store again)
        // This preserves manual branch selection for super_admin across refreshes
        const persistedUser = useUserStore.getState().user;
        
        // ✅ FIX: For shop admins (branch_admin, staff), always use main branch (ignore persisted selection)
        // For super_admin, preserve persisted branch_id if it exists, otherwise keep null
        let branchId: string | null;
        let branch: Branch | null = null;

        if (profile.role === "super_admin") {
          // ✅ FIX: For super_admin, preserve persisted branch_id if it exists
          // This allows super_admin to switch branches and have it persist across refreshes
          if (persistedUser?.branch_id && persistedUser.id === profile.id) {
            // Only use persisted branch_id if it's for the same user
            branchId = persistedUser.branch_id;
            branch = persistedUser.branch || null;
          } else {
            branchId = null; // Super admin starts with no branch selected
          }
        } else {
          // For shop admins (branch_admin, staff), always use main branch (they can't switch)
          const mainBranchId = await getMainBranchId();
          branchId = mainBranchId || profile.branch_id; // Use main branch or fallback to profile branch_id
          
          // Fetch branch details if we have a branch_id
          if (branchId) {
            // If we got main branch ID, fetch its details
            if (mainBranchId) {
              const mainBranch = await getMainBranch();
              branch = mainBranch || null;
            } else {
              // Use the branch from profile if main branch not found
              branch = profile.branch || null;
            }
          }
        }
        
        setUser({
          id: profile.id,
          username: profile.username,
          role: profile.role,
          branch_id: branchId,
          full_name: profile.full_name,
          phone: profile.phone,
          gst_number: profile.gst_number,
          gst_enabled: profile.gst_enabled ?? false,
          gst_rate: profile.gst_rate ? parseFloat(String(profile.gst_rate)) : undefined,
          gst_included: profile.gst_included ?? false,
          upi_id: profile.upi_id,
          company_name: profile.company_name,
          company_logo_url: profile.company_logo_url,
          branch: branch || undefined,
        });

        // ✅ FIX: Invalidate and refetch all queries after setting branch_id so they refetch with new branch
        if (branchId) {
          // Use a longer timeout to ensure pages have mounted and queries are initialized
          setTimeout(() => {
            queryClient.invalidateQueries();
            // ✅ FIX: Also explicitly refetch active queries for immediate data loading
            queryClient.refetchQueries({ type: 'active' });
          }, 300);
        }
      }
      setLoading(false);
    };

    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array is now safe - supabase is stored in ref, router and setUser are stable

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#273492]" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f7f9fb] flex flex-col overflow-hidden">
      {/* Desktop Sidebar - Only on desktop */}
      <DesktopSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-[260px] min-w-0 overflow-hidden">
        {/* Page Content - Scrollable with optimized rendering */}
        <main 
          data-scroll-container="true"
          className="flex-1 overflow-y-auto pb-28 md:pb-6 overscroll-contain"
          style={{ 
            WebkitOverflowScrolling: "touch",
            willChange: "scroll-position", // Optimize scrolling performance
          }}
        >
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
