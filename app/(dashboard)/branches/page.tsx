"use client";

// Static for branches (as per requirements)
export const dynamic = 'force-static';

import { useUserStore } from "@/lib/stores/useUserStore";
import { Building2, ShieldX } from "lucide-react";
import { PageHeader, EmptyState, ActionButton } from "@/components/shared";
import Link from "next/link";

export default function BranchesPage() {
  const { user } = useUserStore();

  // Only Super Admin can access
  if (user?.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-[#f7f9fb] p-4 md:p-6 flex items-center justify-center">
        <EmptyState
          icon={<ShieldX className="h-16 w-16" />}
          title="Access denied"
          description="Only Super Admin can manage branches"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] pb-24">
      <PageHeader
        title="Branches"
        actions={
          <Link href="/branches/new">
            <ActionButton label="Add Branch" onClick={() => {}} />
          </Link>
        }
      />

      <div className="px-4 md:px-6 py-4">
        <EmptyState
          icon={<Building2 className="h-16 w-16" />}
          title="Branch management coming soon"
          description="Create, edit, and manage branches"
        />
      </div>
    </div>
  );
}

