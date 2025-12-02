"use client";

import { useState, useMemo } from "react";
import Calendar from "react-calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCalendarOrders, type CalendarOrderCounts, type CalendarOrdersByDate } from "@/lib/queries/calendar";
import { useUserStore } from "@/lib/stores/useUserStore";
import { format, isToday, isSameMonth, startOfMonth, endOfMonth, parseISO } from "date-fns";
import Link from "next/link";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import "react-calendar/dist/Calendar.css";
import "./calendar.css";

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarModal({ open, onOpenChange }: CalendarModalProps) {
  const { user } = useUserStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const { data, isLoading } = useCalendarOrders(user?.branch_id || null, viewDate);

  const counts = data?.counts || {};
  const ordersByDate = data?.orders || {};

  // Get orders for selected date
  const selectedDateOrders = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return ordersByDate[dateKey] || [];
  }, [selectedDate, ordersByDate]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;

    const dateKey = format(date, "yyyy-MM-dd");
    const dateCounts = counts[dateKey];

    if (!dateCounts) return null;

    const isFuture = date > new Date();
    const isPast = date < new Date() && !isToday(date);
    const isCurrentDay = isToday(date);

    // For future/today: show scheduled + active
    // For past: show completed
    let displayCount = 0;
    let badgeColor = "bg-gray-500";

    if (isFuture || isCurrentDay) {
      displayCount = dateCounts.scheduled + dateCounts.active;
      if (dateCounts.scheduled > 0) badgeColor = "bg-[#273492]";
      if (dateCounts.active > 0) badgeColor = "bg-green-500";
    } else if (isPast) {
      displayCount = dateCounts.completed;
      badgeColor = "bg-gray-600";
    }

    if (displayCount === 0) return null;

    return (
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
        <Badge
          className={`${badgeColor} text-white text-[10px] px-1 py-0 h-4 min-w-[16px] flex items-center justify-center`}
        >
          {displayCount}
        </Badge>
      </div>
    );
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return "";

    const classes = [];
    const dateKey = format(date, "yyyy-MM-dd");
    const dateCounts = counts[dateKey];

    if (isToday(date)) {
      classes.push("today");
    }

    if (!isSameMonth(date, viewDate)) {
      classes.push("other-month");
    }

    if (dateCounts && (dateCounts.scheduled > 0 || dateCounts.active > 0 || dateCounts.completed > 0)) {
      classes.push("has-orders");
    }

    return classes.join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Order Calendar</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendar */}
          <div className="flex-1">
            <Calendar
              onChange={(value) => {
                if (value instanceof Date) {
                  setViewDate(value);
                } else if (Array.isArray(value) && value[0] instanceof Date) {
                  setViewDate(value[0]);
                }
              }}
              value={viewDate}
              onClickDay={handleDateClick}
              tileContent={tileContent}
              tileClassName={tileClassName}
              className="w-full border-0"
              navigationLabel={({ date }) => format(date, "MMMM yyyy")}
              prevLabel={<ArrowLeft className="h-4 w-4" />}
              nextLabel={<ArrowRight className="h-4 w-4" />}
              minDetail="month"
              maxDetail="month"
            />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#273492]"></div>
                <span>Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Active/Ongoing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                <span>Completed</span>
              </div>
            </div>
          </div>

          {/* Selected Date Orders */}
          {selectedDate && (
            <div className="lg:w-80">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {isLoading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : selectedDateOrders.length === 0 ? (
                  <div className="text-sm text-gray-500">No orders for this date</div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {selectedDateOrders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-gray-600">
                            {order.invoice_number || "N/A"}
                          </span>
                          <Badge
                            variant={
                              order.status === "scheduled"
                                ? "default"
                                : order.status === "active"
                                ? "success"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-700">
                          {(order.customer as any)?.name || "Unknown Customer"}
                        </div>
                        {order.total_amount && (
                          <div className="text-xs text-gray-500 mt-1">
                            ₹{order.total_amount.toLocaleString("en-IN")}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

