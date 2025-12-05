"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { Save, Trash2 } from "lucide-react";
import { PageNavbar } from "@/components/layout/page-navbar";
import { useStaffMember, useUpdateStaff, useDeleteStaff } from "@/lib/queries/staff";
import { useBranches } from "@/lib/queries/branches";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RouteGuard } from "@/components/auth/route-guard";
import type { UserRole } from "@/lib/types";

export default function EditStaffPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.id as string;
  const { showToast } = useToast();
  const { user } = useUserStore();
  
  const { data: staff, isLoading } = useStaffMember(staffId);
  const { data: branches } = useBranches();
  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();
  
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [branchId, setBranchId] = useState<string>("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (staff) {
      setFullName(staff.full_name || "");
      setPhone(staff.phone || "");
      setRole(staff.role || "staff");
      setBranchId(staff.branch_id || "");
    }
  }, [staff?.id]); // Only depend on staff.id to prevent unnecessary re-runs

  // Filter available branches based on user role
  const availableBranches = branches?.filter((branch) => {
    if (user?.role === "super_admin") return true;
    if (user?.role === "branch_admin") return branch.id === user.branch_id;
    return false;
  }) || [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !phone.trim()) {
      showToast("Full name and phone are required", "error");
      return;
    }

    if (role !== "super_admin" && !branchId) {
      showToast("Branch is required for non-super admin roles", "error");
      return;
    }

    try {
      await updateStaffMutation.mutateAsync({
        id: staffId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        role,
        branch_id: role === "super_admin" ? undefined : branchId,
      });
      showToast("Staff member updated successfully", "success");
      router.push("/staff");
    } catch (error: any) {
      showToast(error.message || "Failed to update staff member", "error");
    }
  };

  const handleDelete = async () => {
    if (staff?.role === "super_admin") {
      showToast("Super admin accounts cannot be deleted", "error");
      setShowDeleteDialog(false);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteStaffMutation.mutateAsync(staffId);
      showToast("Staff member deleted successfully", "success");
      router.push("/staff");
    } catch (error: any) {
      showToast(error.message || "Failed to delete staff member", "error");
      setIsDeleting(false);
    }
  };

  if (isLoading || !staff) {
    return (
      <RouteGuard allowedRoles={["super_admin", "branch_admin"]} redirectTo="/orders">
        <div className="min-h-screen bg-[#f7f9fb] pb-24">
          <PageNavbar title="Edit Staff" backHref="/staff" />
          <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
            <Card className="p-8">
              <div className="text-center">Loading...</div>
            </Card>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard allowedRoles={["super_admin", "branch_admin"]} redirectTo="/orders">
      <div className="min-h-screen bg-[#f7f9fb] pb-24">
        <PageNavbar title="Edit Staff" backHref="/staff" />
        
        <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
          <Card className="p-6 md:p-8">
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <Label htmlFor="fullName" className="text-sm font-semibold">
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-semibold">
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(value);
                  }}
                  placeholder="Enter phone number"
                  className="mt-2"
                  maxLength={10}
                  required
                />
              </div>

              <div>
                <Label htmlFor="role" className="text-sm font-semibold">
                  Role *
                </Label>
                <Select
                  id="role"
                  value={role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setRole(newRole);
                    if (newRole === "super_admin") {
                      setBranchId("");
                    }
                  }}
                  className="mt-2"
                  disabled={staff.role === "super_admin" && user?.role !== "super_admin"}
                >
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="branch_admin">Branch Admin</SelectItem>
                  {user?.role === "super_admin" && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                </Select>
              </div>

              {role !== "super_admin" && (
                <div>
                  <Label htmlFor="branch" className="text-sm font-semibold">
                    Branch *
                  </Label>
                  <Select
                    id="branch"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="mt-2"
                    required
                  >
                    <SelectItem value="">Select branch</SelectItem>
                    {availableBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                {staff.role !== "super_admin" && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={updateStaffMutation.isPending || deleteStaffMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Staff
                  </Button>
                )}
                <div className={`flex gap-3 ${staff.role === "super_admin" ? "ml-auto" : ""}`}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/staff")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateStaffMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateStaffMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent onClose={() => setShowDeleteDialog(false)}>
            <DialogHeader>
              <DialogTitle>Delete Staff Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{staff.full_name}"? This action cannot be undone.
                <br /><br />
                <strong className="text-red-600">Warning:</strong> This will permanently delete the staff member's account.
                If they have existing orders, deletion will be prevented to maintain data integrity.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
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

