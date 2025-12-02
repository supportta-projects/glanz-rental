"use client";

import { useUserStore } from "@/lib/stores/useUserStore";
import { Building2, ShieldX, MapPin, Phone } from "lucide-react";
import { PageHeader, EmptyState, ActionButton, LoadingState, ErrorState } from "@/components/shared";
import { useBranches } from "@/lib/queries/branches";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function BranchesPage() {
  const { user } = useUserStore();
  const { data: branches, isLoading, error } = useBranches();

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
        description={branches ? `${branches.length} branch${branches.length !== 1 ? "es" : ""}` : undefined}
        actions={
          <Link href="/branches/new">
            <ActionButton label="Add Branch" onClick={() => {}} />
          </Link>
        }
      />

      <div className="px-4 md:px-6 py-4">
        {isLoading ? (
          <LoadingState message="Loading branches..." />
        ) : error ? (
          <ErrorState message="Failed to load branches" />
        ) : !branches || branches.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-16 w-16" />}
            title="No branches yet"
            description="Create your first branch to get started"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <Card key={branch.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#273492]/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-[#273492]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {branch.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{branch.address}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

