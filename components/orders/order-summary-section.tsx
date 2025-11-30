"use client";

import { Card } from "@/components/ui/card";

interface OrderSummarySectionProps {
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  gstEnabled?: boolean;
  gstRate?: number;
  gstIncluded?: boolean;
}

/**
 * Reusable Order Summary Section Component
 * Displays order totals including subtotal, GST, and grand total
 * 
 * @component
 * @example
 * ```tsx
 * <OrderSummarySection
 *   subtotal={1000}
 *   gstAmount={50}
 *   grandTotal={1050}
 *   gstEnabled={true}
 *   gstRate={5}
 *   gstIncluded={false}
 * />
 * ```
 */
export function OrderSummarySection({
  subtotal,
  gstAmount,
  grandTotal,
  gstEnabled = false,
  gstRate = 5.0,
  gstIncluded = false,
}: OrderSummarySectionProps) {
  if (grandTotal <= 0) return null;

  return (
    <Card className="p-5 bg-[#0b63ff]/5 rounded-lg border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-gray-700">Subtotal</span>
        <span className="text-lg font-semibold text-gray-900">
          ₹{subtotal.toLocaleString()}
        </span>
      </div>
      {gstEnabled && gstAmount > 0 && (
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-base font-medium text-gray-700">
            GST ({gstRate.toFixed(2)}%) {gstIncluded ? "(Included)" : ""}
          </span>
          <span className="text-lg font-semibold text-gray-900">
            ₹{gstAmount.toLocaleString()}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-xl font-semibold text-gray-700">Grand Total</span>
        <span className="text-3xl font-bold text-sky-600">
          ₹{grandTotal.toLocaleString()}
        </span>
      </div>
    </Card>
  );
}

