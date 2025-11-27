"use client";

import { MobileNav } from "@/components/layout/mobile-nav";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
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
        const { data: profile } = await supabase
          .from("profiles")
          .select("*, branch:branches(*)")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUser({
            id: profile.id,
            username: profile.username,
            role: profile.role,
            branch_id: profile.branch_id,
            full_name: profile.full_name,
            phone: profile.phone,
            gst_number: profile.gst_number,
            gst_enabled: profile.gst_enabled ?? false,
            gst_rate: profile.gst_rate ? parseFloat(profile.gst_rate) : undefined,
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
      {/* Desktop Sidebar - Only on desktop */}
      <DesktopSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopHeader />

        {/* Page Content - Scrollable */}
        <main 
          data-scroll-container="true"
          className="flex-1 overflow-y-auto pb-28 md:pb-6 overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
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
