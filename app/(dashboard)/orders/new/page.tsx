"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Camera } from "lucide-react";
import Link from "next/link";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useOrderDraftStore, useOrderSubtotal, useOrderGrandTotal, useOrderGst } from "@/lib/stores/useOrderDraftStore";
import { useCreateOrder } from "@/lib/queries/orders";
import { calculateDays } from "@/lib/utils/date";
import { CameraUpload } from "@/components/orders/camera-upload";
import { CustomerSearch } from "@/components/orders/customer-search";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { useToast } from "@/components/ui/toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import type { OrderItem, Customer } from "@/lib/types";

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
  const itemsSectionRef = useRef<HTMLDivElement>(null);
  const [newItemIndex, setNewItemIndex] = useState<number | null>(null);

  const days = draft.end_date && draft.start_date
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
      // Calculate line total without days: quantity × price_per_day
      updates.line_total = (updates.quantity || item.quantity) * 
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

    if (!draft.invoice_number) {
      showToast("Please enter an invoice number", "error");
      return;
    }

    if (!user?.branch_id || !user?.id) {
      showToast("User information missing", "error");
      return;
    }

    // Validate all items have required fields
    const invalidItems = draft.items.filter(
      item => !item.photo_url || item.quantity <= 0 || item.price_per_day < 0
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
        invoice_number: draft.invoice_number,
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

      <div className="px-4 md:px-6 py-4 md:py-6 space-y-6">
        {/* Customer Section */}
        <CustomerSearch
          onSelectCustomer={setSelectedCustomer}
          selectedCustomer={selectedCustomer}
        />

        {/* Branch & Staff (Readonly) */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm text-[#6b7280] font-medium">Branch</Label>
            <div className="h-10 bg-[#f1f5f9] rounded-lg px-3 flex items-center text-[#0f1724] text-sm">
              {user?.branch?.name || "N/A"}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-[#6b7280] font-medium">Staff</Label>
            <div className="h-10 bg-[#f1f5f9] rounded-lg px-3 flex items-center text-[#0f1724] text-sm">
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
            <Label className="text-lg font-bold text-[#0f1724]">Items</Label>
            <CameraUpload onUploadComplete={handleAddItem} />
          </div>

          {/* Items List */}
          <div className="space-y-4">
            {draft.items.map((item, index) => (
              <Card 
                key={index} 
                className={`p-4 rounded-lg border border-gray-200 bg-white transition-all duration-500 ${
                  newItemIndex === index 
                    ? 'ring-2 ring-[#0b63ff] bg-[#0b63ff]/5 shadow-lg' 
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
                      <Label className="text-sm text-[#6b7280] font-medium">Quantity</Label>
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
                        className="h-10 text-sm rounded-lg border-gray-200 focus:border-[#0b63ff] focus:ring-1 focus:ring-[#0b63ff]"
                        inputMode="numeric"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-[#6b7280] font-medium">Price</Label>
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
                        className="h-10 text-sm rounded-lg border-gray-200 focus:border-[#0b63ff] focus:ring-1 focus:ring-[#0b63ff]"
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
          <Card className="p-5 bg-[#0b63ff]/5 rounded-lg border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-700">
                Subtotal
              </span>
              <span className="text-lg font-semibold text-gray-900">
                ₹{subtotal.toLocaleString()}
              </span>
            </div>
            {user?.gst_enabled && gstAmount > 0 && (
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

