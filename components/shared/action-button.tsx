"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  mobileOnly?: boolean;
}

export function ActionButton({
  label,
  onClick,
  icon: Icon = Plus,
  variant = "default",
  size = "sm",
  className,
  mobileOnly = false,
}: ActionButtonProps) {
  const sizeClasses = {
    sm: "h-7 px-2 text-xs",
    md: "h-8 px-3 text-sm",
    lg: "h-9 px-4 text-base",
  };

  return (
    <Button
      onClick={onClick}
      variant={variant}
      className={cn(
        sizeClasses[size],
        variant === "default"
          ? "bg-[#273492] hover:bg-[#1f2a7a] text-white"
          : "border-[#273492] text-[#273492] hover:bg-[#273492] hover:text-white",
        "gap-1.5 font-medium rounded-lg transition-colors",
        mobileOnly && "md:hidden",
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <span>{label}</span>
    </Button>
  );
}

