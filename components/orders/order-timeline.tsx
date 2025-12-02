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
      case "marked_returned":
        return <CheckCircle className="h-4 w-4" />;
      case "marked_missing":
        return <XCircle className="h-4 w-4" />;
      case "order_status_updated":
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "order_created":
        return "Order Created";
      case "marked_returned":
        return "Item Returned";
      case "marked_missing":
        return "Item Marked Missing";
      case "order_status_updated":
        return "Status Updated";
      case "updated_return_date":
        return "Return Date Updated";
      default:
        return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "order_created":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "marked_returned":
        return "bg-green-100 text-green-700 border-green-200";
      case "marked_missing":
        return "bg-red-100 text-red-700 border-red-200";
      case "order_status_updated":
        return "bg-purple-100 text-purple-700 border-purple-200";
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
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="relative flex items-start gap-4">
              {/* Timeline dot */}
              <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                index === 0 ? "bg-[#273492] border-[#273492]" : "bg-white border-gray-300"
              }`}>
                <div className={`${getActionColor(event.action).split(" ")[0]} rounded-full p-1.5`}>
                  {getActionIcon(event.action)}
                </div>
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${getActionColor(event.action)} text-xs font-semibold`}>
                        {getActionLabel(event.action)}
                      </Badge>
                      {event.previous_status && event.new_status && (
                        <span className="text-xs text-gray-500">
                          {event.previous_status} → {event.new_status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-3.5 w-3.5" />
                      <span className="font-medium">{event.user_name || "Unknown"}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDateTime(event.created_at)}
                  </div>
                </div>
                {event.notes && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-700">{event.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

