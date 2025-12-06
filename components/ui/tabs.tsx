"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("flex gap-1", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn("inline-flex gap-1 rounded-lg bg-gray-100 p-1", className)}>
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;

  return (
    <button
      onClick={() => {
        // Instant visual feedback - update immediately
        context.onValueChange(value);
      }}
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-75 ease-out will-change-transform",
        "transform-gpu", // GPU acceleration for smooth transitions
        isActive
          ? "bg-white text-[#273492] shadow-sm font-semibold scale-100"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:scale-95",
        className
      )}
      style={{
        // Force GPU acceleration for instant rendering
        transform: isActive ? 'scale(1)' : undefined,
        transition: 'all 75ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </button>
  );
}

export { Tabs, TabsList, TabsTrigger };

