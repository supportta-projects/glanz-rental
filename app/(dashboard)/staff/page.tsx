"use client";

import { useUserStore } from "@/lib/stores/useUserStore";
import { UserCog, ShieldX, User, Phone, Building2 } from "lucide-react";
import { PageHeader, EmptyState, ActionButton, LoadingState, ErrorState } from "@/components/shared";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import { useStaff } from "@/lib/queries/staff";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StaffPage() {
  const { user } = useUserStore();
  // Filter by branch if user is branch admin
  const branchId = user?.role === "super_admin" ? null : user?.branch_id || null;
  const { data: staff, isLoading, error } = useStaff(branchId);

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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-700";
      case "branch_admin":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "branch_admin":
        return "Branch Admin";
      default:
        return "Staff";
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] pb-24">
      <PageHeader
        title="Staff Management"
        description={staff ? `${staff.length} staff member${staff.length !== 1 ? "s" : ""}` : undefined}
        actions={
          <Link href="/staff/new" className="hidden md:flex">
            <ActionButton label="Add Staff" onClick={() => {}} />
          </Link>
        }
      />

      <div className="px-4 md:px-6 py-4">
        {isLoading ? (
          <LoadingState message="Loading staff..." />
        ) : error ? (
          <ErrorState message="Failed to load staff" />
        ) : !staff || staff.length === 0 ? (
          <EmptyState
            icon={<UserCog className="h-16 w-16" />}
            title="No staff members yet"
            description="Add your first staff member to get started"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((member) => (
              <Card key={member.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#273492]/10 rounded-lg">
                      <User className="h-5 w-5 text-[#273492]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{member.full_name}</h3>
                      <p className="text-sm text-gray-500">@{member.username}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Badge className={getRoleBadgeColor(member.role)}>
                    {getRoleLabel(member.role)}
                  </Badge>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.branch && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4 flex-shrink-0" />
                      <span>{member.branch.name}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FloatingActionButton href="/staff/new" label="Add Staff" />
    </div>
  );
}

