import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
}

const Sheet = ({ open, onOpenChange, children, side = "right" }: SheetProps) => {
  if (!open) return null;

  const sideClasses = {
    left: "left-0 top-0 h-full",
    right: "right-0 top-0 h-full",
    top: "top-0 left-0 w-full",
    bottom: "bottom-0 left-0 w-full",
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "fixed bg-white shadow-xl",
          sideClasses[side],
          side === "left" || side === "right" 
            ? "w-full max-w-sm" 
            : side === "bottom"
            ? "max-h-[80vh] rounded-t-2xl"
            : "h-full max-h-96"
        )}
      >
        {children}
      </div>
    </div>
  );
};

const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }
>(({ className, onClose, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("h-full flex flex-col p-6", className)}
    {...props}
  >
    {onClose && (
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 hover:text-gray-900 transition-colors shadow-sm"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    )}
    {children}
  </div>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2 mb-6", className)}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-2xl font-semibold", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export { Sheet, SheetContent, SheetHeader, SheetTitle };

