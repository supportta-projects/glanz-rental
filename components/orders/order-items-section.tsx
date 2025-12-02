"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CameraUpload } from "./camera-upload";
import { Trash2 } from "lucide-react";
import type { OrderItem } from "@/lib/types";

interface OrderItemsSectionProps {
  items: OrderItem[];
  onAddItem: (item: OrderItem) => void;
  onUpdateItem: (index: number, field: keyof OrderItem, value: any) => void;
  onRemoveItem: (index: number) => void;
  onImageClick?: (imageUrl: string) => void;
  days?: number;
}

/**
 * Reusable Order Items Section Component
 * Handles adding, updating, and removing order items
 * 
 * @component
 * @example
 * ```tsx
 * <OrderItemsSection
 *   items={items}
 *   onAddItem={handleAddItem}
 *   onUpdateItem={handleUpdateItem}
 *   onRemoveItem={handleRemoveItem}
 *   onImageClick={handleImageClick}
 *   days={5}
 * />
 * ```
 */
export function OrderItemsSection({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onImageClick,
  days = 0,
}: OrderItemsSectionProps) {
  const itemsSectionRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [newItemIndex, setNewItemIndex] = useState<number | null>(null);

  // Clean up refs array when items change to prevent memory leaks
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

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

    // Calculate the index where the new item will be (at the end)
    const newIndex = items.length;

    onAddItem(newItem);

    // Mark the newly added item (at the end) for highlight animation
    setNewItemIndex(newIndex);

    // Smooth scroll to the newly added item after a brief delay
    setTimeout(() => {
      // Try to scroll to the specific item card
      const newItemRef = itemRefs.current[newIndex];
      if (newItemRef) {
        newItemRef.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      } else {
        // Fallback: scroll to the camera button area (below items)
        if (itemsSectionRef.current) {
          itemsSectionRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
            inline: "nearest",
          });
        }
      }

      // Remove highlight after animation completes
      setTimeout(() => {
        setNewItemIndex(null);
      }, 2000);
    }, 100);
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, value: any) => {
    const item = items[index];
    const updates: Partial<OrderItem> = { [field]: value };

    if (field === "quantity" || field === "price_per_day") {
      // Calculate line total: quantity × price_per_day
      updates.line_total =
        (updates.quantity || item.quantity) *
        (updates.price_per_day || item.price_per_day);
    }

    onUpdateItem(index, field, updates[field] ?? value);
  };

  return (
    <div className="space-y-4" ref={itemsSectionRef}>
      <Label className="text-lg font-bold text-[#0f1724]">Items</Label>

      {/* Items List */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <Card
            key={index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className={`p-4 rounded-lg border border-gray-200 bg-white transition-all duration-500 ${
              newItemIndex === index
                ? "ring-2 ring-[#0b63ff] bg-[#0b63ff]/5 shadow-lg"
                : ""
            }`}
          >
            <div className="space-y-4">
              {/* Photo */}
              <div className="flex justify-center">
                <img
                  src={item.photo_url}
                  alt="Product"
                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                  onClick={() => onImageClick?.(item.photo_url)}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    onImageClick?.(item.photo_url);
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
                      if (value === "" || value === "-") {
                        handleUpdateItem(index, "quantity", 0);
                        return;
                      }
                      const numValue = parseInt(value, 10);
                      if (!isNaN(numValue) && numValue >= 0) {
                        handleUpdateItem(index, "quantity", numValue);
                      }
                    }}
                    onFocus={(e) => {
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
                      if (value === "" || value === "-" || value === ".") {
                        handleUpdateItem(index, "price_per_day", 0);
                        return;
                      }
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        handleUpdateItem(index, "price_per_day", numValue);
                      }
                    }}
                    onFocus={(e) => {
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
                    onClick={() => onRemoveItem(index)}
                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
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

      {/* Camera Upload - Moved below items for easier next product addition */}
      <div className="flex justify-center pt-2">
        <CameraUpload onUploadComplete={handleAddItem} />
      </div>
    </div>
  );
}

