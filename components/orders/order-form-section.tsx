"use client";

import { CustomerSearch } from "./customer-search";
import { Label } from "@/components/ui/label";
import type { Customer } from "@/lib/types";

interface OrderFormSectionProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  branchName?: string;
  staffName?: string;
}

/**
 * Reusable Order Form Section Component
 * Handles customer selection and displays branch/staff information
 * 
 * @component
 * @example
 * ```tsx
 * <OrderFormSection
 *   selectedCustomer={customer}
 *   onSelectCustomer={setCustomer}
 *   branchName="Main Branch"
 *   staffName="John Doe"
 * />
 * ```
 */
export function OrderFormSection({
  selectedCustomer,
  onSelectCustomer,
  branchName,
  staffName,
}: OrderFormSectionProps) {
  return (
    <div className="space-y-4">
      {/* Customer Selection */}
      <CustomerSearch
        onSelectCustomer={onSelectCustomer}
        selectedCustomer={selectedCustomer}
      />

      {/* Branch & Staff (Readonly) */}
      {(branchName || staffName) && (
        <div className="space-y-3">
          {branchName && (
            <div className="space-y-2">
              <Label className="text-sm text-[#6b7280] font-medium">Branch</Label>
              <div className="h-10 bg-[#f1f5f9] rounded-lg px-3 flex items-center text-[#0f1724] text-sm">
                {branchName}
              </div>
            </div>
          )}
          {staffName && (
            <div className="space-y-2">
              <Label className="text-sm text-[#6b7280] font-medium">Staff</Label>
              <div className="h-10 bg-[#f1f5f9] rounded-lg px-3 flex items-center text-[#0f1724] text-sm">
                {staffName}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

