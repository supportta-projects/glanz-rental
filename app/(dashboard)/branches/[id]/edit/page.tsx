"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageNavbar } from "@/components/layout/page-navbar";

export default function EditBranchPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;

  return (
    <div className="min-h-screen bg-[#f7f9fb] pb-24">
      <PageNavbar
        title="Edit Branch"
        backHref={`/branches`}
      />
      
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">Branch editing is not yet implemented.</p>
          <Link href="/branches">
            <Button variant="outline">Back to Branches</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

