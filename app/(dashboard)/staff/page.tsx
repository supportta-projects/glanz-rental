"use client";

import { useUserStore } from "@/lib/stores/useUserStore";
import { UserCog, User, Phone, Building2, Shield, Trash2, Edit } from "lucide-react";
import { PageHeader, EmptyState, ActionButton, LoadingState, ErrorState } from "@/components/shared";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import { useStaff, useDeleteStaff } from "@/lib/queries/staff";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RouteGuard } from "@/components/auth/route-guard";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils/date";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const { showToast } = useToast();
  // Filter by branch if user is branch admin
  const branchId = user?.role === "super_admin" ? null : user?.branch_id || null;
  const { data: staff, isLoading, error } = useStaff(branchId);
  const deleteStaffMutation = useDeleteStaff();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string; role: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteClick = (member: { id: string; full_name: string; role: string }) => {
    if (member.role === "super_admin") {
      showToast("Super admin accounts cannot be deleted", "error");
      return;
    }
    setStaffToDelete({ id: member.id, name: member.full_name, role: member.role });
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;

    setIsDeleting(true);
    try {
      await deleteStaffMutation.mutateAsync(staffToDelete.id);
      showToast("Staff member deleted successfully", "success");
      setShowDeleteDialog(false);
      setStaffToDelete(null);
    } catch (error: any) {
      showToast(error.message || "Failed to delete staff member", "error");
      setIsDeleting(false);
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
              const isSuperAdmin = user?.role === "super_admin";
              const canEdit = isSuperAdmin || (user?.role === "branch_admin" && member.branch_id === user?.branch_id);
              const canDelete = isSuperAdmin && member.role !== "super_admin"; // Only super admin can delete, but not super admin accounts
              const RoleIcon = getRoleIcon(member.role);
              
              return (
                <Card 
                  key={member.id} 
                  className="group relative overflow-hidden transition-all duration-300 bg-white border border-gray-200 hover:border-[#273492]/30 hover:shadow-lg"
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
                          member.role === "super_admin"
                            ? "bg-gradient-to-br from-purple-100 to-purple-200"
                            : member.role === "branch_admin"
                            ? "bg-gradient-to-br from-blue-100 to-blue-200"
                            : "bg-gradient-to-br from-[#273492]/10 to-[#273492]/20"
                        } rounded-xl p-3 shadow-sm`}>
                          <RoleIcon className={`h-6 w-6 ${
                            member.role === "super_admin"
                              ? "text-purple-600"
                              : member.role === "branch_admin"
                              ? "text-blue-600"
                              : "text-[#273492]"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold mb-1 truncate text-gray-900">
                            {member.full_name}
                          </h3>
                          <p className="text-sm truncate text-gray-500">
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

                    {/* Actions */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between gap-3">
                        {/* Super Admin Indicator */}
                        {member.role === "super_admin" && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-lg">
                            <Shield className="h-3 w-3 text-purple-600" />
                            <span className="text-xs font-medium text-purple-700">Protected</span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-auto">
                          {/* Edit Button */}
                          {canEdit && (
                            <Link href={`/staff/${member.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 text-xs font-semibold"
                                title="Edit staff member"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                Edit
                              </Button>
                            </Link>
                          )}

                          {/* Delete Button - Only for super admin, and not for super admin accounts */}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(member)}
                              disabled={deleteStaffMutation.isPending}
                              className="h-8 px-3 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete staff member"
                            >
                              {deleteStaffMutation.isPending ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                              ) : (
                                <>
                                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                  Delete
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <FloatingActionButton href="/staff/new" label="Add Staff" />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClose={() => setShowDeleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{staffToDelete?.name}"? This action cannot be undone.
              <br /><br />
              <strong className="text-red-600">Warning:</strong> This will permanently delete the staff member's account.
              If they have existing orders, deletion will be prevented to maintain data integrity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setStaffToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Staff Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RouteGuard>
  );
}
