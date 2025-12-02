"use client";

import { useState, useMemo } from "react";
import Calendar from "react-calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCalendarOrders } from "@/lib/queries/calendar";
import { useUserStore } from "@/lib/stores/useUserStore";
import { format, isToday, isSameMonth, startOfMonth, endOfMonth, parseISO, isFuture, isPast } from "date-fns";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import "react-calendar/dist/Calendar.css";
import "@/components/calendar/calendar.css";

export default function CalendarPage() {
  const { user } = useUserStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const { data, isLoading } = useCalendarOrders(user?.branch_id || null, viewDate);

  const counts = data?.counts || {};
  const ordersByDate = data?.orders || {};

  // Get orders for selected date (only scheduled for future/today)
  const selectedDateOrders = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const orders = ordersByDate[dateKey] || [];
    
    // Filter: Only scheduled orders for future dates and today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    if (selected >= today) {
      // For today and future: only show scheduled orders
      return orders.filter((order) => order.status === "scheduled");
    }
    
    return [];
  }, [selectedDate, ordersByDate]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;

    const dateKey = format(date, "yyyy-MM-dd");
    const dateCounts = counts[dateKey];

    if (!dateCounts) return null;

    const isCurrentDay = isToday(date);
    const isFutureDate = isFuture(date) || isCurrentDay;

    // Only show scheduled orders for future dates and today
    if (!isFutureDate) return null;

    const scheduledCount = dateCounts.scheduled || 0;
    if (scheduledCount === 0) return null;

    return (
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
        <Badge
          className="bg-[#273492] text-white text-[10px] px-1.5 py-0.5 h-5 min-w-[18px] flex items-center justify-center font-semibold"
        >
          {scheduledCount}
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

    // Only highlight if there are scheduled orders (for future/today)
    const isCurrentDay = isToday(date);
    const isFutureDate = isFuture(date) || isCurrentDay;
    
    if (isFutureDate && dateCounts && dateCounts.scheduled > 0) {
      classes.push("has-orders");
    }

    return classes.join(" ");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#273492]/10 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-[#273492]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Order Calendar</h2>
              <p className="text-sm text-gray-600">View scheduled orders for upcoming dates</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar */}
          <div className="flex-1">
            <Card className="p-4 md:p-6">
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
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#273492]"></div>
                    <span className="text-gray-700">Scheduled Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-[#273492] bg-[#273492]/10"></div>
                    <span className="text-gray-700">Today</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Only scheduled orders for future dates and today are displayed
                </p>
              </div>
            </Card>
          </div>

          {/* Selected Date Orders */}
          {selectedDate && (
            <div className="lg:w-96">
              <Card className="p-4 md:p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {format(selectedDate, "EEEE, MMMM d")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {format(selectedDate, "yyyy")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>

                {isLoading ? (
                  <div className="text-sm text-gray-500 py-8 text-center">Loading orders...</div>
                ) : selectedDateOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">
                      <CalendarIcon className="h-12 w-12 mx-auto" />
                    </div>
                    <p className="text-sm text-gray-500">No scheduled orders for this date</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {selectedDateOrders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block p-3 rounded-lg border border-gray-200 hover:border-[#273492]/30 hover:bg-[#273492]/10 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-mono font-semibold text-gray-900">
                                {order.invoice_number || "N/A"}
                              </span>
                              <Badge
                                variant="default"
                                className="bg-[#273492] text-white text-[10px] px-2 py-0.5"
                              >
                                Scheduled
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-700 font-medium">
                              {(order.customer as any)?.name || "Unknown Customer"}
                            </div>
                            {(order.customer as any)?.phone && (
                              <div className="text-xs text-gray-500 mt-1">
                                {(order.customer as any).phone}
                              </div>
                            )}
                          </div>
                        </div>
                        {order.total_amount && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="text-sm font-semibold text-gray-900">
                              ₹{order.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}
                        {order.start_datetime && (
                          <div className="mt-1 text-xs text-gray-500">
                            Start: {format(new Date(order.start_datetime), "MMM d, h:mm a")}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Empty State - No Date Selected */}
          {!selectedDate && (
            <div className="lg:w-96">
              <Card className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Click on a date to view scheduled orders
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

