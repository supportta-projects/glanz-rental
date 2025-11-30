import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

interface LoadingStateProps {
  variant?: "spinner" | "skeleton" | "table" | "cards";
  count?: number;
  className?: string;
  message?: string;
}

export function LoadingState({
  variant = "spinner",
  count = 4,
  className,
  message,
}: LoadingStateProps) {
  if (variant === "spinner") {
    return (
      <div className={cn("flex justify-center items-center py-12", className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b63ff]" />
          {message && <p className="text-sm text-[#6b7280]">{message}</p>}
        </div>
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-200">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  return null;
}

