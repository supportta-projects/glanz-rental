import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#273492] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[56px]",
  {
    variants: {
      variant: {
        default: "bg-[#273492] text-white hover:bg-[#1f2a7a]",
        destructive: "bg-[#e7342f] text-white hover:bg-[#d12a26]",
        outline: "border-2 border-[#273492] text-[#273492] hover:bg-[#273492]/10",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "hover:bg-gray-100",
        link: "text-[#273492] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-14 px-6",
        sm: "h-12 px-4 text-sm",
        lg: "h-16 px-8 text-lg",
        icon: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

