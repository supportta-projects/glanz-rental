"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, Edit, AlertCircle, User, Phone, MapPin, ExternalLink, Calendar, FileText, PlayCircle, Clock, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOrder, useStartRental } from "@/lib/queries/orders";
import { formatDate, formatDateTime, calculateDays, formatCurrency, isOrderLate } from "@/lib/utils/date";
import { useToast } from "@/components/ui/toast";
import { InvoiceShare } from "@/components/invoice/invoice-share";
import { useUserStore } from "@/lib/stores/useUserStore";
import { OrderReturnSection } from "@/components/orders/order-return-section";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { user } = useUserStore();
  
  // Fix #2: Validate and log orderId from params
  const orderId = params.id as string;
  
  console.log("[OrderDetailsPage] 📍 Route params:", params);
  console.log("[OrderDetailsPage] 📋 Order ID:", orderId);
  console.log("[OrderDetailsPage] 👤 User state:", {
    id: user?.id,
    branchId: user?.branch_id,
    role: user?.role,
    fullName: user?.full_name,
  });

  // Fix #2: Guard against invalid orderId
  if (!orderId || orderId === "undefined" || orderId === "null") {
    return (
      <div className="min-h-screen bg-zinc-50 p-4">
        <Card className="p-8 text-center">
          <p className="text-red-500 font-medium mb-2">Invalid Order ID</p>
          <p className="text-sm text-gray-500 mb-4">
            The order ID in the URL is invalid: <code className="bg-gray-100 px-2 py-1 rounded">{orderId || "missing"}</code>
          </p>
          <Link href="/orders">
            <Button className="mt-4">Back to Orders</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Add error state to the query
  const { data: order, isLoading, error: orderError } = useOrder(orderId);
  const startRentalMutation = useStartRental();
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  
  // Handle print parameter from URL
  useEffect(() => {
    const shouldPrint = searchParams.get('print') === 'true';
    if (shouldPrint && order && !isLoading) {
      // Open invoice dialog
      setShowInvoiceDialog(true);
      // Trigger print after dialog opens
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [searchParams, order, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#273492]" />
      </div>
    );
  }

  // Show error state if there's an actual error (not just "not found")
  const errorCode = (orderError as any)?.code || (orderError as any)?.status;
  if (orderError && errorCode !== "PGRST116" && errorCode !== 404) {
    return (
      <div className="min-h-screen bg-zinc-50 p-4">
        <Card className="p-8 text-center">
          <p className="text-red-500 font-medium mb-2">Error loading order</p>
          <p className="text-sm text-gray-500 mb-4">
            {orderError.message || "An error occurred while loading the order"}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/orders">
              <Button variant="outline">Back to Orders</Button>
            </Link>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show "not found" only if order is null and no error (or "not found" error)
  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-50 p-4">
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-2">Order not found</p>
          <p className="text-sm text-gray-400 mb-4">
            The order you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link href="/orders">
            <Button className="mt-4">Back to Orders</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const days = calculateDays(order.start_date, order.end_date);
  const isCompleted = order.status === "completed";
  const isScheduled = order.status === "scheduled"; // Check if order is scheduled
  const endDate = (order as any).end_datetime || order.end_date;
  const isLate = !isCompleted && !isScheduled && isOrderLate(endDate); // Don't show late for scheduled orders
  const gstEnabled = user?.gst_enabled ?? false;
  const gstRate = user?.gst_rate || 5.00;

  const handleStartRental = async () => {
    try {
      await startRentalMutation.mutateAsync(orderId);
      showToast("Rental started successfully!", "success");
      router.refresh(); // Refresh to show updated status
    } catch (error: any) {
      showToast(error.message || "Failed to start rental", "error");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Minimal Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Link href="/orders" className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </Link>
          <h1 className="text-[9px] font-normal text-gray-500 font-mono">
            {order.invoice_number || "N/A"}
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Always show Edit button - invoice/billing can be edited for any order */}
          <Link href={`/orders/${orderId}/edit`}>
            <button
              className="p-1.5 hover:bg-[#273492]/10 rounded-md transition-colors text-[#273492] hover:text-[#1f2a7a]"
              aria-label="Edit order"
            >
              <Edit className="h-4 w-4" />
            </button>
          </Link>
          {/* Show "Start Rental" button for scheduled orders */}
          {isScheduled && (
            <button
              onClick={handleStartRental}
              disabled={startRentalMutation.isPending}
              className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {startRentalMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>Start</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-8">
        {/* Booking Information Card - Professional Design */}
        <Card className="p-6 rounded-xl bg-gradient-to-br from-white to-gray-50 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Booking Information</h2>
                <p className="text-lg font-semibold text-gray-900">Order Details</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Booking Date</p>
                <p className="text-sm font-semibold text-gray-900">
                  {order.booking_date 
                    ? formatDateTime(order.booking_date) 
                    : formatDateTime(order.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Invoice Number</p>
                <p className="text-sm font-semibold text-purple-600 font-mono tracking-wide">
                  {order.invoice_number || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Customer Card - Professional Design */}
        {order.customer && (
          <Link href={`/customers/${order.customer.id}`}>
            <Card className="p-6 rounded-xl bg-gradient-to-br from-white to-gray-50 shadow-sm border border-gray-200 hover:shadow-md hover:border-[#273492]/30 transition-all duration-200 cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl group-hover:from-sky-200 group-hover:to-blue-200 transition-colors">
                    <User className="h-6 w-6 text-[#273492]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-1">Customer Information</h2>
                    <p className="text-2xl font-bold text-gray-900 group-hover:text-[#273492] transition-colors flex items-center gap-2">
                      {order.customer.name || "Unknown"}
                      <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 pt-3 border-t border-gray-100">
                {order.customer.phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-[#273492]/10 transition-colors">
                      <Phone className="h-4 w-4 text-gray-600 group-hover:text-[#273492]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{order.customer.phone}</p>
                    </div>
                  </div>
                )}
                {order.customer.address && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-[#273492]/10 transition-colors mt-0.5">
                      <MapPin className="h-4 w-4 text-gray-600 group-hover:text-[#273492]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">{order.customer.address}</p>
                    </div>
                  </div>
                )}
                {!order.customer.phone && !order.customer.address && (
                  <p className="text-sm text-gray-500 italic">No additional information available</p>
                )}
              </div>
            </Card>
          </Link>
        )}
        {!order.customer && (
          <Card className="p-6 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-200 rounded-xl">
                <User className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Customer Information</h2>
                <p className="text-lg font-semibold text-gray-400">Unknown Customer</p>
              </div>
            </div>
          </Card>
        )}

        {/* Rental Period Card - Professional Design */}
        <div className="mt-8">
          <Card className={`p-6 rounded-xl shadow-sm border border-gray-200 ${
            isScheduled 
              ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200" 
              : isLate 
              ? "bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200" 
              : "bg-gradient-to-br from-white to-gray-50"
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  isScheduled 
                    ? "bg-gradient-to-br from-blue-100 to-indigo-100" 
                    : isLate 
                    ? "bg-gradient-to-br from-red-100 to-pink-100" 
                    : "bg-gradient-to-br from-emerald-100 to-teal-100"
                }`}>
                  <CalendarDays className={`h-6 w-6 ${
                    isScheduled 
                      ? "text-blue-600" 
                      : isLate 
                      ? "text-red-600" 
                      : "text-emerald-600"
                  }`} />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-gray-500 mb-1">Rental Period</h2>
                  <p className="text-lg font-semibold text-gray-900">Duration & Timeline</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isScheduled && (
                  <Badge className="bg-blue-500 text-white px-3 py-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    Scheduled
                  </Badge>
                )}
                {isLate && (
                  <Badge className="bg-red-500 text-white px-3 py-1 animate-pulse">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Late Return
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-4 pt-3 border-t border-gray-200">
              {/* Start Date */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isScheduled 
                    ? "bg-blue-100" 
                    : isLate 
                    ? "bg-red-100" 
                    : "bg-emerald-100"
                }`}>
                  <Clock className={`h-4 w-4 ${
                    isScheduled 
                      ? "text-blue-600" 
                      : isLate 
                      ? "text-red-600" 
                      : "text-emerald-600"
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Start Date & Time</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDateTime((order as any).start_datetime || order.start_date)}
                  </p>
                </div>
              </div>
              
              {/* End Date */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isScheduled 
                    ? "bg-blue-100" 
                    : isLate 
                    ? "bg-red-100" 
                    : "bg-emerald-100"
                }`}>
                  <Clock className={`h-4 w-4 ${
                    isScheduled 
                      ? "text-blue-600" 
                      : isLate 
                      ? "text-red-600" 
                      : "text-emerald-600"
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">End Date & Time</p>
                  <p className={`text-sm font-semibold ${isLate ? "text-red-600" : "text-gray-900"}`}>
                    {formatDateTime((order as any).end_datetime || order.end_date)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Duration Badge */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
              <Badge className={`px-3 py-1.5 text-sm font-semibold ${
                isScheduled 
                  ? "bg-blue-500 text-white" 
                  : isLate 
                  ? "bg-red-500 text-white" 
                  : "bg-emerald-500 text-white"
              }`}>
                <CalendarDays className="h-3 w-3 mr-1.5" />
                {days} {days === 1 ? "day" : "days"}
              </Badge>
              {isLate && order.late_fee && order.late_fee > 0 && (
                <Badge className="bg-orange-500 text-white px-3 py-1.5 text-sm font-semibold">
                  <AlertCircle className="h-3 w-3 mr-1.5" />
                  Late Fee: {formatCurrency(order.late_fee)}
                </Badge>
              )}
            </div>
          </Card>
        </div>

        {/* Invoice Share */}
        <div>
          <InvoiceShare 
            order={order} 
            user={user}
            showInvoice={showInvoiceDialog}
            onShowInvoiceChange={setShowInvoiceDialog}
          />
        </div>

        {/* Return Section - ONLY show for active/ongoing orders, NOT scheduled */}
        {order.status !== "cancelled" && order.status !== "scheduled" && (
          <div>
            <OrderReturnSection
              order={order}
              onReturnComplete={() => {
                // Refetch order data to show updated status
                router.refresh();
              }}
            />
          </div>
        )}

        {/* Scheduled Order Info Card - Show for scheduled orders */}
        {isScheduled && (
          <Card className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-blue-900">Scheduled Rental</h2>
                <p className="text-xs text-blue-600 mt-0.5">Ready to begin rental period</p>
              </div>
            </div>
            <div className="bg-white/60 rounded-lg p-4 mb-4 border border-blue-100">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold text-gray-900">Scheduled Start:</span>{" "}
                {formatDateTime((order as any).start_datetime || order.start_date)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Click the button below or use the "Start Rental" button in the header to begin the rental period.
              </p>
            </div>
            <Button
              onClick={handleStartRental}
              disabled={startRentalMutation.isPending}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 border-2 border-orange-400 text-base"
            >
              {startRentalMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Starting Rental...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5" />
                  <span>Start Rental Now</span>
                </>
              )}
            </Button>
          </Card>
        )}

        {/* Order Summary - Professional & Minimal */}
        <Card className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
          <div className="space-y-2.5">
            {gstEnabled && order.gst_amount && order.gst_amount > 0 && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">
                  GST ({gstRate}%)
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(order.gst_amount)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
              <span className="text-sm text-gray-600">
                Late Fee
              </span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(order.late_fee || 0)}
              </span>
            </div>
            {order.subtotal !== undefined && (
              <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  Subtotal
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t-2 border-gray-200">
              <span className="text-base font-semibold text-gray-900">
                Grand Total
              </span>
              <span className="text-xl font-bold text-[#273492]">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </Card>


      </div>
    </div>
  );
}

