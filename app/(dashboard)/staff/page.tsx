"use client";

// Static for staff (as per requirements)
export const dynamic = 'force-static';

import { useUserStore } from "@/lib/stores/useUserStore";
import { UserCog, ShieldX } from "lucide-react";
import { PageHeader, EmptyState, ActionButton } from "@/components/shared";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import Link from "next/link";

export default function StaffPage() {
  const { user } = useUserStore();

  // Only Super Admin and Branch Admin can access
  if (user?.role === "staff") {
    return (
      <div className="min-h-screen bg-[#f7f9fb] p-4 md:p-6 flex items-center justify-center">
        <EmptyState
          icon={<ShieldX className="h-16 w-16" />}
          title="Access denied"
          description="Only Admins can manage staff"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] pb-24">
      <PageHeader
        title="Staff Management"
        actions={
          <Link href="/staff/new" className="hidden md:flex">
            <ActionButton label="Add Staff" onClick={() => {}} />
          </Link>
        }
      />

      <div className="px-4 md:px-6 py-4">
        <EmptyState
          icon={<UserCog className="h-16 w-16" />}
          title="Staff management coming soon"
          description="Add and manage staff members"
        />
      </div>

      <FloatingActionButton href="/staff/new" label="Add Staff" />
    </div>
  );
}

