"use client";

import { Card } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      </div>

      <div className="p-4">
        <Card className="p-8 text-center">
          <p className="text-gray-500">Reports coming soon</p>
          <p className="text-sm text-gray-400 mt-2">
            Daily collection, customer history, and CSV export
          </p>
        </Card>
      </div>
    </div>
  );
}

