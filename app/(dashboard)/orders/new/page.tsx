"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StandardButton } from "@/components/shared/standard-button";
import { ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
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
 * New Order Page - Clean Design (No Animations)
 * 
 * Creates a new rental order with customer selection, date/time selection,
 * items management, and order summary. Optimized for speed and performance.
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

    // ✅ FIX (Issue D3): Calculate line total WITH days: quantity × price_per_day × days
    if (field === "quantity" || field === "price_per_day" || field === "days") {
      const quantity = updates.quantity ?? item.quantity;
      const pricePerDay = updates.price_per_day ?? item.price_per_day;
      const itemDays = updates.days ?? item.days ?? days; // Use item days or order days
      
      // ✅ FIX: Include days in calculation
      updates.line_total = quantity * pricePerDay * itemDays;
    }

    updateItem(index, updates);
  }, [draft.items, updateItem, days]);

  const handleSaveOrder = useCallback(async () => {
    // Fast client-side validation (no async calls)
    if (!selectedCustomer) {
      showToast("Please select a customer", "error");
      return;
    }

    // ✅ CRITICAL FIX (Issue A1): Validate date range
    if (!draft.start_date) {
      showToast("Please select a start date", "error");
      return;
    }

    if (!draft.end_date) {
      showToast("Please select an end date", "error");
      return;
    }

    // Validate that end_date is after start_date
    const startDate = new Date(draft.start_date);
    const endDate = new Date(draft.end_date);
    
    if (endDate <= startDate) {
      showToast("End date must be after start date", "error");
      return;
    }

    // Validate minimum rental period (at least 1 hour)
    const rentalDurationMs = endDate.getTime() - startDate.getTime();
    const rentalDurationHours = rentalDurationMs / (1000 * 60 * 60);
    if (rentalDurationHours < 1) {
      showToast("Rental period must be at least 1 hour", "error");
      return;
    }

    if (draft.items.length === 0) {
      showToast("Please add at least one product", "error");
      return;
    }

    // Auto-generate invoice number if not provided
    // ✅ FIX: Invoice number generation is now async to check for duplicates
    const finalInvoiceNumber = draft.invoice_number || await generateInvoiceNumber();

    // ✅ FIX: Validate user information
    if (!user?.id) {
      showToast("User information not found", "error");
      return;
    }

    // ✅ FIX: For super_admin, require branch selection before creating order
    // Super admin's branch_id is null by default, but they need to select a branch to create orders
    if (user?.role === "super_admin" && !user?.branch_id) {
      showToast("Please select a branch before creating an order", "error");
      router.push("/orders"); // Redirect to orders page where they can select branch
      return;
    }

    // For other roles, require branch_id
    if (user?.role !== "super_admin" && !user?.branch_id) {
      showToast("Branch information not found", "error");
      return;
    }

    // ✅ FIX (Issue D1, D2, D6): Comprehensive item validation
    const invalidItems: Array<{ index: number; reason: string }> = [];
    
    draft.items.forEach((item, index) => {
      // D1: Validate quantity > 0
      if (!item.quantity || item.quantity <= 0) {
        invalidItems.push({ index: index + 1, reason: `Item ${index + 1}: Quantity must be greater than 0` });
      }
      
      // D5: Validate maximum quantity (prevent unrealistic values)
      if (item.quantity > 1000) {
        invalidItems.push({ index: index + 1, reason: `Item ${index + 1}: Quantity cannot exceed 1000` });
      }
      
      // D2: Validate price_per_day > 0
      if (!item.price_per_day || item.price_per_day <= 0) {
        invalidItems.push({ index: index + 1, reason: `Item ${index + 1}: Price per day must be greater than 0` });
      }
      
      // D6: Validate product name is not empty
      if (!item.product_name || item.product_name.trim().length === 0) {
        invalidItems.push({ index: index + 1, reason: `Item ${index + 1}: Product name is required` });
      }
      
      // D3: Validate line_total matches calculation (quantity × price_per_day × days)
      const expectedLineTotal = (item.quantity || 0) * (item.price_per_day || 0) * (item.days || days);
      const tolerance = 0.01; // Allow small floating point differences
      if (Math.abs((item.line_total || 0) - expectedLineTotal) > tolerance) {
        invalidItems.push({ index: index + 1, reason: `Item ${index + 1}: Line total calculation mismatch. Please update the item.` });
      }
    });

    if (invalidItems.length > 0) {
      const errorMessage = invalidItems.length === 1 
        ? invalidItems[0].reason
        : `Multiple items have issues:\n${invalidItems.map(i => `• ${i.reason}`).join('\n')}`;
      showToast(errorMessage, "error");
      return;
    }

    // Validate that at least one item exists
    if (draft.items.length === 0) {
      showToast("Please add at least one product", "error");
      return;
    }

    // ✅ FIX (Issue D4): Improved image validation with specific item identification
    const itemsWithBlobUrls: number[] = [];
    const itemsWithoutValidPhotos: number[] = [];
    
    draft.items.forEach((item, index) => {
      if (item.photo_url?.startsWith("blob:")) {
        itemsWithBlobUrls.push(index + 1);
      }
      if (!item.photo_url || item.photo_url.trim() === "") {
        itemsWithoutValidPhotos.push(index + 1);
      }
    });

    if (itemsWithBlobUrls.length > 0) {
      const itemList = itemsWithBlobUrls.length === 1 
        ? `item ${itemsWithBlobUrls[0]}`
        : `items ${itemsWithBlobUrls.join(', ')}`;
      showToast(
        `Please wait for ${itemList} to finish uploading before saving the order.`,
        "error"
      );
      return;
    }

    if (itemsWithoutValidPhotos.length > 0) {
      const itemList = itemsWithoutValidPhotos.length === 1 
        ? `Item ${itemsWithoutValidPhotos[0]}`
        : `Items ${itemsWithoutValidPhotos.join(', ')}`;
      showToast(`${itemList} ${itemsWithoutValidPhotos.length === 1 ? 'is' : 'are'} missing images. Please upload images for all items.`, "error");
      return;
    }

    try {
      showToast("Creating order...", "info");

      // ✅ FIX: Ensure branch_id is not null (should be validated above, but TypeScript needs this)
      if (!user.branch_id) {
        showToast("Branch information is required to create an order", "error");
        return;
      }

      const gstEnabled = user?.gst_enabled ?? false;

      // ✅ FIX Bug 3: Validate total_amount matches calculation by recalculating from items
      // Recalculate the total from scratch to verify it matches the store's calculated value
      const subtotalFromItems = draft.items.reduce((sum, item) => sum + (item.line_total || 0), 0);
      let calculatedTotal: number;
      
      if (!gstEnabled) {
        calculatedTotal = Math.round(subtotalFromItems * 100) / 100;
      } else {
        const gstRatePercent = user?.gst_rate ?? 5.00;
        const gstRate = gstRatePercent / 100;
        const gstIncluded = user?.gst_included ?? false;
        const result = gstIncluded ? subtotalFromItems : subtotalFromItems + (subtotalFromItems * gstRate);
        calculatedTotal = Math.round(result * 100) / 100;
      }
      
      const tolerance = 0.01; // Allow small floating point differences
      if (Math.abs(calculatedTotal - grandTotal) > tolerance) {
        showToast("Order total calculation mismatch. Please refresh and try again.", "error");
        return;
      }

      // ✅ FIX (Issue E3): Validate maximum order amount
      const MAX_ORDER_AMOUNT = 10000000; // ₹10,000,000
      if (grandTotal > MAX_ORDER_AMOUNT) {
        showToast(`Order total (₹${grandTotal.toLocaleString()}) exceeds maximum allowed amount (₹${MAX_ORDER_AMOUNT.toLocaleString()}). Please reduce items or quantities.`, "error");
        return;
      }

      await createOrderMutation.mutateAsync({
        branch_id: user.branch_id, // Now TypeScript knows this is not null
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
      
      // ✅ FIX: Extract proper error message from Supabase errors
      let errorMessage = "Failed to create order";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check for specific error codes
      if (error?.code === '23505' || errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint') || errorMessage.includes('invoice_number')) {
        errorMessage = "Invoice number already exists. Please try again or enter a different invoice number.";
      }
      
      showToast(errorMessage, "error");
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
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link 
                href="/orders" 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                New Order
              </h1>
            </div>
            <p className="text-sm md:text-base text-gray-500 font-medium ml-12">
              Create a new rental order for your customer
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Customer Section */}
          <Card className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <OrderFormSection
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              branchName={user?.branch?.name}
              staffName={user?.full_name}
            />
          </Card>

          {/* Rental Dates & Times */}
          <Card className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <OrderDateTimeSection
              startDate={draft.start_date}
              endDate={draft.end_date}
              onStartDateChange={(value) => value && setStartDate(value)}
              onEndDateChange={(value) => value && setEndDate(value)}
            />
          </Card>

          {/* Items Section */}
          <Card className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
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

          {/* Order Summary with GST */}
          {grandTotal > 0 && (
            <Card className="p-6 rounded-xl border-2 border-[#273492]/20 bg-[#273492]/5 shadow-sm">
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

          {/* Invoice Number */}
          <Card className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <OrderInvoiceSection
              invoiceNumber={draft.invoice_number}
              onInvoiceNumberChange={setInvoiceNumber}
              autoGenerate={true}
            />
          </Card>

          {/* Save Button */}
          <div className="sticky bottom-6 z-10">
            <StandardButton
              onClick={handleSaveOrder}
              variant="default"
              disabled={!canSave || createOrderMutation.isPending || hasPendingUploads}
              loading={createOrderMutation.isPending}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createOrderMutation.isPending ? (
                <>
                  <ShoppingBag className="h-5 w-5 mr-2" />
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
