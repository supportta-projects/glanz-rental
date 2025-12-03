"use client";

import { useUserStore } from "@/lib/stores/useUserStore";
import { UserCog, User, Phone, Building2, ToggleLeft, ToggleRight, Shield, Mail, Clock } from "lucide-react";
import { PageHeader, EmptyState, ActionButton, LoadingState, ErrorState } from "@/components/shared";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import { useStaff, useUpdateStaff } from "@/lib/queries/staff";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RouteGuard } from "@/components/auth/route-guard";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils/date";

export default function StaffPage() {
  const { user } = useUserStore();
  const { showToast } = useToast();
  // Filter by branch if user is branch admin
  const branchId = user?.role === "super_admin" ? null : user?.branch_id || null;
  const { data: staff, isLoading, error } = useStaff(branchId);
  const updateStaffMutation = useUpdateStaff();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0";
      case "branch_admin":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0";
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
        return Shield;
      case "branch_admin":
        return UserCog;
      default:
        return User;
    }
  };

  const handleToggleActive = async (staffId: string, currentStatus: boolean, memberRole: string) => {
    // Prevent deactivating super admin
    if (memberRole === "super_admin") {
      showToast("Super admin accounts cannot be deactivated", "error");
      return;
    }

    try {
      await updateStaffMutation.mutateAsync({
        id: staffId,
        is_active: !currentStatus,
      });
      showToast(
        `Staff ${!currentStatus ? "activated" : "deactivated"} successfully`,
        "success"
      );
    } catch (error: any) {
      showToast(error.message || "Failed to update staff status", "error");
    }
  };

  return (
    <RouteGuard allowedRoles={["super_admin", "branch_admin"]} redirectTo="/orders">
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

      <div className="px-4 md:px-6 py-4 max-w-7xl mx-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {staff.map((member) => {
              // Explicitly check is_active - undefined/null means active (default), false means inactive
              const isActive = member.is_active === undefined || member.is_active === null ? true : member.is_active;
              const isSuperAdmin = user?.role === "super_admin";
              const canToggleActive = isSuperAdmin && member.role !== "super_admin"; // Only super admin can toggle, but not for super admin accounts
              const RoleIcon = getRoleIcon(member.role);
              
              return (
                <Card 
                  key={member.id} 
                  className={`group relative overflow-hidden transition-all duration-300 ${
                    isActive 
                      ? "bg-white border border-gray-200 hover:border-[#273492]/30 hover:shadow-lg" 
                      : "bg-gray-50 border border-gray-300 opacity-75"
                  }`}
                >
                  {/* Gradient accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    member.role === "super_admin" 
                      ? "bg-gradient-to-r from-purple-500 to-purple-600"
                      : member.role === "branch_admin"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600"
                      : "bg-gradient-to-r from-gray-500 to-gray-600"
                  }`} />

                  <div className="p-6">
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Avatar with role icon */}
                        <div className={`relative flex-shrink-0 ${
                          isActive 
                            ? member.role === "super_admin"
                              ? "bg-gradient-to-br from-purple-100 to-purple-200"
                              : member.role === "branch_admin"
                              ? "bg-gradient-to-br from-blue-100 to-blue-200"
                              : "bg-gradient-to-br from-[#273492]/10 to-[#273492]/20"
                            : "bg-gray-200"
                        } rounded-xl p-3 shadow-sm`}>
                          <RoleIcon className={`h-6 w-6 ${
                            isActive 
                              ? member.role === "super_admin"
                                ? "text-purple-600"
                                : member.role === "branch_admin"
                                ? "text-blue-600"
                                : "text-[#273492]"
                              : "text-gray-400"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg font-bold mb-1 truncate ${
                            isActive ? "text-gray-900" : "text-gray-400"
                          }`}>
                            {member.full_name}
                          </h3>
                          <p className={`text-sm truncate ${
                            isActive ? "text-gray-500" : "text-gray-400"
                          }`}>
                            @{member.username}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className="mb-4">
                      <Badge className={`${getRoleBadgeColor(member.role)} text-xs font-semibold px-3 py-1 shadow-sm`}>
                        {getRoleLabel(member.role)}
                      </Badge>
                    </div>

                    {/* Details Section */}
                    <div className="space-y-3 mb-4">
                      {member.phone && (
                        <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="p-1.5 bg-white rounded-md shadow-sm">
                            <Phone className="h-4 w-4 text-gray-600" />
                          </div>
                          <a
                            href={`tel:${member.phone}`}
                            className="text-sm font-medium text-gray-700 hover:text-[#273492] transition-colors flex-1 truncate"
                          >
                            {member.phone}
                          </a>
                        </div>
                      )}
                      {member.branch && (
                        <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="p-1.5 bg-white rounded-md shadow-sm">
                            <Building2 className="h-4 w-4 text-gray-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                            {member.branch.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${
                            isActive ? "bg-green-500" : "bg-gray-400"
                          } animate-pulse`} />
                          <span className={`text-xs font-semibold ${
                            isActive ? "text-green-700" : "text-gray-500"
                          }`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {/* Toggle Button - Only for super admin, and not for super admin accounts */}
                        {canToggleActive && (
                          <button
                            onClick={() => handleToggleActive(member.id, isActive, member.role)}
                            disabled={updateStaffMutation.isPending}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md active:scale-[0.97] ${
                              isActive
                                ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                                : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isActive ? "Click to deactivate" : "Click to activate"}
                          >
                            {updateStaffMutation.isPending ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                            ) : isActive ? (
                              <>
                                <ToggleRight className="h-3.5 w-3.5" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-3.5 w-3.5" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Super Admin Indicator */}
                        {member.role === "super_admin" && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-lg">
                            <Shield className="h-3 w-3 text-purple-600" />
                            <span className="text-xs font-medium text-purple-700">Protected</span>
                          </div>
                        )}
                      </div>

                      {/* Inactive Warning */}
                      {!isActive && (
                        <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-700 font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            This account cannot log in
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <FloatingActionButton href="/staff/new" label="Add Staff" />
    </div>
    </RouteGuard>
  );
}
