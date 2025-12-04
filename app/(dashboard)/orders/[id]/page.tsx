"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo, memo } from "react";
import { ArrowLeft, CheckCircle, Edit, AlertCircle, User, Phone, MapPin, ExternalLink, Calendar, FileText, PlayCircle, Clock, CalendarDays, Package, IndianRupee, Sparkles } from "lucide-react";
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
import { OrderTimeline } from "@/components/orders/order-timeline";
import { PageNavbar } from "@/components/layout/page-navbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImageLightbox } from "@/components/ui/image-lightbox";

export default function OrderDetailsPage() {
  // ===== ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS =====
  
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { user } = useUserStore();
  
  const orderId = params.id as string;
  
  // Query hooks - call unconditionally (useOrder handles invalid IDs gracefully)
  const validOrderId = (!orderId || orderId === "undefined" || orderId === "null") ? "" : orderId;
  const { data: order, isLoading, error: orderError } = useOrder(validOrderId);
  const startRentalMutation = useStartRental();
  
  // State hooks - call unconditionally
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Memoized error code - call unconditionally
  const errorCode = useMemo(() => (orderError as any)?.code || (orderError as any)?.status, [orderError]);
  
  // Memoize computed values - call unconditionally (safe even if order is null)
  const days = useMemo(() => {
    if (!order?.start_date || !order?.end_date) return 0;
    return calculateDays(order.start_date, order.end_date);
  }, [order?.start_date, order?.end_date]);
  
  const isCompleted = useMemo(() => order?.status === "completed", [order?.status]);
  const isScheduled = useMemo(() => order?.status === "scheduled", [order?.status]);
  
  const endDate = useMemo(() => {
    if (!order) return null;
    return (order as any).end_datetime || order.end_date;
  }, [order]);
  
  const isLate = useMemo(() => {
    if (!endDate || isCompleted || isScheduled) return false;
    return isOrderLate(endDate);
  }, [endDate, isCompleted, isScheduled]);
  
  const gstEnabled = useMemo(() => user?.gst_enabled ?? false, [user?.gst_enabled]);
  const gstRate = useMemo(() => user?.gst_rate || 5.00, [user?.gst_rate]);
  
  // Effect hooks - call unconditionally
  useEffect(() => {
    const shouldPrint = searchParams.get('print') === 'true';
    if (shouldPrint && order && !isLoading) {
      setShowInvoiceDialog(true);
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [searchParams, order, isLoading]);
  
  // Memoized status badge - call unconditionally
  const statusBadge = useMemo(() => {
    if (!order) return null;
    
    const badgeClass = "px-4 py-2 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2";
    
    if (isScheduled) {
      return (
        <Badge className={`${badgeClass} bg-blue-500 text-white`}>
          <Calendar className="h-4 w-4" />
          Scheduled
        </Badge>
      );
    }
    if (isCompleted) {
      return (
        <Badge className={`${badgeClass} bg-green-500 text-white`}>
          <CheckCircle className="h-4 w-4" />
          Completed
        </Badge>
      );
    }
    if (order.status === "partially_returned") {
      return (
        <Badge className={`${badgeClass} bg-orange-500 text-white`}>
          <Package className="h-4 w-4" />
          Partially Returned
        </Badge>
      );
    }
    if (isLate) {
      return (
        <Badge className={`${badgeClass} bg-red-500 text-white pulse-glow`}>
          <AlertCircle className="h-4 w-4" />
          Late Return
        </Badge>
      );
    }
    if (order.status === "active") {
      return (
        <Badge className={`${badgeClass} bg-orange-500 text-white`}>
          <PlayCircle className="h-4 w-4" />
          Active
        </Badge>
      );
    }
    if (order.status === "cancelled") {
      return (
        <Badge className={`${badgeClass} bg-gray-500 text-white`}>
          <AlertCircle className="h-4 w-4" />
          Cancelled
        </Badge>
      );
    }
    return (
      <Badge className={`${badgeClass} bg-gray-500 text-white`}>
        {order.status}
      </Badge>
    );
  }, [order, isScheduled, isCompleted, isLate]);
  
  // Callback - call unconditionally
  const handleStartRental = async () => {
    if (!orderId || !validOrderId) return;
    try {
      await startRentalMutation.mutateAsync(orderId);
      showToast("Rental started successfully!", "success");
      router.refresh();
    } catch (error: any) {
      showToast(error.message || "Failed to start rental", "error");
    }
  };
  
  // ===== NOW ALL HOOKS ARE CALLED - SAFE TO DO CONDITIONAL RETURNS =====
  
  // Fix #2: Guard against invalid orderId
  if (!orderId || orderId === "undefined" || orderId === "null") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb] p-4">
        <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-2 border-red-200 rounded-xl shadow-lg max-w-md mx-auto animate-fade-in">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-bold text-lg mb-2">Invalid Order ID</p>
          <p className="text-sm text-gray-500 mb-4">
            The order ID in the URL is invalid: <code className="bg-gray-100 px-2 py-1 rounded font-mono">{orderId || "missing"}</code>
          </p>
          <Link href="/orders">
            <Button className="mt-4 premium-hover bg-gradient-to-r from-[#273492] to-[#1f2a7a]">Back to Orders</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Optimized loading state - Fast rendering
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#273492] mx-auto" style={{ willChange: "transform" }} />
          <p className="text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  // Premium error state - Fast rendering
  if (orderError && errorCode !== "PGRST116" && errorCode !== 404) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb] p-4">
        <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-2 border-red-200 rounded-xl shadow-lg max-w-md mx-auto animate-fade-in">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-bold text-lg mb-2">Error loading order</p>
          <p className="text-sm text-red-600 mb-6">
            {orderError.message || "An error occurred while loading the order"}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/orders">
              <Button variant="outline" className="premium-hover">Back to Orders</Button>
            </Link>
            <Button onClick={() => window.location.reload()} className="premium-hover">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Premium not found state - Fast rendering
  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb] p-4">
        <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl shadow-lg max-w-md mx-auto animate-fade-in">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-700 font-bold text-lg mb-2">Order not found</p>
          <p className="text-sm text-gray-500 mb-6">
            The order you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link href="/orders">
            <Button className="mt-4 premium-hover bg-gradient-to-r from-[#273492] to-[#1f2a7a]">
              Back to Orders
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Main render - order is guaranteed to exist here (after all conditional returns)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb] pb-24">
      {/* Premium Background Pattern - Fixed, won't cause re-renders */}
      <div className="fixed inset-0 -z-10 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(39,52,146,0.05),transparent_50%)]" />
      </div>

      {/* Modern Professional Navbar */}
      <PageNavbar
        title={order.invoice_number || "Order Details"}
        subtitle={`Order #${order.invoice_number}`}
        backHref="/orders"
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/orders/${orderId}/edit`}>
              <button
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 text-gray-700 hover:text-gray-900 premium-hover"
                aria-label="Edit order"
              >
                <Edit className="h-5 w-5" />
              </button>
            </Link>
            {isScheduled && (
              <button
                onClick={handleStartRental}
                disabled={startRentalMutation.isPending}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl premium-hover"
              >
                {startRentalMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    <span>Start Rental</span>
                  </>
                )}
              </button>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Main Content Grid - Shopify-like Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Premium Order Status & Info Card - GPU Accelerated */}
            <Card 
              className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-lg rounded-xl premium-hover"
              style={{
                animation: "fadeInUp 0.5s ease-out forwards",
                opacity: 0,
                willChange: "transform, opacity",
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-[#273492] to-gray-900 bg-clip-text text-transparent mb-1">
                    {order.invoice_number}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">
                    {order.booking_date 
                      ? formatDateTime(order.booking_date) 
                      : formatDateTime(order.created_at)}
                  </p>
                </div>
                <div style={{
                  animation: "fadeInUp 0.5s ease-out 0.1s forwards",
                  opacity: 0,
                  willChange: "transform, opacity",
                }}>
                  {statusBadge}
                </div>
              </div>

              {/* Premium Customer Info */}
              {order.customer && (
                <div className="pt-6 border-t border-gray-200/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#273492]/20 to-[#273492]/10 flex items-center justify-center shadow-sm premium-hover">
                        <User className="h-6 w-6 text-[#273492]" />
                      </div>
                      <div>
                        <Link 
                          href={`/customers/${order.customer.id}`}
                          className="text-base font-bold text-gray-900 hover:text-[#273492] transition-all duration-200 flex items-center gap-2 group"
                        >
                          {order.customer.name || "Unknown Customer"}
                          <ExternalLink className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </Link>
                        {order.customer.phone && (
                          <a 
                            href={`tel:${order.customer.phone}`}
                            className="text-sm text-gray-600 hover:text-[#273492] transition-all duration-200 flex items-center gap-2 mt-1"
                          >
                            <Phone className="h-4 w-4" />
                            <span className="font-semibold">{order.customer.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Premium Rental Period Card - GPU Accelerated */}
            <Card 
              className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-lg rounded-xl premium-hover"
              style={{
                animation: "fadeInUp 0.5s ease-out 0.2s forwards",
                opacity: 0,
                willChange: "transform, opacity",
              }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#273492]" />
                Rental Period
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-5 rounded-xl border-2 transition-all duration-300 premium-hover ${
                  isLate ? "bg-red-50/50 border-red-200" : "bg-gradient-to-br from-gray-50 to-blue-50/30 border-gray-200"
                }`}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</p>
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#273492]" />
                    {formatDateTime((order as any).start_datetime || order.start_date)}
                  </p>
                </div>
                <div className={`p-5 rounded-xl border-2 transition-all duration-300 premium-hover ${
                  isLate ? "bg-red-50/50 border-red-200 pulse-glow" : "bg-gradient-to-br from-gray-50 to-blue-50/30 border-gray-200"
                }`}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date</p>
                  <p className={`text-sm font-bold flex items-center gap-2 ${
                    isLate ? "text-red-600" : "text-gray-900"
                  }`}>
                    <CalendarDays className="h-4 w-4" />
                    {formatDateTime((order as any).end_datetime || order.end_date)}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-5 border-t border-gray-200/60 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[#273492]" />
                  <span className="text-sm text-gray-600 font-medium">
                    Duration: <span className="font-bold text-gray-900">{days} {days === 1 ? "day" : "days"}</span>
                  </span>
                </div>
                {isLate && order.late_fee && order.late_fee > 0 && (
                  <Badge className="bg-red-500 text-white px-3 py-1.5 pulse-glow shadow-sm">
                    Late Fee: {formatCurrency(order.late_fee)}
                  </Badge>
                )}
              </div>
            </Card>

            {/* Return Section - Hide for scheduled orders (rental hasn't started) and cancelled orders */}
            {order.status !== "cancelled" && !isScheduled && (
              <div>
                <OrderReturnSection
                  order={order}
                  onReturnComplete={() => {
                    router.refresh();
                  }}
                />
              </div>
            )}

            {/* Premium Scheduled Order Action Card - GPU Accelerated */}
            {isScheduled && (
              <Card 
                className="p-6 bg-gradient-to-br from-blue-50/80 to-blue-100/50 border-2 border-blue-200 rounded-xl shadow-lg"
                style={{
                  animation: "fadeInUp 0.5s ease-out 0.3s forwards",
                  opacity: 0,
                  willChange: "transform, opacity",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-blue-900">Scheduled Rental</h3>
                    <p className="text-xs text-blue-600 mt-0.5 font-medium">Ready to begin rental period</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-5 font-medium">
                  Scheduled to start: <span className="font-bold">{formatDateTime((order as any).start_datetime || order.start_date)}</span>
                </p>
                <Button
                  onClick={handleStartRental}
                  disabled={startRentalMutation.isPending}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl h-12 font-bold shadow-lg hover:shadow-xl premium-hover transition-all duration-200"
                >
                  {startRentalMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                      Starting Rental...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Start Rental Now
                    </>
                  )}
                </Button>
              </Card>
            )}

            {/* Order Timeline */}
            <div>
              <OrderTimeline orderId={orderId} />
            </div>
          </div>

          {/* Right Column - Premium Summary & Actions (1/3 width on desktop) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Premium Order Summary - Sticky for performance */}
            <Card 
              className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-lg rounded-xl sticky top-6 premium-hover"
              style={{
                animation: "fadeInUp 0.5s ease-out 0.1s forwards",
                opacity: 0,
                willChange: "transform, opacity",
              }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#273492]" />
                Summary
              </h3>
              <div className="space-y-4">
                {order.subtotal !== undefined && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-200/60">
                    <span className="text-sm text-gray-600 font-medium">Subtotal</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(order.subtotal)}</span>
                  </div>
                )}
                {gstEnabled && order.gst_amount && order.gst_amount > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-200/60">
                    <span className="text-sm text-gray-600 font-medium">GST ({gstRate}%)</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(order.gst_amount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-gray-200/60">
                  <span className="text-sm text-gray-600 font-medium">Late Fee</span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(order.late_fee || 0)}</span>
                </div>
                <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100/50 -mx-2 px-2 py-3 rounded-lg">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#273492] to-[#1f2a7a] bg-clip-text text-transparent">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Premium Invoice Actions */}
            <Card 
              className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-lg rounded-xl premium-hover"
              style={{
                animation: "fadeInUp 0.5s ease-out 0.2s forwards",
                opacity: 0,
                willChange: "transform, opacity",
              }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#273492]" />
                Invoice
              </h3>
              <InvoiceShare 
                order={order} 
                user={user}
                showInvoice={showInvoiceDialog}
                onShowInvoiceChange={setShowInvoiceDialog}
              />
            </Card>

            {/* Premium Additional Info */}
            <Card 
              className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-lg rounded-xl premium-hover"
              style={{
                animation: "fadeInUp 0.5s ease-out 0.3s forwards",
                opacity: 0,
                willChange: "transform, opacity",
              }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-5">Details</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-200/60">
                  <span className="text-gray-600 font-medium">Order ID</span>
                  <span className="font-mono text-gray-900 text-xs bg-gray-100 px-2 py-1 rounded">{order.id.slice(0, 8)}...</span>
                </div>
                {order.staff && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-200/60">
                    <span className="text-gray-600 font-medium">Created by</span>
                    <span className="text-gray-900 font-semibold">{order.staff.full_name || order.staff.username}</span>
                  </div>
                )}
                {order.branch && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Branch</span>
                    <span className="text-gray-900 font-semibold">{order.branch.name}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Lightbox for Product Images */}
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
