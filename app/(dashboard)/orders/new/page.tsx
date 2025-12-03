"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { StandardButton } from "@/components/shared/standard-button";
import { Sparkles, ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import Link from "next/link";
import { useUserStore } from "@/lib/stores/useUserStore";
import {
  useOrderDraftStore,
  useOrderSubtotal,
  useOrderGrandTotal,
  useOrderGst,
} from "@/lib/stores/useOrderDraftStore";
import { useCreateOrder } from "@/lib/queries/orders";
import { calculateDays } from "@/lib/utils/date";
import { useToast } from "@/components/ui/toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { generateInvoiceNumber } from "@/lib/utils/invoice";
import type { OrderItem, Customer } from "@/lib/types";
import { Card } from "@/components/ui/card";

// Reusable Components
import { OrderFormSection } from "@/components/orders/order-form-section";
import { OrderDateTimeSection } from "@/components/orders/order-datetime-section";
import { OrderItemsSection } from "@/components/orders/order-items-section";
import { OrderSummarySection } from "@/components/orders/order-summary-section";
import { OrderInvoiceSection } from "@/components/orders/order-invoice-section";

/**
 * New Order Page - Premium Modern Design
 * 
 * Creates a new rental order with customer selection, date/time selection,
 * items management, and order summary. Optimized for speed and performance.
 * 
 * @component
 */
export default function CreateOrderPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { showToast } = useToast();
  const createOrderMutation = useCreateOrder();

  const {
    draft,
    setStartDate,
    setEndDate,
    setInvoiceNumber,
    addItem,
    updateItem,
    removeItem,
    clearDraft,
  } = useOrderDraftStore();

  // Use optimized selectors
  const subtotal = useOrderSubtotal();
  const gstAmount = useOrderGst();
  const grandTotal = useOrderGrandTotal();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hasPendingUploads, setHasPendingUploads] = useState(false);

  // Memoize days calculation
  const days = useMemo(
    () =>
      draft.end_date && draft.start_date
        ? calculateDays(draft.start_date, draft.end_date)
        : 0,
    [draft.end_date, draft.start_date]
  );

  const gstIncluded = user?.gst_included ?? false;

  // Set default start datetime to now and end datetime to next day (1 day rental default)
  useEffect(() => {
    if (!draft.start_date) {
      const now = new Date();
      setStartDate(now.toISOString());
    }

    // Set end date to next day if not set (1 day rental default)
    if (!draft.end_date && draft.start_date) {
      const startDate = new Date(draft.start_date);
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      // Set time to same time as start date
      nextDay.setHours(startDate.getHours());
      nextDay.setMinutes(startDate.getMinutes());
      setEndDate(nextDay.toISOString());
    }
  }, [draft.start_date, draft.end_date, setStartDate, setEndDate]);

  // Memoize handlers for performance
  const handleAddItem = useCallback((item: OrderItem) => {
    addItem(item);
  }, [addItem]);

  const handleUpdateItem = useCallback((index: number, field: keyof OrderItem, value: any) => {
    const item = draft.items[index];
    const updates: Partial<OrderItem> = { [field]: value };

    if (field === "quantity" || field === "price_per_day") {
      // Calculate line total without days: quantity × price_per_day
      updates.line_total =
        (updates.quantity || item.quantity) *
        (updates.price_per_day || item.price_per_day);
    }

    updateItem(index, updates);
  }, [draft.items, updateItem]);

  const handleSaveOrder = useCallback(async () => {
    // Fast client-side validation (no async calls)
    if (!selectedCustomer) {
      showToast("Please select a customer", "error");
      return;
    }

    if (!draft.end_date) {
      showToast("Please select an end date", "error");
      return;
    }

    if (draft.items.length === 0) {
      showToast("Please add at least one product", "error");
      return;
    }

    // Auto-generate invoice number if not provided
    const finalInvoiceNumber = draft.invoice_number || generateInvoiceNumber();

    if (!user?.branch_id || !user?.id) {
      showToast("User information missing", "error");
      return;
    }

    // Validate all items have required fields
    const invalidItems = draft.items.filter(
      (item) => 
        !item.quantity || 
        item.quantity <= 0 || 
        !item.price_per_day || 
        item.price_per_day <= 0
    );

    if (invalidItems.length > 0) {
      showToast("Please ensure all items have valid quantity (at least 1) and price per day (greater than 0)", "error");
      return;
    }

    // Validate that at least one item has valid data
    const validItems = draft.items.filter(
      (item) => 
        item.quantity > 0 && 
        item.price_per_day > 0
    );

    if (validItems.length === 0) {
      showToast("Please add at least one product with valid quantity and price", "error");
      return;
    }

    // CRITICAL: Check for blob URLs (temporary preview URLs that shouldn't be saved)
    const itemsWithBlobUrls = draft.items.filter(
      (item) => item.photo_url?.startsWith("blob:")
    );

    if (itemsWithBlobUrls.length > 0) {
      showToast(
        `Please wait for ${itemsWithBlobUrls.length} image${itemsWithBlobUrls.length > 1 ? 's' : ''} to finish uploading before saving the order.`,
        "error"
      );
      return;
    }

    // Validate that all items have valid photo URLs (not empty, not blob)
    const itemsWithoutValidPhotos = draft.items.filter(
      (item) => !item.photo_url || item.photo_url.trim() === ""
    );

    if (itemsWithoutValidPhotos.length > 0) {
      showToast("Please ensure all items have valid images uploaded", "error");
      return;
    }

    try {
      showToast("Creating order...", "info");

      const gstEnabled = user?.gst_enabled ?? false;

      await createOrderMutation.mutateAsync({
        branch_id: user.branch_id,
        staff_id: user.id,
        customer_id: selectedCustomer.id,
        invoice_number: finalInvoiceNumber,
        start_date: draft.start_date,
        end_date: draft.end_date,
        total_amount: grandTotal,
        subtotal: subtotal,
        gst_amount: gstEnabled && gstAmount > 0 ? gstAmount : 0,
        items: draft.items,
      });

      showToast("Order created successfully!", "success");
      clearDraft();

      router.push("/orders");
    } catch (error: any) {
      console.error("Order creation error:", error);
      showToast(error.message || "Failed to create order", "error");
    }
  }, [selectedCustomer, draft, user, grandTotal, subtotal, gstAmount, showToast, createOrderMutation, clearDraft, router]);

  // Memoize validation state - check for blob URLs
  const canSave = useMemo(() => {
    if (!selectedCustomer || draft.items.length === 0 || !draft.end_date) {
      return false;
    }
    
    // Check if any items have blob URLs (uploading)
    const hasBlobUrls = draft.items.some((item) => 
      item.photo_url?.startsWith("blob:")
    );
    
    // Check if any items have empty photo URLs
    const hasEmptyPhotos = draft.items.some((item) => 
      !item.photo_url || item.photo_url.trim() === ""
    );
    
    // Cannot save if there are pending uploads or empty photos
    return !hasBlobUrls && !hasEmptyPhotos && !hasPendingUploads;
  }, [selectedCustomer, draft.items, draft.end_date, hasPendingUploads]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb] pb-32">
      {/* Premium Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(39,52,146,0.05),transparent_50%)]" />
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto relative">
        {/* Premium Modern Header - Shopify/Flipkart Style */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200/60 animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link 
                href="/orders" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors premium-hover"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-[#273492] to-gray-900 bg-clip-text text-transparent">
                New Order
              </h1>
              <Sparkles className="h-6 w-6 text-[#273492] animate-pulse" />
            </div>
            <p className="text-sm md:text-base text-gray-500 font-medium ml-12">
              Create a new rental order for your customer
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Customer Section - Premium Card */}
          <Card 
            className="p-6 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp"
            style={{ animationDelay: "0.1s", willChange: "transform" }}
          >
            <OrderFormSection
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              branchName={user?.branch?.name}
              staffName={user?.full_name}
            />
          </Card>

          {/* Rental Dates & Times - Premium Card */}
          <Card 
            className="p-6 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp"
            style={{ animationDelay: "0.2s", willChange: "transform" }}
          >
            <OrderDateTimeSection
              startDate={draft.start_date}
              endDate={draft.end_date}
              onStartDateChange={(value) => value && setStartDate(value)}
              onEndDateChange={(value) => value && setEndDate(value)}
            />
          </Card>

          {/* Items Section - Premium Card */}
          <Card 
            className="p-6 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp"
            style={{ animationDelay: "0.3s", willChange: "transform" }}
          >
            <OrderItemsSection
              items={draft.items}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={removeItem}
              onImageClick={setSelectedImage}
              days={days}
              onUploadStatusChange={setHasPendingUploads}
            />
          </Card>

          {/* Order Summary with GST - Premium Card */}
          {grandTotal > 0 && (
            <Card 
              className="p-6 rounded-xl border-2 border-[#273492]/20 bg-gradient-to-br from-[#273492]/5 to-[#273492]/10 shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp pulse-glow"
              style={{ animationDelay: "0.4s", willChange: "transform" }}
            >
              <OrderSummarySection
                subtotal={subtotal}
                gstAmount={gstAmount}
                grandTotal={grandTotal}
                gstEnabled={user?.gst_enabled}
                gstRate={user?.gst_rate}
                gstIncluded={gstIncluded}
              />
            </Card>
          )}

          {/* Invoice Number - Premium Card */}
          <Card 
            className="p-6 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp"
            style={{ animationDelay: "0.5s", willChange: "transform" }}
          >
            <OrderInvoiceSection
              invoiceNumber={draft.invoice_number}
              onInvoiceNumberChange={setInvoiceNumber}
              autoGenerate={true}
            />
          </Card>

          {/* Save Button - Premium Style */}
          <div className="sticky bottom-6 z-10 fadeInUp" style={{ animationDelay: "0.6s" }}>
            <StandardButton
              onClick={handleSaveOrder}
              variant="default"
              disabled={!canSave || createOrderMutation.isPending || hasPendingUploads}
              loading={createOrderMutation.isPending}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] shadow-xl hover:shadow-2xl transition-all duration-300 premium-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createOrderMutation.isPending ? (
                <>
                  <ShoppingBag className="h-5 w-5 mr-2 animate-pulse" />
                  Creating Order...
                </>
              ) : hasPendingUploads ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Waiting for uploads...
                </>
              ) : (
                <>
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Create Order
                </>
              )}
            </StandardButton>
          </div>
        </div>
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
