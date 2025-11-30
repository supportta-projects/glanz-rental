"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(undefined);

interface DropdownMenuProps {
  children: React.ReactNode;
}

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-menu]')) {
        setOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative" data-dropdown-menu>{children}</div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

function DropdownMenuTrigger({ children, className, asChild }: DropdownMenuTriggerProps) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");

  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(childElement, {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        context.setOpen(!context.open);
        if (childElement.props.onClick) {
          childElement.props.onClick(e);
        }
      },
    });
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        context.setOpen(!context.open);
      }}
      className={className}
    >
      {children}
    </button>
  );
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}

function DropdownMenuContent({ children, className, align = "right" }: DropdownMenuContentProps) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuContent must be used within DropdownMenu");

  if (!context.open) return null;

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 min-w-[200px] rounded-lg bg-white shadow-lg border border-gray-200 py-1",
        align === "right" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

function DropdownMenuItem({ children, onClick, className }: DropdownMenuItemProps) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuItem must be used within DropdownMenu");

  return (
    <button
      onClick={() => {
        onClick?.();
        context.setOpen(false);
      }}
      className={cn(
        "w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };

