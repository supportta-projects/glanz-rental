"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { formatDateTime, calculateDays, getOrderStatus, formatCurrency } from "@/lib/utils/date";
import type { Order } from "@/lib/types";

interface OrderCardProps {
  order: Order;
  onMarkReturned?: (orderId: string) => void;
}

export const OrderCard = memo(function OrderCard({ order, onMarkReturned }: OrderCardProps) {
  const status = useMemo(
    () => getOrderStatus(order.start_date, order.end_date, order.status),
    [order.start_date, order.end_date, order.status]
  );
  
  const isPendingReturn = status === "pending_return";
  const days = useMemo(
    () => calculateDays(order.start_date, order.end_date),
    [order.start_date, order.end_date]
  );
  
  const startDateTime = useMemo(
    () => formatDateTime((order as any).start_datetime || order.start_date, false),
    [order]
  );
  
  const endDateTime = useMemo(
    () => formatDateTime((order as any).end_datetime || order.end_date, false),
    [order]
  );

  const handleReturnClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkReturned?.(order.id);
  };

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
        isPendingReturn
          ? "border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/50 to-white"
          : "border border-gray-200 bg-white hover:border-sky-200"
      }`}
    >
      <Link href={`/orders/${order.id}`}>
        <div className="p-5">
          {/* Header with Invoice and Status */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-gray-900 truncate">
                  {order.invoice_number}
                </h3>
                <Badge
                  variant="outline"
                  className={`shrink-0 ${
                    status === "active"
                      ? "border-green-500 text-green-700 bg-green-50"
                      : status === "pending_return"
                      ? "border-red-500 text-red-700 bg-red-50"
                      : "border-gray-400 text-gray-700 bg-gray-50"
                  }`}
                >
                  {status === "active"
                    ? "Active"
                    : status === "pending_return"
                    ? "Pending"
                    : "Completed"}
                </Badge>
              </div>
              <p className="text-base font-semibold text-gray-800 mt-1">
                {order.customer?.name || "Unknown Customer"}
              </p>
            </div>
          </div>

          {/* Rental Period */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Start</span>
                <span className="text-gray-900 font-semibold">{startDateTime}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">End</span>
                <span className="text-gray-900 font-semibold">{endDateTime}</span>
              </div>
              <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500">Duration</span>
                <span className="text-xs font-semibold text-gray-700">{days} days</span>
              </div>
            </div>
          </div>

          {/* Footer with Amount and Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(order.total_amount)}
              </p>
            </div>
            {isPendingReturn && onMarkReturned && (
              <Button
                size="sm"
                className="h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 shadow-sm"
                onClick={handleReturnClick}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Return
              </Button>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
});

