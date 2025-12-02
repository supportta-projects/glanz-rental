"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OrderReturnSection } from "./order-return-section";
import type { Order } from "@/lib/types";

interface OrderReturnModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onReturnComplete?: () => void;
}

/**
 * Order Return Modal Component
 * 
 * Opens a modal dialog with the OrderReturnSection component,
 * requiring users to select items before processing returns.
 * 
 * @component
 */
export function OrderReturnModal({ order, isOpen, onClose, onReturnComplete }: OrderReturnModalProps) {
  if (!order) return null;

  const handleReturnComplete = () => {
    onReturnComplete?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Process Return - {order.invoice_number}
          </DialogTitle>
          <DialogDescription className="text-base">
            Select items that have been returned. <strong>At least one item must be selected</strong> to process the return.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <OrderReturnSection 
            order={order} 
            onReturnComplete={handleReturnComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

