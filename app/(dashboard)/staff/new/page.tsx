"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StandardButton } from "@/components/shared/standard-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { ArrowLeft, UserCog, Eye, EyeOff } from "lucide-react";
import { useCreateStaff } from "@/lib/queries/staff";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import type { UserRole } from "@/lib/types";
import { RouteGuard } from "@/components/auth/route-guard";
import { PageNavbar } from "@/components/layout/page-navbar";
import { useBranches } from "@/lib/queries/branches";
import { useEffect } from "react";

export default function NewStaffPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useUserStore();
  const createStaffMutation = useCreateStaff();
  const { data: branches, isLoading: branchesLoading } = useBranches();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    role: "staff" as UserRole,
    branch_id: "", // Add branch_id to state
  });

  // Initialize branch_id for branch_admin
  useEffect(() => {
    if (user?.branch_id && !formData.branch_id && user.role === "branch_admin") {
      setFormData(prev => ({ ...prev, branch_id: user.branch_id || "" }));
    }
  }, [user?.branch_id, user?.role]);

  // Filter available branches based on user role
  const availableBranches = branches?.filter((branch) => {
    if (user?.role === "super_admin") return true; // Super admin can select any branch
    if (user?.role === "branch_admin") return branch.id === user.branch_id; // Branch admin can only select own branch
    return false;
  }) || [];

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.email.trim()) {
        showToast("Email is required", "error");
        setLoading(false);
        return;
      }

      if (!formData.email.includes("@")) {
        showToast("Please enter a valid email address", "error");
        setLoading(false);
        return;
      }

      if (!formData.password || formData.password.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        showToast("Passwords do not match", "error");
        setLoading(false);
        return;
      }

      if (!formData.full_name.trim()) {
        showToast("Full name is required", "error");
        setLoading(false);
        return;
      }

      if (!formData.branch_id) {
        showToast("Branch selection is required", "error");
        setLoading(false);
        return;
      }

      // Use selected role and branch from form
      await createStaffMutation.mutateAsync({
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        phone: "", // Not required
        role: formData.role,
        branch_id: formData.branch_id, // Use selected branch
        username: formData.email.trim(), // Use email as username
      });

      showToast("Staff member created successfully!", "success");
      router.push("/staff");
    } catch (error: any) {
      console.error("Staff creation error:", error);
      showToast(error.message || "Failed to create staff member", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteGuard allowedRoles={["super_admin", "branch_admin"]} redirectTo="/orders">
      <div className="min-h-screen bg-gray-50 pb-24">
      {/* Minimal Header */}
      <PageNavbar
        title="New Staff"
        subtitle="Add a new staff member"
        backHref="/staff"
      />

      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#273492]/10 rounded-lg">
              <UserCog className="h-6 w-6 text-[#273492]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add New Staff</h2>
              <p className="text-sm text-gray-600">Create a new staff member account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email <span className="text-[#e7342f]">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="staff@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password <span className="text-[#e7342f]">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12 pr-12"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                Confirm Password <span className="text-[#e7342f]">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="h-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-semibold">
                Full Name <span className="text-[#e7342f]">*</span>
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Enter full name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="h-12"
                required
              />
            </div>

            {/* Role - Only super_admin can select branch_admin */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-semibold">
                Role <span className="text-[#e7342f]">*</span>
              </Label>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                disabled={user?.role !== "super_admin"}
              >
                {user?.role === "super_admin" && (
                  <>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="branch_admin">Branch Admin</SelectItem>
                  </>
                )}
                {user?.role === "branch_admin" && (
                  <SelectItem value="staff">Staff</SelectItem>
                )}
              </Select>
              {user?.role === "branch_admin" && (
                <p className="text-xs text-gray-500 mt-1">
                  Branch admins can only create staff members.
                </p>
              )}
            </div>

            {/* Branch - Required, filtered by user role */}
            <div className="space-y-2">
              <Label htmlFor="branch_id" className="text-sm font-semibold">
                Branch <span className="text-[#e7342f]">*</span>
              </Label>
              <Select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                disabled={branchesLoading || availableBranches.length === 0 || (user?.role === "branch_admin")}
                required
              >
                <SelectItem value="">Select a branch</SelectItem>
                {availableBranches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </Select>
              {user?.role === "branch_admin" && (
                <p className="text-xs text-gray-500 mt-1">
                  Branch admins can only create staff for their own branch.
                </p>
              )}
              {availableBranches.length === 0 && !branchesLoading && (
                <p className="text-xs text-red-500 mt-1">
                  No branches available. Please create a branch first.
                </p>
              )}
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
                disabled={loading || !formData.branch_id}
                loading={loading}
              >
                {loading ? "Creating..." : "Create Staff"}
              </StandardButton>
            </div>
          </form>
        </Card>
      </div>
    </div>
    </RouteGuard>
  );
}
