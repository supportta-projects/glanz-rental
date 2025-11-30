import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function PageContainer({
  children,
  className,
  padding = true,
  maxWidth = "full",
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "w-full",
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-[#f7f9fb]",
        padding && "px-4 md:px-6 py-4",
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}

