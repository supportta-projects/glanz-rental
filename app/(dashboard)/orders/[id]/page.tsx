"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, Edit, AlertCircle } from "lucide-react";
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
import { PlayCircle, Calendar } from "lucide-react";

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
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
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900 transition-colors" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
        </div>
        <div className="flex items-center gap-3">
          {!isCompleted && !isScheduled && (
            <Link href={`/orders/${orderId}/edit`}>
              <Button
                variant="outline"
                className="h-10 px-4 border-sky-500 text-sky-500 hover:bg-sky-50 rounded-xl"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {/* Show "Start Rental" button for scheduled orders - Professional Design */}
          {isScheduled && (
            <Button
              onClick={handleStartRental}
              disabled={startRentalMutation.isPending}
              className="h-11 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 border-2 border-orange-400"
            >
              {startRentalMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5" />
                  <span>Start Rental</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Customer Card */}
        <Card className="p-5 rounded-xl bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Customer</h2>
          <p className="text-xl font-bold text-gray-900">
            {order.customer?.name || "Unknown"}
          </p>
          <p className="text-base text-gray-600 mt-1">
            {order.customer?.phone || "N/A"}
          </p>
        </Card>

        {/* Booking Information Card */}
        <Card className="p-5 rounded-xl bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Booking Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Booking Date</p>
              <p className="text-base font-medium text-gray-900">
                {order.booking_date 
                  ? formatDateTime(order.booking_date) 
                  : formatDateTime(order.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Invoice Number</p>
              <p className="text-base font-semibold text-sky-600 font-mono">
                {order.invoice_number || "N/A"}
              </p>
            </div>
          </div>
        </Card>

        {/* Dates Card - Show scheduled badge for scheduled orders */}
        <Card className={`p-5 rounded-xl shadow-sm ${
          isScheduled 
            ? "bg-blue-50 border-2 border-blue-200" 
            : isLate 
            ? "bg-red-50 border-2 border-red-200" 
            : "bg-white"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Rental Period
            </h2>
            {isScheduled && (
              <Badge className="bg-blue-500 text-white">
                <Calendar className="h-3 w-3 mr-1" />
                Scheduled
              </Badge>
            )}
            {isLate && (
              <Badge className="bg-red-500 text-white animate-pulse">
                <AlertCircle className="h-3 w-3 mr-1" />
                Late Return
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Start Date & Time</p>
              <p className="text-base font-medium text-gray-900">
                {formatDateTime((order as any).start_datetime || order.start_date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">End Date & Time</p>
              <p className={`text-base font-medium ${isLate ? "text-red-600" : "text-gray-900"}`}>
                {formatDateTime((order as any).end_datetime || order.end_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge className="bg-sky-500 text-white">{days} days</Badge>
            {isLate && order.late_fee && order.late_fee > 0 && (
              <Badge className="bg-orange-500 text-white">
                Late Fee: {formatCurrency(order.late_fee)}
              </Badge>
            )}
          </div>
        </Card>

        {/* Invoice Share */}
        <div className="pt-4">
          <InvoiceShare 
            order={order} 
            user={user}
            showInvoice={showInvoiceDialog}
            onShowInvoiceChange={setShowInvoiceDialog}
          />
        </div>

        {/* Return Section - ONLY show for active/ongoing orders, NOT scheduled */}
        {order.status !== "cancelled" && order.status !== "scheduled" && (
          <div className="pt-4">
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

        {/* Order Summary with GST - Moved to bottom */}
        <Card className="p-5 rounded-xl bg-sky-50 shadow-sm space-y-3">
          {gstEnabled && order.gst_amount && order.gst_amount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-700">
                GST ({gstRate}%)
              </span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(order.gst_amount)}
              </span>
            </div>
          )}
          {order.late_fee && order.late_fee > 0 && (
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-base font-medium text-orange-700">
                Late Fee
              </span>
              <span className="text-lg font-semibold text-orange-700">
                {formatCurrency(order.late_fee)}
              </span>
            </div>
          )}
          {order.subtotal !== undefined && (
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-base font-medium text-gray-700">
                Subtotal
              </span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-xl font-semibold text-gray-700">
              Grand Total
            </span>
            <span className="text-3xl font-bold text-sky-600">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </Card>


      </div>
    </div>
  );
}

