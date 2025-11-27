"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getOrderStatus } from "@/lib/utils/date";
import { formatDistanceToNow } from "date-fns";
import type { Order } from "@/lib/types";

interface RecentActivityProps {
  orders: Order[];
  isLoading?: boolean;
}

interface OrderItemProps {
  order: Order;
}

// Memoized order item to prevent unnecessary re-renders
const OrderItem = memo(function OrderItem({ order }: OrderItemProps) {
  const status = useMemo(
    () => getOrderStatus(order.start_date, order.end_date, order.status),
    [order.start_date, order.end_date, order.status]
  );
  
  const isPendingReturn = status === "pending_return";
  
  const timeAgo = useMemo(
    () =>
      formatDistanceToNow(new Date(order.created_at), {
        addSuffix: true,
      }),
    [order.created_at]
  );

  return (
    <Link href={`/orders/${order.id}`}>
      <Card
        className={`p-4 rounded-xl transition-all ${
          isPendingReturn
            ? "bg-red-50 border-l-4 border-l-red-500"
            : "bg-white hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">
              {order.invoice_number}
            </span>
            <Badge
              className={
                status === "active"
                  ? "bg-green-500"
                  : status === "pending_return"
                  ? "bg-red-500"
                  : "bg-gray-500"
              }
            >
              {status === "active"
                ? "Active"
                : status === "pending_return"
                ? "Pending"
                : "Completed"}
            </Badge>
          </div>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            {order.customer?.name || "Unknown"}
          </p>
          <p className="text-sm font-bold text-green-600">
            {formatCurrency(order.total_amount)}
          </p>
        </div>
      </Card>
    </Link>
  );
});

export const RecentActivity = memo(function RecentActivity({
  orders,
  isLoading,
}: RecentActivityProps) {
  const displayOrders = useMemo(() => orders.slice(0, 8), [orders]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No recent activity</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {displayOrders.map((order) => (
        <OrderItem key={order.id} order={order} />
      ))}
    </div>
  );
});

