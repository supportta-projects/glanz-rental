"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone, Eye, X, Calendar, PlayCircle, AlertTriangle, Package } from "lucide-react";
import { formatDateTime, calculateDays, getOrderStatus, formatCurrency, isBooking, isOrderLate } from "@/lib/utils/date";
import { differenceInMinutes } from "date-fns";
import type { Order } from "@/lib/types";

interface OrderCardProps {
  order: Order;
  onCancel?: (orderId: string) => void;
  canCancel?: boolean;
}

export const OrderCard = memo(function OrderCard({ order, onCancel, canCancel }: OrderCardProps) {
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
      className={`group relative overflow-hidden transition-all duration-300 premium-hover rounded-xl border-2 ${
        orderCategory === "late"
          ? "border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/50 to-white pulse-glow"
          : orderCategory === "cancelled"
          ? "opacity-75 border-gray-300"
          : orderCategory === "scheduled"
          ? "border-blue-200 bg-gradient-to-br from-white to-blue-50/30"
          : "border-gray-200 bg-gradient-to-br from-white to-gray-50/50"
      }`}
      style={{
        animation: `fadeInUp 0.5s ease-out forwards`,
      }}
    >
      <div className="p-5">
        {/* Premium Header with Invoice, Status, and Items Count */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Link href={`/orders/${order.id}`} className="font-bold text-base text-gray-900 hover:text-[#273492] transition-colors duration-200">
                #{order.invoice_number}
              </Link>
              {itemsCount > 0 && (
                <Badge variant="outline" className="text-xs px-2 py-1 h-5 border-gray-200 bg-gray-50 font-semibold">
                  {itemsCount} {itemsCount === 1 ? "item" : "items"}
                </Badge>
              )}
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1.5">
              {order.customer?.name || "Unknown Customer"}
            </p>
            {/* Phone Number */}
            {order.customer?.phone && (
              <Link
                href={`tel:${order.customer.phone}`}
                className="text-sm text-gray-500 hover:text-[#273492] flex items-center gap-1.5 mt-1 transition-colors duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="tabular-nums font-semibold">{order.customer.phone}</span>
              </Link>
            )}
          </div>
          {/* Enhanced Status Badge */}
          <div>
            {orderCategory === "cancelled" ? (
              <Badge className="bg-gray-500 text-white flex items-center gap-1.5 text-xs px-3 py-1.5 shadow-sm">
                <AlertTriangle className="h-3.5 w-3.5" />
                Cancelled
              </Badge>
            ) : orderCategory === "scheduled" ? (
              <Badge className="bg-blue-500 text-white flex items-center gap-1.5 text-xs px-3 py-1.5 shadow-sm">
                <Calendar className="h-3.5 w-3.5" />
                Scheduled
              </Badge>
            ) : orderCategory === "late" ? (
              <Badge className="bg-red-500 text-white flex items-center gap-1.5 text-xs px-3 py-1.5 shadow-sm pulse-glow">
                <AlertTriangle className="h-3.5 w-3.5" />
                Late
              </Badge>
            ) : orderCategory === "ongoing" ? (
              <Badge className="bg-orange-500 text-white flex items-center gap-1.5 text-xs px-3 py-1.5 shadow-sm">
                <PlayCircle className="h-3.5 w-3.5" />
                Ongoing
              </Badge>
            ) : (
              <Badge className="bg-[#273492] text-white flex items-center gap-1.5 text-xs px-3 py-1.5 shadow-sm">
                <CheckCircle className="h-3.5 w-3.5" />
                Returned
              </Badge>
            )}
          </div>
        </div>

        {/* Premium Rental Period */}
        <div className="mb-3 p-4 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-gray-200/60 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-semibold uppercase tracking-wide">From</span>
              <span className="text-gray-900 font-bold tabular-nums">{startDateTime}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-semibold uppercase tracking-wide">To</span>
              <span className="text-gray-900 font-bold tabular-nums">{endDateTime}</span>
            </div>
            <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Duration</span>
              <span className="text-xs font-bold text-gray-900">{days} day{days !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Premium Actions Row */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200/60">
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Total Amount</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
              {formatCurrency(order.total_amount)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canCancel && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelClick}
                className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 premium-hover rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {(orderCategory === "ongoing" || orderCategory === "late") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewClick}
                className="h-9 w-9 p-0 text-[#273492] hover:text-[#1f2a7a] hover:bg-[#273492]/10 premium-hover rounded-lg"
              >
                <Package className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewClick}
              className="h-9 w-9 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50 premium-hover rounded-lg group-hover:scale-110 transition-transform duration-200"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});

