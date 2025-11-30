"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone, Eye, X, Calendar, PlayCircle, AlertTriangle } from "lucide-react";
import { formatDateTime, calculateDays, getOrderStatus, formatCurrency, isBooking, isOrderLate } from "@/lib/utils/date";
import { differenceInMinutes } from "date-fns";
import type { Order } from "@/lib/types";

interface OrderCardProps {
  order: Order;
  onMarkReturned?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
  canCancel?: boolean;
}

export const OrderCard = memo(function OrderCard({ order, onMarkReturned, onCancel, canCancel }: OrderCardProps) {
  const router = useRouter();
  
  const startDate = (order as any).start_datetime || order.start_date;
  const endDate = (order as any).end_datetime || order.end_date;
  const isFutureBooking = useMemo(() => isBooking(startDate), [startDate]);
  const isLate = useMemo(() => isOrderLate(endDate) && order.status !== "completed" && order.status !== "cancelled", [endDate, order.status]);
  
  // Determine order category
  const orderCategory = useMemo(() => {
    if (order.status === "cancelled") return "cancelled";
    if (order.status === "completed") return "returned";
    if (isLate) return "late";
    if (isFutureBooking) return "scheduled";
    return "ongoing";
  }, [order.status, isLate, isFutureBooking]);
  
  const days = useMemo(
    () => calculateDays(order.start_date, order.end_date),
    [order.start_date, order.end_date]
  );
  
  const startDateTime = useMemo(
    () => formatDateTime(startDate, false),
    [startDate]
  );
  
  const endDateTime = useMemo(
    () => formatDateTime(endDate, false),
    [endDate]
  );

  // Get items count
  const itemsCount = useMemo(() => {
    if (order.items && Array.isArray(order.items)) {
      return order.items.length;
    }
    return 0;
  }, [order.items]);

  const handleReturnClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkReturned?.(order.id);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel?.(order.id);
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/orders/${order.id}`);
  };

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md border border-gray-200 bg-white ${
        orderCategory === "late"
          ? "border-l-4 border-l-red-500"
          : orderCategory === "cancelled"
          ? "opacity-75"
          : ""
      }`}
    >
      <div className="p-4">
        {/* Header with Invoice, Status, and Items Count */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Link href={`/orders/${order.id}`} className="font-semibold text-base text-[#0f1724] hover:text-[#0b63ff]">
                #{order.invoice_number}
              </Link>
              {itemsCount > 0 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 border-gray-200">
                  {itemsCount} {itemsCount === 1 ? "item" : "items"}
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold text-[#0f1724] mb-1">
              {order.customer?.name || "Unknown Customer"}
            </p>
            {/* Phone Number */}
            {order.customer?.phone && (
              <Link
                href={`tel:${order.customer.phone}`}
                className="text-sm text-[#6b7280] hover:text-[#0b63ff] flex items-center gap-1.5 mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="tabular-nums font-semibold">{order.customer.phone}</span>
              </Link>
            )}
          </div>
          {/* Status Badge */}
          <div>
            {orderCategory === "cancelled" ? (
              <Badge className="bg-gray-500 text-white flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Cancelled
              </Badge>
            ) : orderCategory === "scheduled" ? (
              <Badge className="bg-[#9ca3af] text-white flex items-center gap-1 text-xs">
                <Calendar className="h-3 w-3" />
                Scheduled
              </Badge>
            ) : orderCategory === "late" ? (
              <Badge className="bg-[#ef4444] text-white flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Late
              </Badge>
            ) : orderCategory === "ongoing" ? (
              <Badge className="bg-[#f59e0b] text-white flex items-center gap-1 text-xs">
                <PlayCircle className="h-3 w-3" />
                Ongoing
              </Badge>
            ) : (
              <Badge className="bg-[#3b82f6] text-white flex items-center gap-1 text-xs">
                <CheckCircle className="h-3 w-3" />
                Returned
              </Badge>
            )}
          </div>
        </div>

        {/* Rental Period */}
        <div className="mb-3 p-3 bg-[#f1f5f9] rounded-lg border border-gray-200">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6b7280] font-medium">From</span>
              <span className="text-[#0f1724] font-semibold tabular-nums">{startDateTime}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6b7280] font-medium">To</span>
              <span className="text-[#0f1724] font-semibold tabular-nums">{endDateTime}</span>
            </div>
            <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-[#6b7280]">Duration</span>
              <span className="text-xs font-semibold text-[#0f1724]">{days} day{days !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div>
            <p className="text-xs text-[#6b7280] mb-0.5">Total Amount</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(order.total_amount)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Cancel button - only for scheduled orders */}
            {canCancel && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelClick}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {/* Mark as Returned - for ongoing/late */}
            {(orderCategory === "ongoing" || orderCategory === "late") && onMarkReturned && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReturnClick}
                className="h-8 w-8 p-0 text-[#10b981] hover:text-[#10b981] hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            {/* View button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewClick}
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});

