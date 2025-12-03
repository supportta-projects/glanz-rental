"use client";

import { useState, useMemo, useCallback, memo } from "react";
import Calendar from "react-calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendarOrders } from "@/lib/queries/calendar";
import { useUserStore } from "@/lib/stores/useUserStore";
import { format, isToday, isSameMonth, startOfMonth, endOfMonth, parseISO, isFuture, isPast, startOfToday } from "date-fns";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Sparkles, Clock, Package, TrendingUp, ChevronRight, Phone, IndianRupee } from "lucide-react";
import "react-calendar/dist/Calendar.css";
import "@/components/calendar/calendar.css";

// Memoized Order Card Component for Performance
const OrderCard = memo(({ order, index }: { order: any; index: number }) => (
  <Link
    href={`/orders/${order.id}`}
    className={`block p-4 rounded-xl border border-gray-200 bg-white hover:border-[#273492]/40 hover:shadow-lg transition-all duration-300 premium-hover fadeInUp`}
    style={{ 
      animationDelay: `${index * 0.05}s`,
      willChange: "transform",
    }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-mono font-bold text-gray-900 truncate">
            {order.invoice_number || "N/A"}
          </span>
          <Badge
            variant="default"
            className="bg-[#273492] text-white text-[10px] px-2 py-0.5 font-semibold flex-shrink-0"
          >
            Scheduled
          </Badge>
        </div>
        <div className="text-base font-semibold text-gray-900 mb-1 truncate">
          {(order.customer as any)?.name || "Unknown Customer"}
        </div>
        {(order.customer as any)?.phone && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{(order.customer as any).phone}</span>
          </div>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
    </div>
    
    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
      {order.total_amount && (
        <div className="flex items-center gap-1.5">
          <IndianRupee className="h-4 w-4 text-[#273492]" />
          <span className="text-base font-bold text-gray-900">
            {order.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
      {order.start_datetime && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{format(new Date(order.start_datetime), "h:mm a")}</span>
        </div>
      )}
    </div>
  </Link>
));

OrderCard.displayName = "OrderCard";

export default function CalendarPage() {
  const { user } = useUserStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const { data, isLoading } = useCalendarOrders(user?.branch_id || null, viewDate);

  const counts = data?.counts || {};
  const ordersByDate = data?.orders || {};

  // Calculate quick stats
  const quickStats = useMemo(() => {
    const today = startOfToday();
    const todayKey = format(today, "yyyy-MM-dd");
    const todayCount = counts[todayKey]?.scheduled || 0;
    
    // Count all scheduled orders for this month
    let totalScheduled = 0;
    let upcomingDates: Date[] = [];
    
    Object.keys(counts).forEach((dateKey) => {
      const date = parseISO(dateKey);
      const scheduledCount = counts[dateKey]?.scheduled || 0;
      
      if (scheduledCount > 0 && !isPast(date)) {
        totalScheduled += scheduledCount;
        upcomingDates.push(date);
      }
    });
    
    // Get next 3 upcoming dates with orders
    upcomingDates = upcomingDates
      .sort((a, b) => a.getTime() - b.getTime())
      .slice(0, 3);
    
    return {
      todayCount,
      totalScheduled,
      upcomingDates,
    };
  }, [counts]);

  // Get orders for selected date (only scheduled for future/today)
  const selectedDateOrders = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const orders = ordersByDate[dateKey] || [];
    
    // Filter: Only scheduled orders for future dates and today
    const today = startOfToday();
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    if (selected >= today) {
      // For today and future: only show scheduled orders
      return orders.filter((order) => order.status === "scheduled");
    }
    
    return [];
  }, [selectedDate, ordersByDate]);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handlePreviousMonth = useCallback(() => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    setSelectedDate(null);
  }, [viewDate]);

  const handleNextMonth = useCallback(() => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    setSelectedDate(null);
  }, [viewDate]);

  const tileContent = useCallback(({ date, view }: { date: Date; view: string }) => {
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
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 z-10">
        <Badge
          className="bg-gradient-to-r from-[#273492] to-[#1f2a7a] text-white text-[10px] px-2 py-0.5 h-5 min-w-[20px] flex items-center justify-center font-bold shadow-sm"
        >
          {scheduledCount}
        </Badge>
      </div>
    );
  }, [counts]);

  const tileClassName = useCallback(({ date, view }: { date: Date; view: string }) => {
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
  }, [counts, viewDate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb] pb-24">
      {/* Premium Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(39,52,146,0.05),transparent_50%)]" />
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto relative">
        {/* Premium Modern Header - Shopify/Flipkart Style */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200/60">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-[#273492] to-gray-900 bg-clip-text text-transparent">
                Order Calendar
              </h1>
              <Sparkles className="h-6 w-6 text-[#273492] animate-pulse" />
            </div>
            <p className="text-sm md:text-base text-gray-500 font-medium">
              View and manage scheduled orders for upcoming dates
            </p>
          </div>
        </div>

        {/* Quick Stats Bar */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <Card className="p-4 bg-gradient-to-br from-[#273492]/5 to-[#273492]/10 border-[#273492]/20 premium-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Today</p>
                  <p className="text-2xl font-bold text-[#273492]">{quickStats.todayCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Scheduled Orders</p>
                </div>
                <div className="p-3 bg-[#273492]/10 rounded-xl">
                  <CalendarIcon className="h-6 w-6 text-[#273492]" />
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50 premium-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">This Month</p>
                  <p className="text-2xl font-bold text-green-700">{quickStats.totalScheduled}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Scheduled</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-green-700" />
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50 premium-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Upcoming</p>
                  <p className="text-2xl font-bold text-orange-700">{quickStats.upcomingDates.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Dates with Orders</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Clock className="h-6 w-6 text-orange-700" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Loading State for Stats */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl shimmer-premium" />
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar */}
          <div className="flex-1">
            <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg premium-hover">
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
                className="w-full border-0 premium-calendar"
                navigationLabel={({ date }) => (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {format(date, "MMMM yyyy")}
                    </span>
                  </div>
                )}
                prevLabel={<ArrowLeft className="h-5 w-5 text-gray-700 hover:text-[#273492] transition-colors" />}
                nextLabel={<ArrowRight className="h-5 w-5 text-gray-700 hover:text-[#273492] transition-colors" />}
                minDetail="month"
                maxDetail="month"
              />

              {/* Legend */}
              <div className="mt-6 pt-6 border-t border-gray-200/60">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#273492] to-[#1f2a7a] shadow-sm"></div>
                    <span className="text-gray-700 font-medium">Scheduled Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-[#273492] bg-[#273492]/10"></div>
                    <span className="text-gray-700 font-medium">Today</span>
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
            <div className="lg:w-96 animate-fade-in">
              <Card className="p-4 md:p-6 h-full bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      {format(selectedDate, "EEEE, MMMM d")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {format(selectedDate, "yyyy")}
                    </p>
                    {isToday(selectedDate) && (
                      <Badge className="mt-2 bg-[#273492] text-white text-xs px-2 py-1">
                        Today
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                    className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-xl shimmer-premium" />
                    ))}
                  </div>
                ) : selectedDateOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                      <CalendarIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">No scheduled orders</p>
                    <p className="text-xs text-gray-500">
                      {isPast(selectedDate) && !isToday(selectedDate)
                        ? "This date has passed"
                        : "No orders scheduled for this date"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedDateOrders.map((order, index) => (
                      <OrderCard key={order.id} order={order} index={index} />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Empty State - No Date Selected */}
          {!selectedDate && (
            <div className="lg:w-96 animate-fade-in">
              <Card className="p-6 h-full flex items-center justify-center bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg">
                <div className="text-center">
                  <div className="inline-flex p-4 bg-gradient-to-br from-[#273492]/10 to-[#273492]/5 rounded-full mb-4">
                    <CalendarIcon className="h-8 w-8 text-[#273492]" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Select a date
                  </p>
                  <p className="text-xs text-gray-500">
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
