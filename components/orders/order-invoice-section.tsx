"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateInvoiceNumber } from "@/lib/utils/invoice";
import { useEffect, useState } from "react";

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
  const [placeholderValue, setPlaceholderValue] = useState<string>("GLAORD-YYYYMMDD-XXXX");

  // Auto-generate invoice number if empty and autoGenerate is enabled
  useEffect(() => {
    if (autoGenerate && !invoiceNumber) {
      // ✅ FIX: generateInvoiceNumber is now async
      generateInvoiceNumber().then((generated) => {
        onInvoiceNumberChange(generated);
      }).catch((error) => {
        console.error("Failed to generate invoice number:", error);
        // Fallback to a simple format if generation fails
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        onInvoiceNumberChange(`GLAORD-${year}${month}${day}-${random}`);
      });
    }
  }, [autoGenerate, invoiceNumber, onInvoiceNumberChange]);

  // Load placeholder value on mount
  useEffect(() => {
    if (!placeholder) {
      generateInvoiceNumber()
        .then((generated) => setPlaceholderValue(generated))
        .catch(() => setPlaceholderValue("GLAORD-YYYYMMDD-XXXX"));
    }
  }, [placeholder]);

  const displayPlaceholder = placeholder || placeholderValue;

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

