"use client";

import { useUserStore } from "@/lib/stores/useUserStore";
import { Building2, ShieldX, MapPin, Phone, Edit, Trash2 } from "lucide-react";
import { PageHeader, EmptyState, ActionButton, LoadingState, ErrorState } from "@/components/shared";
import { useBranches, useDeleteBranch } from "@/lib/queries/branches";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RouteGuard } from "@/components/auth/route-guard";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BranchesPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const { showToast } = useToast();
  const { data: branches, isLoading, error } = useBranches();
  const deleteBranchMutation = useDeleteBranch();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (branch: { id: string; name: string }) => {
    setBranchToDelete(branch);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteBranchMutation.mutateAsync(branchToDelete.id);
      showToast("Branch deleted successfully", "success");
      setShowDeleteDialog(false);
      setBranchToDelete(null);
    } catch (error: any) {
      showToast(error.message || "Failed to delete branch", "error");
      setIsDeleting(false);
    }
  };

  return (
    <RouteGuard allowedRoles={["super_admin"]} redirectTo="/orders">

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
              <Card key={branch.id} className="p-6 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-[#273492]/10 rounded-lg flex-shrink-0">
                      <Building2 className="h-5 w-5 text-[#273492]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{branch.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/branches/${branch.id}/edit`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit branch"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteClick(branch)}
                      disabled={deleteBranchMutation.isPending}
                      title="Delete branch"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClose={() => setShowDeleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{branchToDelete?.name}"? This action cannot be undone.
              <br /><br />
              <strong className="text-red-600">Warning:</strong> This will also delete all orders associated with this branch.
              Staff members assigned to this branch will have their branch assignment removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setBranchToDelete(null);
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
              {isDeleting ? "Deleting..." : "Delete Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RouteGuard>
  );
}

