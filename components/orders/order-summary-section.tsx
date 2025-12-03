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
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <span>Order Summary</span>
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-base font-medium text-gray-700">Subtotal</span>
          <span className="text-lg font-semibold text-gray-900">
            ₹{subtotal.toLocaleString("en-IN")}
          </span>
        </div>
        
        {gstEnabled && gstAmount > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-base font-medium text-gray-700">
              GST ({gstRate.toFixed(2)}%) {gstIncluded ? "(Included)" : ""}
            </span>
            <span className="text-lg font-semibold text-gray-900">
              ₹{gstAmount.toLocaleString("en-IN")}
            </span>
          </div>
        )}
        
        <div className="flex items-center justify-between border-t-2 border-[#273492]/30 pt-4 mt-2">
          <span className="text-xl font-bold text-gray-900">Grand Total</span>
          <span className="text-3xl font-bold bg-gradient-to-r from-[#273492] to-[#1f2a7a] bg-clip-text text-transparent">
            ₹{grandTotal.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}

