import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Failed to load data",
  message = "Please check your connection and try again",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "bg-red-50 border border-red-200 rounded-lg p-6 text-center",
        className
      )}
    >
      <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
      <p className="text-red-600 font-medium mb-2">{title}</p>
      <p className="text-sm text-red-500 mb-4">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="h-8 px-3 text-xs font-medium border-red-300 text-red-600 hover:bg-red-100"
        >
          Try Again
        </Button>
      )}
    </div>
  );
}

