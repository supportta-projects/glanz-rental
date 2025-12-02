"use client";

import { MobileNav } from "@/components/layout/mobile-nav";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname(); // Must be called before any conditional returns
  const { user, setUser } = useUserStore();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // Fetch user profile if not in store
      if (!user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*, branch:branches(*)")
          .eq("id", session.user.id)
          .single();

        if (profileData) {
          // Type assertion for profile data
          const profile = profileData as any;
          setUser({
            id: profile.id,
            username: profile.username,
            role: profile.role,
            branch_id: profile.branch_id,
            full_name: profile.full_name,
            phone: profile.phone,
            gst_number: profile.gst_number,
            gst_enabled: profile.gst_enabled ?? false,
            gst_rate: profile.gst_rate ? parseFloat(String(profile.gst_rate)) : undefined,
            gst_included: profile.gst_included ?? false,
            upi_id: profile.upi_id,
            branch: profile.branch,
          });
        }
      }
      setLoading(false);
    };

    checkUser();
  }, [router, user, setUser, supabase]);

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
      <div className="flex-1 flex flex-col md:ml-[250px] min-w-0 overflow-hidden">
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
