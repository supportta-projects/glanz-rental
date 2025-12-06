"use client"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils/cn"

interface ActiveToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}

export function ActiveToggle({
  checked,
  onCheckedChange,
  disabled = false,
  ariaLabel = "Toggle active status",
}: ActiveToggleProps) {
  return (
    <div className="relative inline-grid h-8 grid-cols-[1fr_1fr] items-center text-sm font-medium">
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="peer data-[state=unchecked]:bg-input/50 absolute inset-0 h-[inherit] w-auto rounded-md [&_span]:z-10 [&_span]:h-full [&_span]:w-1/2 [&_span]:rounded-sm [&_span]:transition-transform [&_span]:duration-300 [&_span]:ease-[cubic-bezier(0.16,1,0.3,1)] [&_span]:data-[state=checked]:translate-x-[8.75rem] [&_span]:data-[state=checked]:rtl:-translate-x-[8.75rem]"
        aria-label={ariaLabel}
      />
      <span className="pointer-events-none relative ml-0.5 flex items-center justify-center px-2 text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-[state=checked]:invisible peer-data-[state=unchecked]:translate-x-full peer-data-[state=unchecked]:rtl:-translate-x-full">
        <span className="text-[10px] font-medium uppercase">No</span>
      </span>
      <span className="peer-data-[state=checked]:text-background pointer-events-none relative mr-0.5 flex items-center justify-center px-2 text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-[state=checked]:-translate-x-full peer-data-[state=unchecked]:invisible peer-data-[state=checked]:rtl:translate-x-full">
        <span className="text-[10px] font-medium uppercase">Yes</span>
      </span>
    </div>
  )
}

