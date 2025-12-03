"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, Edit, AlertCircle, User, Phone, MapPin, ExternalLink, Calendar, FileText, PlayCircle, Clock, CalendarDays, Package, IndianRupee } from "lucide-react";
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
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { user } = useUserStore();
  
  const orderId = params.id as string;

  // Fix #2: Guard against invalid orderId
  if (!orderId || orderId === "undefined" || orderId === "null") {
    return (
      <div className="min-h-screen bg-[#f7f9fb] p-4">
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Handle print parameter from URL
  useEffect(() => {
    const shouldPrint = searchParams.get('print') === 'true';
    if (shouldPrint && order && !isLoading) {
      setShowInvoiceDialog(true);
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [searchParams, order, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#273492]" />
      </div>
    );
  }

  // Show error state if there's an actual error (not just "not found")
  const errorCode = (orderError as any)?.code || (orderError as any)?.status;
  if (orderError && errorCode !== "PGRST116" && errorCode !== 404) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] p-4">
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
      <div className="min-h-screen bg-[#f7f9fb] p-4">
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
  const isScheduled = order.status === "scheduled";
  const endDate = (order as any).end_datetime || order.end_date;
  const isLate = !isCompleted && !isScheduled && isOrderLate(endDate);
  const gstEnabled = user?.gst_enabled ?? false;
  const gstRate = user?.gst_rate || 5.00;

  const handleStartRental = async () => {
    try {
      await startRentalMutation.mutateAsync(orderId);
      showToast("Rental started successfully!", "success");
      router.refresh();
    } catch (error: any) {
      showToast(error.message || "Failed to start rental", "error");
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    if (isScheduled) {
      return <Badge className="bg-blue-500 text-white">Scheduled</Badge>;
    }
    if (isCompleted) {
      return <Badge className="bg-green-500 text-white">Completed</Badge>;
    }
    if (order.status === "partially_returned") {
      return <Badge className="bg-orange-500 text-white">Partially Returned</Badge>;
    }
    if (isLate) {
      return <Badge className="bg-red-500 text-white">Late Return</Badge>;
    }
    if (order.status === "active") {
      return <Badge className="bg-yellow-500 text-white">Active</Badge>;
    }
    if (order.status === "cancelled") {
      return <Badge className="bg-gray-500 text-white">Cancelled</Badge>;
    }
    return <Badge className="bg-gray-500 text-white">{order.status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] pb-24">
      {/* Modern Professional Navbar */}
      <PageNavbar
        title={order.invoice_number || "Order Details"}
        subtitle={`Order #${order.invoice_number}`}
        backHref="/orders"
        actions={
          <div className="flex items-center gap-2">
            {/* Always show Edit button */}
            <Link href={`/orders/${orderId}/edit`}>
              <button
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-700 hover:text-gray-900"
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
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:shadow-md active:scale-[0.97]"
              >
                {startRentalMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-3.5 w-3.5" />
                    <span>Start Rental</span>
                  </>
                )}
              </button>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Main Content Grid - Shopify-like Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status & Info Card */}
            <Card className="p-6 bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{order.invoice_number}</h2>
                  <p className="text-sm text-gray-500">
                    {order.booking_date 
                      ? formatDateTime(order.booking_date) 
                      : formatDateTime(order.created_at)}
                  </p>
                </div>
                {getStatusBadge()}
              </div>

              {/* Customer Info - Simple & Clean */}
              {order.customer && (
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#273492]/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-[#273492]" />
                      </div>
                      <div>
                        <Link 
                          href={`/customers/${order.customer.id}`}
                          className="text-base font-semibold text-gray-900 hover:text-[#273492] transition-colors flex items-center gap-2"
                        >
                          {order.customer.name || "Unknown Customer"}
                          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                        </Link>
                        {order.customer.phone && (
                          <a 
                            href={`tel:${order.customer.phone}`}
                            className="text-sm text-gray-600 hover:text-[#273492] transition-colors flex items-center gap-1.5 mt-0.5"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {order.customer.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Rental Period - Clean Design */}
            <Card className="p-6 bg-white border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rental Period</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Start Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDateTime((order as any).start_datetime || order.start_date)}
                  </p>
                </div>
                <div className={`p-4 rounded-lg border ${
                  isLate ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
                }`}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">End Date</p>
                  <p className={`text-sm font-semibold ${isLate ? "text-red-600" : "text-gray-900"}`}>
                    {formatDateTime((order as any).end_datetime || order.end_date)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Duration: <span className="font-semibold text-gray-900">{days} {days === 1 ? "day" : "days"}</span>
                </span>
                {isLate && order.late_fee && order.late_fee > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white">
                    Late Fee: {formatCurrency(order.late_fee)}
                  </Badge>
                )}
              </div>
            </Card>

            {/* Order Items - Clean Table - Show for ALL orders including scheduled */}
            {order.items && order.items.length > 0 && (
              <Card className="p-6 bg-white border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="w-16">Photo</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price/Day</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        {order.status !== "scheduled" && order.status !== "cancelled" && (
                          <TableHead className="text-center">Status</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, index) => (
                        <TableRow key={item.id || index} className="border-b border-gray-100">
                          <TableCell>
                            {item.photo_url ? (
                              <img 
                                src={item.photo_url} 
                                alt={item.product_name || "Product"} 
                                className="w-12 h-12 object-cover rounded border border-gray-200 cursor-pointer hover:border-[#273492] transition-all"
                                onClick={() => setSelectedImage(item.photo_url)}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {item.product_name || "Unnamed Product"}
                              </p>
                              {item.days && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {item.days} {item.days === 1 ? "day" : "days"}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm text-gray-600">{formatCurrency(item.price_per_day)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(item.line_total || (item.price_per_day * item.quantity * (item.days || 1)))}
                            </span>
                          </TableCell>
                          {order.status !== "scheduled" && order.status !== "cancelled" && (
                            <TableCell className="text-center">
                              {item.return_status === "returned" ? (
                                <Badge className="bg-green-500 text-white text-xs">Returned</Badge>
                              ) : item.return_status === "missing" ? (
                                <Badge className="bg-red-500 text-white text-xs">Missing</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Pending</Badge>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Return Section - ONLY show for active/ongoing orders, NOT scheduled */}
            {order.status !== "cancelled" && order.status !== "scheduled" && (
              <div>
                <OrderReturnSection
                  order={order}
                  onReturnComplete={() => {
                    router.refresh();
                  }}
                />
              </div>
            )}

            {/* Scheduled Order Action Card */}
            {isScheduled && (
              <Card className="p-6 bg-blue-50 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="text-base font-semibold text-blue-900">Scheduled Rental</h3>
                    <p className="text-xs text-blue-600 mt-0.5">Ready to begin rental period</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-4">
                  Scheduled to start: <span className="font-semibold">{formatDateTime((order as any).start_datetime || order.start_date)}</span>
                </p>
                <Button
                  onClick={handleStartRental}
                  disabled={startRentalMutation.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {startRentalMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Starting Rental...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-2" />
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

          {/* Right Column - Summary & Actions (1/3 width on desktop) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary - Shopify-like */}
            <Card className="p-6 bg-white border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="space-y-3">
                {order.subtotal !== undefined && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(order.subtotal)}</span>
                  </div>
                )}
                {gstEnabled && order.gst_amount && order.gst_amount > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">GST ({gstRate}%)</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(order.gst_amount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Late Fee</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(order.late_fee || 0)}</span>
                </div>
                <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-gray-200">
                  <span className="text-base font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-[#273492]">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </Card>

            {/* Invoice Actions */}
            <Card className="p-6 bg-white border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice</h3>
              <InvoiceShare 
                order={order} 
                user={user}
                showInvoice={showInvoiceDialog}
                onShowInvoiceChange={setShowInvoiceDialog}
              />
            </Card>

            {/* Additional Info */}
            <Card className="p-6 bg-white border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Order ID</span>
                  <span className="font-mono text-gray-900 text-xs">{order.id.slice(0, 8)}...</span>
                </div>
                {order.staff && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Created by</span>
                    <span className="text-gray-900">{order.staff.full_name || order.staff.username}</span>
                  </div>
                )}
                {order.branch && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Branch</span>
                    <span className="text-gray-900">{order.branch.name}</span>
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
