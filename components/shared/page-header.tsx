import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-10",
        className
      )}
    >
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0f1724]">{title}</h1>
          {description && (
            <p className="text-sm text-[#6b7280] mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}

