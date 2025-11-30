import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface StatsBadgeProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  variant?: "default" | "warning" | "danger" | "success" | "info";
  className?: string;
}

export function StatsBadge({
  icon: Icon,
  label,
  value,
  variant = "default",
  className,
}: StatsBadgeProps) {
  const variantClasses = {
    default: "border-gray-200 text-gray-600",
    warning: "border-orange-200 text-[#f59e0b]",
    danger: "border-red-200 text-red-600",
    success: "border-green-200 text-green-600",
    info: "border-blue-200 text-blue-600",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 h-8 border-gray-200 whitespace-nowrap",
        variantClasses[variant],
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">
        {value} {label}
      </span>
    </Badge>
  );
}

