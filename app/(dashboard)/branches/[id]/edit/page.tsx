"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Save, Trash2 } from "lucide-react";
import { PageNavbar } from "@/components/layout/page-navbar";
import { useBranch, useUpdateBranch, useDeleteBranch } from "@/lib/queries/branches";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RouteGuard } from "@/components/auth/route-guard";

export default function EditBranchPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;
  const { showToast } = useToast();
  
  const { data: branch, isLoading, error } = useBranch(branchId);
  const updateBranchMutation = useUpdateBranch();
  const deleteBranchMutation = useDeleteBranch();
  
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (branch) {
      setName(branch.name || "");
      setAddress(branch.address || "");
      setPhone(branch.phone || "");
    }
  }, [branch]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !address.trim()) {
      showToast("Name and address are required", "error");
      return;
    }

    try {
      await updateBranchMutation.mutateAsync({
        id: branchId,
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
      });
      showToast("Branch updated successfully", "success");
      router.push("/branches");
    } catch (error: any) {
      showToast(error.message || "Failed to update branch", "error");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteBranchMutation.mutateAsync(branchId);
      showToast("Branch deleted successfully", "success");
      router.push("/branches");
    } catch (error: any) {
      showToast(error.message || "Failed to delete branch", "error");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <RouteGuard allowedRoles={["super_admin"]} redirectTo="/orders">
        <div className="min-h-screen bg-[#f7f9fb] pb-24">
          <PageNavbar title="Edit Branch" backHref="/branches" />
          <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
            <Card className="p-8">
              <div className="text-center">Loading...</div>
            </Card>
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (error || !branch) {
    return (
      <RouteGuard allowedRoles={["super_admin"]} redirectTo="/orders">
        <div className="min-h-screen bg-[#f7f9fb] pb-24">
          <PageNavbar title="Edit Branch" backHref="/branches" />
          <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
            <Card className="p-8 text-center">
              <p className="text-red-600 mb-4">Failed to load branch</p>
              <Button variant="outline" onClick={() => router.push("/branches")}>
                Back to Branches
              </Button>
            </Card>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard allowedRoles={["super_admin"]} redirectTo="/orders">
      <div className="min-h-screen bg-[#f7f9fb] pb-24">
        <PageNavbar title="Edit Branch" backHref="/branches" />
        
        <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
          <Card className="p-6 md:p-8">
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-sm font-semibold">
                  Branch Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter branch name"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-sm font-semibold">
                  Address *
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter branch address"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="mt-2"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={updateBranchMutation.isPending || deleteBranchMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Branch
                </Button>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/branches")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateBranchMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateBranchMutation.isPending ? "Saving..." : "Save Changes"}
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
              <DialogTitle>Delete Branch</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{branch.name}"? This action cannot be undone.
                <br /><br />
                <strong className="text-red-600">Warning:</strong> This will also delete all orders associated with this branch.
                Staff members assigned to this branch will have their branch assignment removed.
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
                {isDeleting ? "Deleting..." : "Delete Branch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  );
}
