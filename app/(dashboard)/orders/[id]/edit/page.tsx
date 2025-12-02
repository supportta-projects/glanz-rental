"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trash2, Camera, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useOrderDraftStore, useOrderSubtotal, useOrderGrandTotal, useOrderGst } from "@/lib/stores/useOrderDraftStore";
import { useOrder, useUpdateOrder, useUpdateOrderBilling } from "@/lib/queries/orders";
import { calculateDays } from "@/lib/utils/date";
import { CameraUpload } from "@/components/orders/camera-upload";
import { CustomerSearch } from "@/components/orders/customer-search";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { useToast } from "@/components/ui/toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import type { OrderItem, Customer, Order } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInMinutes } from "date-fns";
import { OrderInvoiceSection } from "@/components/orders/order-invoice-section";
import { OrderSummarySection } from "@/components/orders/order-summary-section";

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUserStore();
  const { showToast } = useToast();
  const orderId = params.id as string;
  const updateOrderMutation = useUpdateOrder();
  const updateBillingMutation = useUpdateOrderBilling();
  
  const { data: order, isLoading: orderLoading } = useOrder(orderId);
  
  const {
    draft,
    setStartDate,
    setEndDate,
    setInvoiceNumber,
    addItem,
    updateItem,
    removeItem,
    loadOrder,
    clearDraft,
  } = useOrderDraftStore();
  
  // Use optimized selectors
  const subtotal = useOrderSubtotal();
  const gstAmount = useOrderGst();
  const grandTotal = useOrderGrandTotal();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const itemsSectionRef = useRef<HTMLDivElement>(null);
  const [newItemIndex, setNewItemIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<"full" | "invoice-only">("full");

  // Load order data into draft when order loads
  useEffect(() => {
    if (order) {
      loadOrder(order);
      if (order.customer) {
        setSelectedCustomer(order.customer);
      }
    }
    return () => clearDraft();
  }, [order, loadOrder, clearDraft]);

  const days = draft.end_date && draft.start_date
    ? calculateDays(draft.start_date, draft.end_date)
    : 0;

  // Values already computed via selectors above
  const gstIncluded = user?.gst_included ?? false;
  const gstEnabled = user?.gst_enabled ?? false;

  // Helper function to check if order can be fully edited (dates, items, customer)
  const canEditOrder = (order: Order): boolean => {
    const status = order.status;
    
    // Completed or cancelled orders cannot be fully edited
    if (status === "completed" || status === "cancelled") {
      return false;
    }
    
    // Scheduled orders can be fully edited anytime (until they become active)
    if (status === "scheduled") {
      return true;
    }
    
    // Active/ongoing orders can only be fully edited within 10 minutes of becoming active
    if (status === "active") {
      // Use start_datetime as the timestamp when rental became active
      const activeSince = (order as any).start_datetime || order.start_date;
      if (!activeSince) {
        // If no start_datetime, use created_at as fallback
        const createdAt = new Date(order.created_at);
        const now = new Date();
        const minutesSinceCreation = differenceInMinutes(now, createdAt);
        return minutesSinceCreation <= 10;
      }
      
      // Calculate minutes since order became active
      const activeSinceDate = new Date(activeSince);
      const now = new Date();
      const minutesSinceActive = differenceInMinutes(now, activeSinceDate);
      
      // Can edit if less than or equal to 10 minutes since becoming active
      return minutesSinceActive <= 10;
    }
    
    // Other statuses (pending_return, partially_returned) cannot be fully edited
    return false;
  };

  // Check if order can be fully edited
  const canEditFull = useMemo(() => {
    if (!order) return false;
    return canEditOrder(order);
  }, [order]);

  // Set edit mode based on order status
  useEffect(() => {
    if (order) {
      if (canEditFull) {
        setEditMode("full");
      } else {
        setEditMode("invoice-only");
      }
    }
  }, [order, canEditFull]);

  const handleAddItem = (photoUrl: string) => {
    if (!photoUrl) return;

    const newItem: OrderItem = {
      photo_url: photoUrl,
      product_name: "",
      quantity: 1,
      price_per_day: 0,
      days,
      line_total: 0,
    };

    // Add item (will be prepended to the beginning of the array)
    addItem(newItem);
    
    // Mark the first item (index 0) as newly added for highlight animation
    setNewItemIndex(0);
    
    // Smooth scroll to the newly added item after a brief delay
    // This allows React to render the new item first
    setTimeout(() => {
      if (itemsSectionRef.current) {
        // Scroll to the items section, with offset for better visibility
        itemsSectionRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
      
      // Remove highlight after animation completes
      setTimeout(() => {
        setNewItemIndex(null);
      }, 2000);
    }, 100);
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, value: any) => {
    const item = draft.items[index];
    const updates: Partial<OrderItem> = { [field]: value };

    if (field === "quantity" || field === "price_per_day") {
      updates.line_total = (updates.quantity || item.quantity) * 
                          (updates.price_per_day || item.price_per_day);
    }

    updateItem(index, updates);
  };

  const handleUpdateBilling = async () => {
    if (!draft.invoice_number) {
      showToast("Please enter an invoice number", "error");
      return;
    }

    try {
      await updateBillingMutation.mutateAsync({
        orderId: orderId,
        invoice_number: draft.invoice_number,
        subtotal: subtotal,
        gst_amount: gstEnabled && gstAmount > 0 ? gstAmount : 0,
        total_amount: grandTotal,
      });

      showToast("Invoice details updated successfully!", "success");
      router.push(`/orders/${orderId}`);
    } catch (error: any) {
      showToast(error.message || "Failed to update invoice details", "error");
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedCustomer) {
      showToast("Please select a customer", "error");
      return;
    }

    if (!draft.end_date) {
      showToast("Please select an end date", "error");
      return;
    }

    if (draft.items.length === 0) {
      showToast("Please add at least one item", "error");
      return;
    }

    if (!draft.invoice_number) {
      showToast("Please enter an invoice number", "error");
      return;
    }

    // Check if order can still be edited (in case user kept page open)
    if (order && !canEditOrder(order)) {
      showToast("This order can no longer be edited. It has been active for more than 10 minutes.", "error");
      router.push(`/orders/${orderId}`);
      return;
    }

    // Validate dates are not in the past
    const now = new Date();
    const startDate = new Date(draft.start_date);
    const endDate = new Date(draft.end_date);

    if (startDate < now) {
      showToast("Start date cannot be in the past", "error");
      return;
    }

    if (endDate < now) {
      showToast("End date cannot be in the past", "error");
      return;
    }

    if (endDate <= startDate) {
      showToast("End date must be after start date", "error");
      return;
    }

    try {
      // Only include GST if enabled
      
      await updateOrderMutation.mutateAsync({
        orderId: orderId,
        invoice_number: draft.invoice_number,
        start_date: draft.start_date,
        end_date: draft.end_date,
        total_amount: grandTotal,
        subtotal: subtotal,
        gst_amount: gstEnabled && gstAmount > 0 ? gstAmount : 0,
        items: draft.items,
      });

      showToast("Order updated successfully!", "success");
      clearDraft();
      router.push(`/orders/${orderId}`);
    } catch (error: any) {
      showToast(error.message || "Failed to update order", "error");
    }
  };

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 pb-32">
        <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-[9px] w-32 rounded" />
          </div>
        </div>
        <div className="p-4 space-y-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-50 pb-32">
        <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Link href={`/orders/${orderId}`} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
              <ArrowLeft className="h-4 w-4 text-gray-500" />
            </Link>
            <h1 className="text-[9px] font-normal text-gray-500 font-mono">N/A</h1>
          </div>
        </div>
        <div className="p-4">
          <Card className="p-8 text-center">
            <p className="text-gray-500">Order not found</p>
            <Link href="/orders">
              <Button className="mt-4">Back to Orders</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-32">
      {/* Minimal Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Link href={`/orders/${orderId}`} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </Link>
          <h1 className="text-[9px] font-normal text-gray-500 font-mono">
            {order?.invoice_number || "N/A"}
          </h1>
        </div>
      </div>

      {editMode === "invoice-only" ? (
        // Show only invoice/billing fields
        <div className="p-4 space-y-6">
          <Card className="p-5 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                This order cannot be fully edited, but you can update invoice number and billing details.
              </p>
            </div>
          </Card>

          {/* Invoice Number */}
          <OrderInvoiceSection
            invoiceNumber={draft.invoice_number}
            onInvoiceNumberChange={setInvoiceNumber}
          />

          {/* Order Summary - Allow manual editing */}
          <OrderSummarySection
            subtotal={subtotal}
            gstAmount={gstAmount}
            grandTotal={grandTotal}
            gstEnabled={gstEnabled}
            gstRate={user?.gst_rate || 5.00}
            gstIncluded={gstIncluded}
          />

          {/* Save Button */}
          <Button
            onClick={handleUpdateBilling}
            disabled={updateBillingMutation.isPending}
            className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white text-base font-semibold rounded-xl"
          >
            {updateBillingMutation.isPending ? "Updating..." : "Update Invoice Details"}
          </Button>
        </div>
      ) : (
        // Show full edit form
        <div className="p-4 space-y-6">
        {/* Customer Section */}
        <CustomerSearch
          onSelectCustomer={setSelectedCustomer}
          selectedCustomer={selectedCustomer}
        />

        {/* Branch & Staff (Readonly) */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Branch</Label>
            <div className="h-14 bg-gray-50 rounded-xl px-4 flex items-center text-gray-700">
              {user?.branch?.name || "N/A"}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Staff</Label>
            <div className="h-14 bg-gray-50 rounded-xl px-4 flex items-center text-gray-700">
              {user?.full_name || "N/A"}
            </div>
          </div>
        </div>

        {/* Rental Dates & Times */}
        <div className="space-y-4">
          <DateTimePicker
            label="Rental Start Date & Time"
            value={draft.start_date}
            onChange={(value) => {
              const selectedDateTime = value ? new Date(value) : null;
              const now = new Date();
              
              if (selectedDateTime && selectedDateTime < now) {
                showToast("Cannot select past date or time", "error");
                return;
              }
              
              setStartDate(value);
            }}
            min={new Date().toISOString()}
            required
            className="w-full"
          />
          <DateTimePicker
            label="Rental End Date & Time"
            value={draft.end_date}
            onChange={(value) => {
              const selectedDateTime = value ? new Date(value) : null;
              const startDateTime = draft.start_date ? new Date(draft.start_date) : new Date();
              const now = new Date();
              
              if (selectedDateTime && selectedDateTime < now) {
                showToast("Cannot select past date or time", "error");
                return;
              }
              
              if (selectedDateTime && selectedDateTime <= startDateTime) {
                showToast("End date must be after start date", "error");
                return;
              }
              
              setEndDate(value);
            }}
            min={draft.start_date || new Date().toISOString()}
            required
            className="w-full"
          />
        </div>

        {/* Items Section */}
        <div className="space-y-4" ref={itemsSectionRef}>
          <div className="flex items-center justify-between">
            <Label className="text-lg font-bold">Items</Label>
            <CameraUpload onUploadComplete={handleAddItem} />
          </div>

          {/* Items List */}
          <div className="space-y-4">
            {draft.items.map((item, index) => (
              <Card 
                key={index} 
                className={`p-4 rounded-xl transition-all duration-500 ${
                  newItemIndex === index 
                    ? 'ring-2 ring-sky-500 bg-sky-50/50 shadow-lg' 
                    : ''
                }`}
              >
                <div className="space-y-4">
                  {/* Photo */}
                  <div className="flex justify-center">
                    <img
                      src={item.photo_url}
                      alt="Product"
                      className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                      onClick={() => setSelectedImage(item.photo_url)}
                      onTouchEnd={(e) => {
                        // Handle touch to open on mobile
                        e.stopPropagation();
                        setSelectedImage(item.photo_url);
                      }}
                    />
                  </div>

                  {/* Product Name */}
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">Product Name</Label>
                    <Input
                      value={item.product_name || ""}
                      onChange={(e) =>
                        handleUpdateItem(index, "product_name", e.target.value)
                      }
                      placeholder="Optional"
                      className="h-12 text-base rounded-xl"
                    />
                  </div>

                  {/* Quantity & Price Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          // Allow empty string for better UX - user can clear and type fresh
                          if (value === "" || value === "-") {
                            handleUpdateItem(index, "quantity", 0);
                            return;
                          }
                          // Parse and validate
                          const numValue = parseInt(value, 10);
                          if (!isNaN(numValue) && numValue >= 0) {
                            handleUpdateItem(index, "quantity", numValue);
                          }
                        }}
                        onFocus={(e) => {
                          // Select all text when focused, especially if value is 0
                          // This allows user to immediately type and replace the value
                          e.target.select();
                        }}
                        className="h-12 text-base rounded-xl"
                        inputMode="numeric"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Price</Label>
                      <Input
                        type="number"
                        value={item.price_per_day === 0 ? "" : item.price_per_day}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          // Allow empty string for better UX - user can clear and type fresh
                          if (value === "" || value === "-" || value === ".") {
                            handleUpdateItem(index, "price_per_day", 0);
                            return;
                          }
                          // Parse and validate
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            handleUpdateItem(index, "price_per_day", numValue);
                          }
                        }}
                        onFocus={(e) => {
                          // Select all text when focused, especially if value is 0
                          // This allows user to immediately type and replace the value
                          e.target.select();
                        }}
                        className="h-12 text-base rounded-xl"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-gray-600">
                      {item.quantity} × ₹{item.price_per_day}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-green-600">
                        ₹{item.line_total.toLocaleString()}
                      </span>
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Order Summary with GST */}
        {grandTotal > 0 && (
          <Card className="p-5 bg-sky-50 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-700">
                Subtotal
              </span>
              <span className="text-lg font-semibold text-gray-900">
                ₹{subtotal.toLocaleString()}
              </span>
            </div>
            {gstEnabled && gstAmount > 0 && (
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-base font-medium text-gray-700">
                  GST ({user?.gst_rate?.toFixed(2) || "5.00"}%) {gstIncluded ? "(Included)" : ""}
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  ₹{gstAmount.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xl font-semibold text-gray-700">
                Grand Total
              </span>
              <span className="text-3xl font-bold text-sky-600">
                ₹{grandTotal.toLocaleString()}
              </span>
            </div>
          </Card>
        )}

        {/* Invoice Number */}
        <div className="space-y-2">
          <Label className="text-lg font-bold">Invoice Number *</Label>
          <Input
            value={draft.invoice_number}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="GLZ-2025-0123"
            className="h-14 text-base rounded-xl"
            required
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleUpdateOrder}
          disabled={updateOrderMutation.isPending}
          className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white text-base font-semibold rounded-xl mt-6"
        >
          {updateOrderMutation.isPending ? "Updating..." : "Update Order"}
        </Button>
        </div>
      )}

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

