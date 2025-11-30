"use client";

import { BarChart3 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared";

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] pb-24">
      <PageHeader title="Reports" />

      <div className="px-4 md:px-6 py-4">
        <EmptyState
          icon={<BarChart3 className="h-16 w-16" />}
          title="Reports coming soon"
          description="Daily collection, customer history, and CSV export"
        />
      </div>
    </div>
  );
}

