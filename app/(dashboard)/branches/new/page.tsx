"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Building2 } from "lucide-react";
import { useCreateBranch } from "@/lib/queries/branches";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

export default function NewBranchPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const createBranchMutation = useCreateBranch();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

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

      await createBranchMutation.mutateAsync({
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim() || undefined,
      });

      showToast("Branch created successfully!", "success");
      router.push("/branches");
    } catch (error: any) {
      showToast(error.message || "Failed to create branch", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Minimal Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Link href="/branches" className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </Link>
          <h1 className="text-[9px] font-normal text-gray-500">New Branch</h1>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#273492]/10 rounded-lg">
              <Building2 className="h-6 w-6 text-[#273492]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Branch</h2>
              <p className="text-sm text-gray-600">Add a new branch location</p>
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
                Address <span className="text-[#e7342f]">*</span>
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
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Branch"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

