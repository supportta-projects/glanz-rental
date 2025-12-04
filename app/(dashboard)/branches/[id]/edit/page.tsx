"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { StandardButton } from "@/components/shared/standard-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Building2 } from "lucide-react";
import { useUpdateBranch, useBranches } from "@/lib/queries/branches";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { RouteGuard } from "@/components/auth/route-guard";
import { PageNavbar } from "@/components/layout/page-navbar";
import { LoadingState, ErrorState } from "@/components/shared";

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = params.id as string;
  const { showToast } = useToast();
  const updateBranchMutation = useUpdateBranch();
  const { data: branches, isLoading: branchesLoading, error: branchesError } = useBranches();

  const branch = branches?.find((b) => b.id === branchId);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  // Initialize form data when branch loads
  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name || "",
        address: branch.address || "",
        phone: branch.phone || "",
      });
    }
  }, [branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        showToast("Branch name is required", "error");
        return;
      }

      if (!formData.address.trim()) {
        showToast("Branch address is required", "error");
        return;
      }

      await updateBranchMutation.mutateAsync({
        id: branchId,
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim() || undefined,
      });

      showToast("Branch updated successfully!", "success");
      router.push("/branches");
    } catch (error: any) {
      showToast(error.message || "Failed to update branch", "error");
    } finally {
      setLoading(false);
    }
  };

  if (branchesLoading) {
    return (
      <RouteGuard allowedRoles={["super_admin"]} redirectTo="/orders">
        <div className="min-h-screen bg-gray-50 pb-24">
          <PageNavbar title="Edit Branch" backHref="/branches" />
          <div className="p-4 md:p-6 max-w-2xl mx-auto">
            <LoadingState message="Loading branch details..." />
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (branchesError || !branch) {
    return (
      <RouteGuard allowedRoles={["super_admin"]} redirectTo="/orders">
        <div className="min-h-screen bg-gray-50 pb-24">
          <PageNavbar title="Edit Branch" backHref="/branches" />
          <div className="p-4 md:p-6 max-w-2xl mx-auto">
            <ErrorState message="Branch not found or failed to load" />
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard allowedRoles={["super_admin"]} redirectTo="/orders">
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Minimal Header */}
        <PageNavbar
          title="Edit Branch"
          subtitle="Update branch information"
          backHref="/branches"
        />

        <div className="p-4 md:p-6 max-w-2xl mx-auto">
          <Card className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#273492]/10 rounded-lg">
                <Building2 className="h-6 w-6 text-[#273492]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Branch</h2>
                <p className="text-sm text-gray-600">Update branch location details</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Branch Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Branch Name <span className="text-[#e7342f]">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Main Branch, Downtown Branch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12"
                  required
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold">
                  Address / Location <span className="text-[#e7342f]">*</span>
                </Label>
                <textarea
                  id="address"
                  placeholder="Enter full address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full h-24 px-4 py-3 text-sm rounded-lg border border-gray-200 focus:border-[#273492] focus:ring-1 focus:ring-[#273492] outline-none resize-none"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <StandardButton
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  type="submit"
                  variant="default"
                  className="flex-1"
                  disabled={loading}
                  loading={loading}
                >
                  {loading ? "Updating..." : "Update Branch"}
                </StandardButton>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </RouteGuard>
  );
}

