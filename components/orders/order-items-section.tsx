"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CameraUpload, type UploadResult } from "./camera-upload";
import { Trash2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrderItem } from "@/lib/types";

interface OrderItemsSectionProps {
  items: OrderItem[];
  onAddItem: (item: OrderItem) => void;
  onUpdateItem: (index: number, field: keyof OrderItem, value: any) => void;
  onRemoveItem: (index: number) => void;
  onImageClick?: (imageUrl: string) => void;
  days?: number;
  onUploadStatusChange?: (hasPendingUploads: boolean) => void;
}

interface ItemUploadStatus {
  index: number;
  previewUrl: string;
  finalUrl?: string;
  status: "uploading" | "completed" | "failed" | "idle";
}

/**
 * Optimized Order Items Section Component
 * Handles adding, updating, and removing order items
 * Tracks upload status to prevent saving orders with blob URLs
 * Prevents duplicate items by tracking uploads by preview URL
 */
export function OrderItemsSection({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onImageClick,
  days = 0,
  onUploadStatusChange,
}: OrderItemsSectionProps) {
  const itemsSectionRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [newItemIndex, setNewItemIndex] = useState<number | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<Map<number, ItemUploadStatus>>(new Map());
  // Track which preview URLs have already created items to prevent duplicates
  const processedPreviewUrls = useRef<Set<string>>(new Set());
  // Track currently processing uploads to prevent race conditions
  const processingUploads = useRef<Set<string>>(new Set());
  
  // Track upload status changes
  useEffect(() => {
    const hasPendingUploads = Array.from(uploadStatuses.values()).some(
      (status) => status.status === "uploading"
    );
    onUploadStatusChange?.(hasPendingUploads);
  }, [uploadStatuses, onUploadStatusChange]);

  // Clean up refs array when items change
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      uploadStatuses.forEach((status) => {
        if (status.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(status.previewUrl);
        }
      });
    };
  }, []);

  const handleUploadComplete = useCallback((result: UploadResult) => {
    // Early return if no preview URL (upload was removed/cancelled)
    if (!result.previewUrl || result.previewUrl === "") {
      return;
    }

    const isBlobUrl = result.previewUrl.startsWith("blob:");
    const previewUrl = result.previewUrl;
    
    // SCENARIO 1: Already processed (completed upload) - skip to prevent duplicates
    if (processedPreviewUrls.current.has(previewUrl)) {
      return;
    }
    
    // SCENARIO 2: Currently processing and this is the final URL callback
    if (processingUploads.current.has(previewUrl)) {
      if (result.finalUrl) {
        // Find existing item by blob URL and update it with final URL
        const existingItemIndex = items.findIndex(
          (item) => item.photo_url === previewUrl
        );
        if (existingItemIndex !== -1) {
          // Update existing item with final URL
          onUpdateItem(existingItemIndex, "photo_url", result.finalUrl);
          
          // Update upload status
          setUploadStatuses((prev) => {
            const next = new Map(prev);
            const existing = next.get(existingItemIndex);
            if (existing) {
              next.set(existingItemIndex, {
                ...existing,
                finalUrl: result.finalUrl,
                status: "completed",
              });
            }
            return next;
          });

          // Clean up blob URL
          if (previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
          }
          // Mark as processed and remove from processing
          processedPreviewUrls.current.add(previewUrl);
          processingUploads.current.delete(previewUrl);
        }
      }
      return; // Exit after handling final URL update
    }
    
    // SCENARIO 3: New upload with blob URL - create new item
    if (isBlobUrl && !result.finalUrl) {
      // ATOMIC: Mark as processing IMMEDIATELY to prevent duplicate creation
      processingUploads.current.add(previewUrl);
      
      // Create new item with blob URL
      const newItem: OrderItem = {
        photo_url: previewUrl,
        product_name: "",
        quantity: 1,
        price_per_day: 0,
        days,
        line_total: 0,
      };

      const newIndex = items.length;
      onAddItem(newItem);

      // Track upload status
      const uploadStatus: ItemUploadStatus = {
        index: newIndex,
        previewUrl: previewUrl,
        status: result.status,
      };

      setUploadStatuses((prev) => {
        const next = new Map(prev);
        next.set(newIndex, uploadStatus);
        return next;
      });

      setNewItemIndex(newIndex);

      // Wait for upload promise to complete
      result.promise
        .then((finalUrl) => {
          // Update item with final URL (this will trigger another callback)
          onUpdateItem(newIndex, "photo_url", finalUrl);
          
          // Update upload status
          setUploadStatuses((prev) => {
            const next = new Map(prev);
            const existing = next.get(newIndex);
            if (existing) {
              next.set(newIndex, {
                ...existing,
                finalUrl,
                status: "completed",
              });
            }
            return next;
          });

          // Clean up blob URL
          if (previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
          }
          // Mark as processed (the callback with finalUrl will handle this too)
          processedPreviewUrls.current.add(previewUrl);
          processingUploads.current.delete(previewUrl);
        })
        .catch(() => {
          // Upload failed
          setUploadStatuses((prev) => {
            const next = new Map(prev);
            const existing = next.get(newIndex);
            if (existing) {
              next.set(newIndex, {
                ...existing,
                status: "failed",
              });
            }
            return next;
          });
          // Remove from sets on failure to allow retry
          processedPreviewUrls.current.delete(previewUrl);
          processingUploads.current.delete(previewUrl);
        });
    }
  }, [items, days, onAddItem, onUpdateItem]);

  const handleUpdateItem = useCallback((index: number, field: keyof OrderItem, value: any) => {
    const item = items[index];
    const updates: Partial<OrderItem> = { [field]: value };

    if (field === "quantity" || field === "price_per_day") {
      // Calculate line total: quantity × price_per_day
      updates.line_total =
        (updates.quantity || item.quantity) *
        (updates.price_per_day || item.price_per_day);
    }

    onUpdateItem(index, field, updates[field] ?? value);
  }, [items, onUpdateItem]);

  const handleRemoveItem = useCallback((index: number) => {
    // Clean up blob URL if it exists
    const uploadStatus = uploadStatuses.get(index);
    if (uploadStatus?.previewUrl) {
      if (uploadStatus.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(uploadStatus.previewUrl);
      }
      processedPreviewUrls.current.delete(uploadStatus.previewUrl);
      processingUploads.current.delete(uploadStatus.previewUrl);
    }
    
    // Remove from upload statuses
    setUploadStatuses((prev) => {
      const next = new Map(prev);
      next.delete(index);
      // Reindex remaining items
      const reindexed = new Map<number, ItemUploadStatus>();
      next.forEach((status, oldIndex) => {
        if (oldIndex > index) {
          reindexed.set(oldIndex - 1, { ...status, index: oldIndex - 1 });
        } else if (oldIndex < index) {
          reindexed.set(oldIndex, status);
        }
      });
      return reindexed;
    });
    
    onRemoveItem(index);
  }, [uploadStatuses, onRemoveItem]);

  // Check if item has blob URL (should not be saved)
  const hasBlobUrl = (item: OrderItem) => item.photo_url?.startsWith("blob:");

  return (
    <div className="space-y-4" ref={itemsSectionRef}>
      <div className="flex items-center justify-between">
        <Label className="text-lg font-bold text-[#0f1724]">Items</Label>
        {Array.from(uploadStatuses.values()).some((s) => s.status === "uploading") && (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading...
          </Badge>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const uploadStatus = uploadStatuses.get(index);
          const isUploading = uploadStatus?.status === "uploading";
          const isFailed = uploadStatus?.status === "failed";
          const hasBlob = hasBlobUrl(item);

          return (
            <Card
              key={`item-${index}-${item.photo_url}`}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={`p-4 rounded-lg border-2 ${
                newItemIndex === index
                  ? "ring-2 ring-[#273492] bg-[#273492]/5 shadow-lg"
                  : hasBlob
                  ? "border-yellow-300 bg-yellow-50/50"
                  : isFailed
                  ? "border-red-300 bg-red-50/50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="space-y-4">
                {/* Photo with Upload Status */}
                <div className="flex justify-center relative">
                  <div className="relative">
                    <img
                      src={item.photo_url}
                      alt="Product"
                      className={`w-20 h-20 object-cover rounded-lg border-2 cursor-pointer hover:opacity-80 ${
                        isUploading ? "border-blue-300" : isFailed ? "border-red-300" : "border-gray-200"
                      }`}
                      onClick={() => onImageClick?.(item.photo_url)}
                      onError={(e) => {
                        // Handle broken images
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder-image.png"; // Fallback image
                      }}
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                    {isFailed && (
                      <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      </div>
                    )}
                    {hasBlob && !isUploading && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                        <AlertCircle className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Warning */}
                {hasBlob && (
                  <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800">
                      Image is uploading. Please wait before saving the order.
                    </p>
                  </div>
                )}

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
                    disabled={isUploading}
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
                      className="h-10 text-sm rounded-lg border-gray-200 focus:border-[#273492] focus:ring-1 focus:ring-[#273492]"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      disabled={isUploading}
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
                      className="h-10 text-sm rounded-lg border-gray-200 focus:border-[#273492] focus:ring-1 focus:ring-[#273492]"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      disabled={isUploading}
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
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                      aria-label="Remove item"
                      disabled={isUploading}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Camera Upload */}
      <div className="flex justify-center pt-2">
        <CameraUpload 
          onUploadComplete={handleUploadComplete}
          disabled={Array.from(uploadStatuses.values()).some((s) => s.status === "uploading")}
        />
      </div>
    </div>
  );
}
