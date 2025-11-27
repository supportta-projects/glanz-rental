"use client";

import { Card } from "@/components/ui/card";
import { useUserStore } from "@/lib/stores/useUserStore";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function BranchesPage() {
  const { user } = useUserStore();

  // Only Super Admin can access
  if (user?.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-zinc-50 p-4 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-500">Access denied</p>
          <p className="text-sm text-gray-400 mt-2">
            Only Super Admin can manage branches
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <div className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
        <Button className="bg-sky-500 hover:bg-sky-600">
          <Plus className="h-5 w-5 mr-2" />
          Add Branch
        </Button>
      </div>

      <div className="p-4">
        <Card className="p-8 text-center">
          <p className="text-gray-500">Branch management coming soon</p>
          <p className="text-sm text-gray-400 mt-2">
            Create, edit, and manage branches
          </p>
        </Card>
      </div>
    </div>
  );
}

