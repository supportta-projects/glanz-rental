"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingActionButtonProps {
  href: string;
  label?: string;
}

export function FloatingActionButton({
  href,
  label = "New Order",
}: FloatingActionButtonProps) {
  return (
    <Link
      href={href}
      className="fixed bottom-24 right-4 z-50 md:hidden"
      aria-label={label}
    >
      <Button
        size="icon"
        className="h-14 w-14 rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-xl"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </Link>
  );
}

