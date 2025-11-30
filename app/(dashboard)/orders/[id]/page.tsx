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
import { useOrder } from "@/lib/queries/orders";
import { useUpdateOrderStatus } from "@/lib/queries/orders";
import { formatDate, formatDateTime, calculateDays, formatCurrency, isOrderLate } from "@/lib/utils/date";
import { useToast } from "@/components/ui/toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { InvoiceShare } from "@/components/invoice/invoice-share";
import { useUserStore } from "@/lib/stores/useUserStore";

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
  const updateStatusMutation = useUpdateOrderStatus();
  const [showLateFeeDialog, setShowLateFeeDialog] = useState(false);
  const [lateFee, setLateFee] = useState("0");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

  const handleMarkReturned = async () => {
    if (!order) return;

    const endDate = (order as any).end_datetime || order.end_date;
    const isLate = isOrderLate(endDate);

    // Always show late fee dialog if order is late (even if fee is 0)
    // This allows staff to see that order is late and optionally add fee
    if (isLate) {
      setShowLateFeeDialog(true);
    } else {
      // Not late, mark as returned directly with 0 fee
      await markAsReturned(0);
    }
  };

  const markAsReturned = async (fee: number) => {
    if (!order) return;

    try {
      // Use the mutation which properly handles late fee and invalidates queries
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        status: "completed",
        lateFee: fee,
      });

      showToast("Order marked as returned", "success");
      setShowLateFeeDialog(false);
      router.push("/orders");
    } catch (error: any) {
      showToast(error.message || "Failed to update order", "error");
    }
  };

  const handleLateFeeSubmit = () => {
    const fee = parseFloat(lateFee) || 0;
    markAsReturned(fee);
  };

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
  const endDate = (order as any).end_datetime || order.end_date;
  const isLate = !isCompleted && isOrderLate(endDate);
  const gstEnabled = user?.gst_enabled ?? false;
  const gstRate = user?.gst_rate || 5.00;

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
        </div>
        {!isCompleted && (
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
      </div>

      <div className="p-4 space-y-4">
        {/* Customer Card */}
        <Card className="p-5 rounded-xl bg-white">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Customer</h2>
          <p className="text-xl font-bold text-gray-900">
            {order.customer?.name || "Unknown"}
          </p>
          <p className="text-base text-gray-600 mt-1">
            {order.customer?.phone || "N/A"}
          </p>
        </Card>

        {/* Dates Card */}
        <Card className={`p-5 rounded-xl ${isLate ? "bg-red-50 border-2 border-red-200" : "bg-white"}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Rental Period
            </h2>
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

        {/* Items Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Items</h2>
          {order.items && order.items.length > 0 ? (
            order.items.map((item) => (
              <Card key={item.id} className="p-4 rounded-xl bg-white">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.photo_url}
                      alt={item.product_name || "Product"}
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                      onClick={() => setSelectedImage(item.photo_url)}
                      onTouchEnd={(e) => {
                        // Handle touch to open on mobile
                        e.stopPropagation();
                        setSelectedImage(item.photo_url);
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {item.product_name || "Unnamed Product"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {item.quantity} × {formatCurrency(item.price_per_day)}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-gray-600">Line Total</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(item.line_total)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-4">
              <p className="text-gray-500">No items found</p>
            </Card>
          )}
        </div>

        {/* Order Summary with GST */}
        <Card className="p-5 rounded-xl bg-sky-50 space-y-3">
          {order.subtotal !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-700">
                Subtotal
              </span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
          )}
          {gstEnabled && order.gst_amount && order.gst_amount > 0 && (
            <div className="flex items-center justify-between border-t pt-3">
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
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-xl font-semibold text-gray-700">
              Grand Total
            </span>
            <span className="text-3xl font-bold text-sky-600">
              {formatCurrency(order.total_amount)}
            </span>
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

        {/* Actions */}
        {!isCompleted && (
          <div className="pt-4">
            <Button
              onClick={handleMarkReturned}
              disabled={updateStatusMutation.isPending}
              className="w-full h-14 bg-green-500 hover:bg-green-600 text-white text-base font-semibold rounded-xl"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {updateStatusMutation.isPending
                ? "Updating..."
                : "Mark as Returned"}
            </Button>
          </div>
        )}

        {/* Late Fee Dialog */}
        <Dialog open={showLateFeeDialog} onOpenChange={setShowLateFeeDialog}>
          <DialogContent onClose={() => setShowLateFeeDialog(false)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Order Returned Late
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm font-medium text-orange-800">
                  ⚠️ This order was returned after the due date.
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  End Date: {formatDateTime(endDate)}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Would you like to add a late fee? Enter 0 if no late fee is required.
              </p>
              <div className="space-y-2">
                <Label>Late Fee Amount (₹)</Label>
                <Input
                  type="number"
                  value={lateFee}
                  onChange={(e) => setLateFee(e.target.value)}
                  placeholder="0"
                  className="h-12 text-base"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500">
                  Enter 0 if no late fee is required
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLateFee("0");
                    setShowLateFeeDialog(false);
                  }}
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLateFeeSubmit}
                  className="flex-1 h-12 bg-green-500 hover:bg-green-600"
                >
                  Mark Returned
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <ImageLightbox
          imageUrl={selectedImage}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          alt="Product image"
        />
      )}
    </div>
  );
}

