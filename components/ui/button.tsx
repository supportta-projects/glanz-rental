import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#273492]/20 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-[#273492] text-white hover:bg-[#1f2a7a] shadow-md hover:shadow-lg",
        destructive: "bg-[#e7342f] text-white hover:bg-[#d12a26] shadow-md hover:shadow-lg",
        outline: "border border-gray-200 bg-white text-gray-700 hover:border-[#273492] hover:bg-[#273492]/5 hover:text-[#273492] shadow-sm hover:shadow-md",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm hover:shadow-md",
        ghost: "hover:bg-gray-100 text-gray-700",
        link: "text-[#273492] underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-10 px-4 gap-2",
        sm: "h-9 px-3.5 gap-1.5 text-sm",
        md: "h-10 px-4 gap-2 text-sm",
        lg: "h-12 px-6 gap-2.5 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
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

