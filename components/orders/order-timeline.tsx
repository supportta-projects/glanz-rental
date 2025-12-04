"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderTimeline, type OrderTimelineEvent } from "@/lib/queries/order-timeline";
import { formatDateTime } from "@/lib/utils/date";
import {
  User,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  ArrowRight,
  Edit,
  PlayCircle,
  Calendar,
  DollarSign,
  RotateCcw,
  Ban,
  CheckCircle2,
} from "lucide-react";

interface OrderTimelineProps {
  orderId: string;
}

export function OrderTimeline({ orderId }: OrderTimelineProps) {
  const { data: events, isLoading, error } = useOrderTimeline(orderId);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "order_created":
        return <FileText className="h-4 w-4" />;
      case "order_scheduled":
        return <Calendar className="h-4 w-4" />;
      case "rental_started":
        return <PlayCircle className="h-4 w-4" />;
      case "order_edited":
        return <Edit className="h-4 w-4" />;
      case "billing_updated":
        return <DollarSign className="h-4 w-4" />;
      case "status_changed":
        return <ArrowRight className="h-4 w-4" />;
      case "marked_returned":
      case "item_returned":
        return <CheckCircle className="h-4 w-4" />;
      case "item_reverted":
        return <RotateCcw className="h-4 w-4" />;
      case "marked_missing":
        return <XCircle className="h-4 w-4" />;
      case "partial_return":
        return <CheckCircle2 className="h-4 w-4" />;
      case "order_completed":
        return <CheckCircle className="h-4 w-4" />;
      case "order_cancelled":
        return <Ban className="h-4 w-4" />;
      case "updated_return_date":
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string, event: OrderTimelineEvent) => {
    switch (action) {
      case "order_created":
        return "Order Created";
      case "order_scheduled":
        return "Order Scheduled";
      case "rental_started":
        return "Rental Started";
      case "order_edited":
        return "Order Edited";
      case "billing_updated":
        return "Billing Updated";
      case "status_changed":
        // Don't show generic status changed - show what actually happened based on notes or new status
        // This should rarely happen now since we use specific actions, but handle as fallback
        if (event.notes) {
          return event.notes;
        }
        if (event.new_status === "completed") {
          return "Order Completed";
        } else if (event.new_status === "cancelled") {
          return "Order Cancelled";
        } else if (event.new_status === "partially_returned") {
          return "Partial Return";
        }
        return "Status Updated";
      case "marked_returned":
      case "item_returned":
        return "Item Returned";
      case "item_reverted":
        return "Item Reverted";
      case "marked_missing":
        return "Item Marked Missing";
      case "partial_return":
        return "Partial Return";
      case "order_completed":
        return "Order Completed";
      case "order_cancelled":
        return "Order Cancelled";
      case "order_pending_return":
        return "Pending Return";
      case "updated_return_date":
        return "Return Date Updated";
      default:
        return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "order_created":
        return "bg-blue-500 text-white border-blue-600";
      case "order_scheduled":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "rental_started":
        return "bg-green-100 text-green-700 border-green-200";
      case "order_edited":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "billing_updated":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "status_changed":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "marked_returned":
      case "item_returned":
        return "bg-green-100 text-green-700 border-green-200";
      case "item_reverted":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "marked_missing":
        return "bg-red-100 text-red-700 border-red-200";
      case "partial_return":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "order_completed":
        return "bg-green-500 text-white border-green-600";
      case "order_cancelled":
        return "bg-red-500 text-white border-red-600";
      case "order_pending_return":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Order Timeline</h2>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Order Timeline</h2>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Failed to load timeline</p>
        </div>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card className="p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Order Timeline</h2>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No timeline events yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Timeline will show order creation and return activities
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm bg-white">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Order Timeline</h2>
        <p className="text-sm text-gray-500">Complete history of order activities</p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-300 via-gray-200 to-gray-300" />

        <div className="space-y-3">
          {events.map((event, index) => {
            const isLast = index === events.length - 1;
            const iconBgColor = getActionColor(event.action).split(" ")[0];
            
            return (
              <div key={event.id} className="relative flex items-start gap-3 pl-1">
                {/* Timeline dot - Smaller */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  isLast ? "bg-white border-[#273492]" : "bg-white border-gray-300"
                } shadow-sm`}>
                  <div className={`${iconBgColor} rounded-full p-1.5 flex items-center justify-center`}>
                    {getActionIcon(event.action)}
                  </div>
                </div>

                {/* Event content - Compact */}
                <div className="flex-1 min-w-0 pt-0.5 pb-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={`${getActionColor(event.action)} text-xs font-semibold px-2 py-0.5`}>
                          {getActionLabel(event.action, event)}
                        </Badge>
                        {event.notes && (
                          <span className="text-xs text-gray-600 truncate">
                            {event.notes}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="h-3 w-3 text-gray-400" />
                        <span>{event.user_name || "Unknown"}</span>
                        <span className="text-gray-400">•</span>
                        <span>{formatDateTime(event.created_at, true)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

