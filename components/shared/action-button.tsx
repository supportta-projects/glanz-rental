"use client";

import { Plus } from "lucide-react";
import { StandardButton } from "./standard-button";
import { cn } from "@/lib/utils/cn";
import { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline";
  className?: string;
  mobileOnly?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

/**
 * Standardized Action Button Component
 * Uses StandardButton internally for consistency
 * Used consistently across branches, staff, customers, etc.
 */
export function ActionButton({
  label,
  onClick,
  icon: Icon = Plus,
  variant = "default",
  className,
  mobileOnly = false,
  disabled = false,
  type = "button",
}: ActionButtonProps) {
  return (
    <StandardButton
      onClick={onClick}
      variant={variant}
      type={type}
      disabled={disabled}
      icon={Icon}
      className={cn(mobileOnly && "md:hidden", className)}
    >
      {label}
    </StandardButton>
  );
}

