"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { ArrowLeft, UserCog, Eye, EyeOff } from "lucide-react";
import { useCreateStaff } from "@/lib/queries/staff";
import { useBranches } from "@/lib/queries/branches";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import type { UserRole } from "@/lib/types";

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
    phone: "",
    role: "staff" as UserRole,
    branch_id: user?.branch_id || "",
    username: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter branches based on user role
  const availableBranches = branches?.filter((branch) => {
    if (user?.role === "super_admin") return true;
    if (user?.role === "branch_admin") return branch.id === user.branch_id;
    return false;
  }) || [];

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

      if (!formData.phone.trim()) {
        showToast("Phone number is required", "error");
        setLoading(false);
        return;
      }

      if (!formData.branch_id) {
        showToast("Please select a branch", "error");
        setLoading(false);
        return;
      }

      if (!formData.username.trim()) {
        showToast("Username is required", "error");
        setLoading(false);
        return;
      }

      await createStaffMutation.mutateAsync({
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        branch_id: formData.branch_id,
        username: formData.username.trim(),
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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Minimal Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Link href="/staff" className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </Link>
          <h1 className="text-[9px] font-normal text-gray-500">New Staff</h1>
        </div>
      </div>

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

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold">
                Username <span className="text-[#e7342f]">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">
                Phone Number <span className="text-[#e7342f]">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-12"
                required
              />
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <Label htmlFor="branch_id" className="text-sm font-semibold">
                Branch <span className="text-[#e7342f]">*</span>
              </Label>
              <Select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                disabled={branchesLoading || availableBranches.length === 0}
              >
                <SelectItem value="">Select a branch</SelectItem>
                {availableBranches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </Select>
              {availableBranches.length === 0 && !branchesLoading && (
                <p className="text-xs text-gray-500 mt-1">
                  No branches available. Please create a branch first.
                </p>
              )}
            </div>

            {/* Role */}
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
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#273492] hover:bg-[#1f2a7a]"
                disabled={loading || branchesLoading || availableBranches.length === 0}
              >
                {loading ? "Creating..." : "Create Staff"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
