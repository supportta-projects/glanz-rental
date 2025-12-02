"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center gap-2 text-sm text-gray-600", className)}>
      {items.map((item, index) => (
        <div key={`${item.href}-${index}`} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
          <Link
            href={item.href}
            className={cn(
              index === items.length - 1
                ? "text-gray-900 font-medium"
                : "text-[#273492] hover:text-[#1f2a7a]"
            )}
          >
            {item.label}
          </Link>
        </div>
      ))}
    </nav>
  );
}

