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
      onClick={() => context.onValueChange(value)}
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
        isActive
          ? "bg-white text-[#0b63ff] shadow-sm font-semibold"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export { Tabs, TabsList, TabsTrigger };

