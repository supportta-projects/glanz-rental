"use client";

import { memo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient?: string; // Legacy - will be ignored
  borderColor?: string; // Legacy support
  bgColor?: string; // Legacy support
  textColor?: string;
  iconColor?: string;
  blinking?: boolean;
  href?: string; // Optional navigation link
  onClick?: () => void; // Optional click handler
  badge?: string; // Optional badge text
  trend?: "up" | "down" | null;
  variant?: "default" | "primary" | "success" | "warning" | "danger"; // New variant system
}

export const StatCard = memo(function StatCard({
  title,
  value,
  icon: Icon,
  gradient, // Ignored - using variants instead
  borderColor,
  bgColor = "bg-white",
  textColor = "text-gray-900",
  iconColor,
  blinking = false,
  href,
  onClick,
  badge,
  trend,
  variant = "default",
}: StatCardProps) {
  const isClickable = !!href || !!onClick;
  
  // Variant-based styling - Shopify-like minimal design
  const variantStyles = {
    default: {
      iconBg: "bg-gray-50",
      iconColor: "text-gray-600",
      border: "border-gray-200",
      accent: "text-gray-600",
    },
    primary: {
      iconBg: "bg-[#273492]/10",
      iconColor: "text-[#273492]",
      border: "border-gray-200",
      accent: "text-[#273492]",
    },
    success: {
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      border: "border-gray-200",
      accent: "text-green-600",
    },
    warning: {
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      border: "border-gray-200",
      accent: "text-orange-600",
    },
    danger: {
      iconBg: "bg-red-50",
      iconColor: "text-[#e7342f]",
      border: "border-gray-200",
      accent: "text-[#e7342f]",
    },
  };

  const styles = variantStyles[variant];
  const finalIconColor = iconColor || styles.iconColor;
  
  const cardContent = (
    <Card
      className={cn(
        "p-5 rounded-lg border transition-all duration-200 bg-white",
        styles.border,
        isClickable && "cursor-pointer hover:shadow-md hover:border-gray-300 active:scale-[0.98]",
        blinking && "ring-2 ring-[#273492]/20"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {title}
            </p>
            {badge && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                {badge}
              </span>
            )}
            {trend && (
              <ArrowUpRight className={cn(
                "h-3.5 w-3.5",
                trend === "up" ? "text-green-600" : "text-red-600"
              )} />
            )}
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
            {value}
          </p>
        </div>
        <div className={cn(
          "p-2.5 rounded-lg flex-shrink-0",
          styles.iconBg
        )}>
          <Icon className={cn(
            "h-5 w-5",
            finalIconColor
          )} />
        </div>
      </div>
      {isClickable && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-medium text-gray-500 group-hover:text-[#273492] transition-colors">
          <span>View details</span>
          <ArrowUpRight className="h-3 w-3" />
        </div>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block group">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
});
