"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
            checked
              ? "border-sky-500 bg-sky-500 text-white"
              : "border-gray-300 bg-white",
            props.disabled && "cursor-not-allowed opacity-50",
            !props.disabled && "cursor-pointer",
            className
          )}
          onClick={() => {
            if (!props.disabled && onCheckedChange) {
              onCheckedChange(!checked);
            }
          }}
        >
          {checked && <Check className="h-4 w-4" />}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };

