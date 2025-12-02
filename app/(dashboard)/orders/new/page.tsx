"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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

// Reusable Components
import { OrderFormSection } from "@/components/orders/order-form-section";
import { OrderDateTimeSection } from "@/components/orders/order-datetime-section";
import { OrderItemsSection } from "@/components/orders/order-items-section";
import { OrderSummarySection } from "@/components/orders/order-summary-section";
import { OrderInvoiceSection } from "@/components/orders/order-invoice-section";

/**
 * New Order Page
 * 
 * Creates a new rental order with customer selection, date/time selection,
 * items management, and order summary. Uses 100% reusable components.
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

  const days =
    draft.end_date && draft.start_date
      ? calculateDays(draft.start_date, draft.end_date)
      : 0;

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

  const handleAddItem = (item: OrderItem) => {
    addItem(item);
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, value: any) => {
    const item = draft.items[index];
    const updates: Partial<OrderItem> = { [field]: value };

    if (field === "quantity" || field === "price_per_day") {
      // Calculate line total without days: quantity × price_per_day
      updates.line_total =
        (updates.quantity || item.quantity) *
        (updates.price_per_day || item.price_per_day);
    }

    updateItem(index, updates);
  };

  const handleSaveOrder = async () => {
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
      showToast("Please add at least one item", "error");
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
      (item) => !item.photo_url || item.quantity <= 0 || item.price_per_day < 0
    );
    if (invalidItems.length > 0) {
      showToast("Please check all items have valid photo, quantity, and price", "error");
      return;
    }

    try {
      // Optimistic UI update - show success immediately
      showToast("Creating order...", "info");

      // Only include GST if enabled
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

      // Navigate immediately for faster perceived performance
      router.push("/orders");
    } catch (error: any) {
      console.error("Order creation error:", error);
      showToast(error.message || "Failed to create order", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/orders">
          <ArrowLeft className="h-5 w-5 text-[#6b7280] hover:text-[#0f1724] transition-colors" />
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0f1724]">New Order</h1>
      </div>

      <div className="px-4 md:px-6 py-4 md:py-6 space-y-6 max-w-4xl mx-auto">
        {/* Customer Section */}
        <OrderFormSection
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          branchName={user?.branch?.name}
          staffName={user?.full_name}
        />

        {/* Rental Dates & Times */}
        <OrderDateTimeSection
          startDate={draft.start_date}
          endDate={draft.end_date}
          onStartDateChange={(value) => value && setStartDate(value)}
          onEndDateChange={(value) => value && setEndDate(value)}
        />

        {/* Items Section */}
        <OrderItemsSection
          items={draft.items}
          onAddItem={handleAddItem}
          onUpdateItem={handleUpdateItem}
          onRemoveItem={removeItem}
          onImageClick={setSelectedImage}
          days={days}
        />

        {/* Order Summary with GST */}
        <OrderSummarySection
          subtotal={subtotal}
          gstAmount={gstAmount}
          grandTotal={grandTotal}
          gstEnabled={user?.gst_enabled}
          gstRate={user?.gst_rate}
          gstIncluded={gstIncluded}
        />

        {/* Invoice Number - Optional with auto-generation */}
        <OrderInvoiceSection
          invoiceNumber={draft.invoice_number}
          onInvoiceNumberChange={setInvoiceNumber}
          autoGenerate={true}
        />

        {/* Save Button */}
        <Button
          onClick={handleSaveOrder}
          disabled={createOrderMutation.isPending}
          className="w-full h-10 bg-[#0b63ff] hover:bg-[#0a5ce6] text-white text-sm font-medium rounded-lg mt-6"
        >
          {createOrderMutation.isPending ? "Saving..." : "Save Order"}
        </Button>
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
