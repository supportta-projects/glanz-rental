import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline";
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        "p-8 md:p-12 text-center border border-gray-200 bg-white",
        className
      )}
    >
      {icon && (
        <div className="flex justify-center mb-4 text-gray-300">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#0f1724] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#6b7280] mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "default"}
          size="md"
        >
          {action.label}
        </Button>
      )}
    </Card>
  );
}

