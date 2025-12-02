"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface StandardButtonProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  loading?: boolean;
}

/**
 * Standardized Button Component
 * Matches the "All Time" button styling exactly
 * Used consistently across the entire application
 * 
 * @example
 * <StandardButton variant="default" onClick={handleClick}>
 *   Create Order
 * </StandardButton>
 * 
 * <StandardButton variant="outline" onClick={handleCancel}>
 *   Cancel
 * </StandardButton>
 */
export function StandardButton({
  children,
  onClick,
  icon: Icon,
  variant = "default",
  className,
  disabled = false,
  type = "button",
  loading = false,
}: StandardButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "!h-9 !px-3.5 !min-h-0 gap-2 text-sm font-medium transition-all duration-200",
        "shadow-sm hover:shadow-md active:scale-[0.97]",
        "focus-visible:ring-2 focus-visible:ring-[#273492]/20 focus-visible:ring-offset-1",
        variant === "outline" && "border border-gray-200 bg-white hover:border-[#273492] hover:bg-[#273492]/5",
        variant === "default" && "shadow-md hover:shadow-lg",
        variant === "destructive" && "shadow-md hover:shadow-lg",
        loading && "opacity-70 cursor-not-allowed",
        className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {loading ? (
        <>
          <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

