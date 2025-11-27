"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  borderColor: string;
  bgColor?: string;
  textColor?: string;
  iconColor: string;
  blinking?: boolean;
}

export const StatCard = memo(function StatCard({
  title,
  value,
  icon: Icon,
  borderColor,
  bgColor = "bg-white",
  textColor = "text-gray-900",
  iconColor,
  blinking = false,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "p-5 rounded-xl shadow-sm border-l-4",
        borderColor,
        bgColor,
        blinking && "animate-pulse"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600 mb-1 truncate">{title}</p>
          <p className={cn("text-4xl font-bold truncate", textColor)}>
            {value}
          </p>
        </div>
        <Icon className={cn("h-8 w-8 flex-shrink-0", iconColor)} />
      </div>
    </Card>
  );
});

