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
  gradient?: string; // e.g., "from-blue-500 to-blue-600"
  borderColor?: string; // Legacy support
  bgColor?: string; // Legacy support
  textColor?: string;
  iconColor?: string;
  blinking?: boolean;
  href?: string; // Optional navigation link
  onClick?: () => void; // Optional click handler
  badge?: string; // Optional badge text
  trend?: "up" | "down" | null;
}

export const StatCard = memo(function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  borderColor,
  bgColor = "bg-white",
  textColor = "text-gray-900",
  iconColor = "text-gray-600",
  blinking = false,
  href,
  onClick,
  badge,
  trend,
}: StatCardProps) {
  const isClickable = !!href || !!onClick;
  
  const cardContent = (
    <Card
      className={cn(
        "p-6 rounded-xl shadow-sm border transition-all duration-300",
        gradient 
          ? `bg-gradient-to-br ${gradient} text-white border-transparent` 
          : cn("bg-white border-gray-200", borderColor && `border-l-4 ${borderColor}`, bgColor),
        isClickable && "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        blinking && "animate-pulse"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className={cn(
              "text-sm font-medium truncate",
              gradient ? "text-white/90" : "text-gray-600"
            )}>
              {title}
            </p>
            {badge && (
              <span className={cn(
                "px-2 py-0.5 text-xs font-semibold rounded-full",
                gradient ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
              )}>
                {badge}
              </span>
            )}
            {trend && (
              <ArrowUpRight className={cn(
                "h-4 w-4",
                trend === "up" ? "text-green-400" : "text-red-400",
                gradient && "text-white/80"
              )} />
            )}
          </div>
          <p className={cn(
            "text-2xl sm:text-3xl md:text-4xl font-bold break-words",
            gradient ? "text-white" : textColor
          )}>
            {value}
          </p>
        </div>
        <div className={cn(
          "p-3 rounded-lg flex-shrink-0",
          gradient ? "bg-white/20" : "bg-gray-50"
        )}>
          <Icon className={cn(
            "h-6 w-6 md:h-8 md:w-8",
            gradient ? "text-white" : iconColor
          )} />
        </div>
      </div>
      {isClickable && (
        <div className={cn(
          "mt-4 pt-4 border-t flex items-center gap-1 text-xs font-medium",
          gradient ? "border-white/20 text-white/80" : "border-gray-200 text-gray-600"
        )}>
          <span>View details</span>
          <ArrowUpRight className="h-3 w-3" />
        </div>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
});

