"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  maxWidth = "2xl",
}: SearchInputProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "w-full",
  };

  return (
    <div className={cn("relative flex-1", maxWidthClasses[maxWidth], className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9 h-8 rounded-lg border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:border-[#0b63ff] focus:ring-1 focus:ring-[#0b63ff] transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  );
}

