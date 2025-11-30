"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrderInvoiceSectionProps {
  invoiceNumber: string;
  onInvoiceNumberChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Reusable Order Invoice Section Component
 * Handles invoice number input
 * 
 * @component
 * @example
 * ```tsx
 * <OrderInvoiceSection
 *   invoiceNumber={invoiceNumber}
 *   onInvoiceNumberChange={setInvoiceNumber}
 *   placeholder="GLZ-2025-0123"
 * />
 * ```
 */
export function OrderInvoiceSection({
  invoiceNumber,
  onInvoiceNumberChange,
  placeholder = "GLZ-2025-0123",
}: OrderInvoiceSectionProps) {
  return (
    <div className="space-y-2">
      <Label className="text-lg font-bold">Invoice Number *</Label>
      <Input
        value={invoiceNumber}
        onChange={(e) => onInvoiceNumberChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 text-base rounded-xl"
        required
      />
    </div>
  );
}

