"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateInvoiceNumber } from "@/lib/utils/invoice";
import { useEffect } from "react";

interface OrderInvoiceSectionProps {
  invoiceNumber: string;
  onInvoiceNumberChange: (value: string) => void;
  placeholder?: string;
  autoGenerate?: boolean;
}

/**
 * Reusable Order Invoice Section Component
 * Handles invoice number input (optional, auto-generates if empty)
 * 
 * @component
 * @example
 * ```tsx
 * <OrderInvoiceSection
 *   invoiceNumber={invoiceNumber}
 *   onInvoiceNumberChange={setInvoiceNumber}
 *   autoGenerate={true}
 * />
 * ```
 */
export function OrderInvoiceSection({
  invoiceNumber,
  onInvoiceNumberChange,
  placeholder,
  autoGenerate = true,
}: OrderInvoiceSectionProps) {
  // Auto-generate invoice number if empty and autoGenerate is enabled
  useEffect(() => {
    if (autoGenerate && !invoiceNumber) {
      const generated = generateInvoiceNumber();
      onInvoiceNumberChange(generated);
    }
  }, [autoGenerate, invoiceNumber, onInvoiceNumberChange]);

  const displayPlaceholder = placeholder || generateInvoiceNumber();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-bold text-[#0f1724]">Invoice Number</Label>
        <span className="text-xs text-gray-500">(Optional - Auto-generated)</span>
      </div>
      <Input
        value={invoiceNumber}
        onChange={(e) => onInvoiceNumberChange(e.target.value)}
        placeholder={displayPlaceholder}
        className="h-14 text-base rounded-xl"
      />
      {invoiceNumber && (
        <p className="text-xs text-gray-500">
          Invoice number: <span className="font-mono font-semibold">{invoiceNumber}</span>
        </p>
      )}
    </div>
  );
}

