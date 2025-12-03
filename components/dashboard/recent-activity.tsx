"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getOrderStatus } from "@/lib/utils/date";
import { formatDistanceToNow } from "date-fns";
import type { Order } from "@/lib/types";
import { ArrowRight } from "lucide-react";

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

  const getStatusBadge = () => {
    // Check order.status directly for scheduled and partially_returned
    if (order.status === "scheduled") {
      return <Badge className="bg-blue-50 text-[#273492] border-blue-200 text-xs">Scheduled</Badge>;
    }
    if (order.status === "partially_returned") {
      return <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs">Partial</Badge>;
    }
    if (status === "active") {
      return <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Active</Badge>;
    }
    if (status === "pending_return") {
      return <Badge className="bg-red-50 text-[#e7342f] border-red-200 text-xs">Pending</Badge>;
    }
    return <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-xs">Completed</Badge>;
  };

  return (
    <Link href={`/orders/${order.id}`}>
      <Card
        className={`p-4 rounded-lg border transition-all duration-200 ${
          isPendingReturn
            ? "bg-red-50/50 border-red-200 hover:border-red-300"
            : "bg-white border-gray-200 hover:shadow-md hover:border-gray-300"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm font-mono">
              {order.invoice_number}
            </span>
            {getStatusBadge()}
          </div>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            {order.customer?.name || "Unknown Customer"}
          </p>
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(order.total_amount)}
            </p>
            <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>
      </Card>
    </Link>
  );
});

export const RecentActivity = memo(function RecentActivity({
  orders,
  isLoading,
}: RecentActivityProps) {
  const displayOrders = useMemo(() => orders.slice(0, 10), [orders]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse border border-gray-200">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="p-8 text-center border border-gray-200 bg-white">
        <p className="text-gray-500 text-sm">No recent activity</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {displayOrders.map((order) => (
        <OrderItem key={order.id} order={order} />
      ))}
    </div>
  );
});
