"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OrderItem, Order } from "@/lib/types";
import { formatDateTime, isOrderLate, formatCurrency } from "@/lib/utils/date";
import { useProcessOrderReturn } from "@/lib/queries/orders";
import { useToast } from "@/components/ui/toast";
import { CheckCircle, AlertCircle, Clock, Package, AlertTriangle } from "lucide-react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OrderReturnSectionProps {
  order: Order;
  onReturnComplete?: () => void;
  disabled?: boolean;
}

// Item-level state for returns
interface ItemReturnState {
  returned_quantity: number;
  damage_fee: number;
  damage_description: string;
  isSelected: boolean;
}

export function OrderReturnSection({ order, onReturnComplete, disabled = false }: OrderReturnSectionProps) {
  const { showToast } = useToast();
  const processReturnMutation = useProcessOrderReturn();
  
  const items = order.items || [];
  const endDate = (order as any).end_datetime || order.end_date;
  const isLate = isOrderLate(endDate);

  // State for item return details (returned_quantity, damage_fee, damage_description)
  const [itemReturnStates, setItemReturnStates] = useState<Record<string, ItemReturnState>>(() => {
    const states: Record<string, ItemReturnState> = {};
    items.forEach((item) => {
      if (item.id) {
        states[item.id] = {
          returned_quantity: item.returned_quantity ?? (item.return_status === "returned" ? item.quantity : 0),
          damage_fee: item.damage_fee ?? 0,
          damage_description: item.damage_description ?? "",
          isSelected: item.return_status === "returned" || (item.returned_quantity ?? 0) > 0,
        };
      }
    });
    return states;
  });

  const [lateFee, setLateFee] = useState(() => {
    return order.late_fee ? order.late_fee.toString() : "0";
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Update states when order changes
  useEffect(() => {
    const newStates: Record<string, ItemReturnState> = {};
    items.forEach((item) => {
      if (item.id) {
        newStates[item.id] = {
          returned_quantity: item.returned_quantity ?? (item.return_status === "returned" ? item.quantity : 0),
          damage_fee: item.damage_fee ?? 0,
          damage_description: item.damage_description ?? "",
          isSelected: item.return_status === "returned" || (item.returned_quantity ?? 0) > 0,
        };
      }
    });
    setItemReturnStates(newStates);
  }, [items]);

  // Calculate return statistics (including partial returns)
  const returnStats = useMemo(() => {
    let totalQuantity = 0;
    let returnedQuantity = 0;
    let fullyReturnedItems = 0;
    let partiallyReturnedItems = 0;
    let notReturnedItems = 0;
    let missingItems = 0;
    let totalDamageFees = 0;

    items.forEach((item) => {
      totalQuantity += item.quantity;
      const returnedQty = item.returned_quantity ?? 0;
      returnedQuantity += returnedQty;
      totalDamageFees += item.damage_fee ?? 0;

      if (item.return_status === "missing") {
        missingItems++;
      } else if (returnedQty === 0) {
        notReturnedItems++;
      } else if (returnedQty === item.quantity) {
        fullyReturnedItems++;
      } else {
        partiallyReturnedItems++;
      }
    });

    return {
      totalItems: items.length,
      totalQuantity,
      returnedQuantity,
      fullyReturnedItems,
      partiallyReturnedItems,
      notReturnedItems,
      missingItems,
      totalDamageFees,
    };
  }, [items]);

  const handleToggleItem = (itemId: string) => {
    if (disabled) return;
    
    setItemReturnStates((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      
      return {
        ...prev,
        [itemId]: {
          ...current,
          isSelected: !current.isSelected,
          // If unselecting, reset returned_quantity to 0
          returned_quantity: !current.isSelected ? current.returned_quantity : 0,
        },
      };
    });
  };

  const handleReturnedQuantityChange = (itemId: string, value: string) => {
    if (disabled) return;
    
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const numValue = parseInt(value) || 0;
    const maxQuantity = item.quantity;
    const clampedValue = Math.max(0, Math.min(numValue, maxQuantity));

    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        returned_quantity: clampedValue,
        isSelected: clampedValue > 0,
      },
    }));
  };

  const handleDamageFeeChange = (itemId: string, value: string) => {
    if (disabled) return;
    
    const numValue = parseFloat(value) || 0;
    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        damage_fee: Math.max(0, numValue),
      },
    }));
  };

  const handleDamageDescriptionChange = (itemId: string, value: string) => {
    if (disabled) return;
    
    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        damage_description: value,
      },
    }));
  };

  const handleMarkAllReturned = () => {
    if (disabled) return;
    
    const newStates: Record<string, ItemReturnState> = {};
    items.forEach((item) => {
      if (item.id) {
        newStates[item.id] = {
          returned_quantity: item.quantity,
          damage_fee: itemReturnStates[item.id]?.damage_fee ?? 0,
          damage_description: itemReturnStates[item.id]?.damage_description ?? "",
          isSelected: true,
        };
      }
    });
    setItemReturnStates(newStates);
  };

  const handleSubmitReturn = async () => {
    if (disabled) return;

    const itemReturns: Array<{
      itemId: string;
      returnStatus: "returned" | "missing" | "not_yet_returned";
      returned_quantity?: number;
      damage_fee?: number;
      damage_description?: string;
      actualReturnDate?: string;
    }> = [];

    items.forEach((item) => {
      if (!item.id) return;
      
      const state = itemReturnStates[item.id];
      if (!state) return;

      const currentReturnedQty = item.returned_quantity ?? 0;
      const newReturnedQty = state.returned_quantity ?? 0;
      const hasChanges = 
        currentReturnedQty !== newReturnedQty ||
        (item.damage_fee ?? 0) !== state.damage_fee ||
        (item.damage_description ?? "") !== state.damage_description;

      if (!hasChanges) return;

      // Determine return status based on returned quantity
      let returnStatus: "returned" | "missing" | "not_yet_returned";
      if (newReturnedQty === 0) {
        returnStatus = "not_yet_returned";
      } else if (newReturnedQty === item.quantity) {
        returnStatus = "returned";
      } else {
        returnStatus = "returned"; // Partial return is still "returned" status
      }

      itemReturns.push({
        itemId: item.id,
        returnStatus,
        returned_quantity: newReturnedQty,
        damage_fee: state.damage_fee > 0 ? state.damage_fee : undefined,
        damage_description: state.damage_description || undefined,
        actualReturnDate: newReturnedQty > 0 ? new Date().toISOString() : undefined,
      });
    });

    if (itemReturns.length === 0) {
      showToast("No changes to save", "info");
      return;
    }

    try {
      const fee = parseFloat(lateFee) || 0;

      await processReturnMutation.mutateAsync({
        orderId: order.id,
        itemReturns,
        lateFee: fee,
      });

      setLateFee("0");
      
      // Determine completion status
      const allFullyReturned = items.every((item) => {
        const state = itemReturnStates[item.id!];
        return state && state.returned_quantity === item.quantity;
      });

      const hasPartialReturns = items.some((item) => {
        const state = itemReturnStates[item.id!];
        return state && state.returned_quantity > 0 && state.returned_quantity < item.quantity;
      });

      const hasDamage = items.some((item) => {
        const state = itemReturnStates[item.id!];
        return state && (state.damage_fee > 0 || state.damage_description);
      });

      if (allFullyReturned && !hasPartialReturns && !hasDamage) {
        showToast("All items returned successfully. Order completed!", "success");
      } else if (hasPartialReturns || hasDamage) {
        showToast("Items returned with issues. Order marked as completed with issues.", "success");
      } else {
        showToast("Items returned successfully. Order marked as partially returned.", "success");
      }

      onReturnComplete?.();
    } catch (error: any) {
      showToast(error.message || "Failed to process return", "error");
    }
  };

  const isItemReturned = (item: OrderItem) => {
    const returnedQty = item.returned_quantity ?? 0;
    return returnedQty > 0;
  };

  const isItemFullyReturned = (item: OrderItem) => {
    const returnedQty = item.returned_quantity ?? 0;
    return returnedQty === item.quantity;
  };

  const isItemPartiallyReturned = (item: OrderItem) => {
    const returnedQty = item.returned_quantity ?? 0;
    return returnedQty > 0 && returnedQty < item.quantity;
  };

  const isItemLate = (item: OrderItem) => {
    if (item.return_status === "returned" && item.late_return) return true;
    if (!item.return_status || item.return_status === "not_yet_returned") {
      return isLate;
    }
    return false;
  };

  const allItemsFullyReturned = useMemo(() => {
    return items.every((item) => {
      const state = itemReturnStates[item.id!];
      return state && state.returned_quantity === item.quantity;
    });
  }, [items, itemReturnStates]);

  const hasChanges = useMemo(() => {
    return items.some((item) => {
      if (!item.id) return false;
      const state = itemReturnStates[item.id];
      if (!state) return false;

      return (
        (item.returned_quantity ?? 0) !== state.returned_quantity ||
        (item.damage_fee ?? 0) !== state.damage_fee ||
        (item.damage_description ?? "") !== state.damage_description
      );
    });
  }, [items, itemReturnStates]);

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {/* Professional Summary Card */}
      <Card className="p-4 sm:p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#273492]/10 rounded-lg">
              <CheckCircle className="h-4 w-4 text-[#273492]" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Return Status</h2>
          </div>
          {isLate && (
            <Badge className="bg-red-500 text-white text-xs px-2.5 py-1">
              <AlertCircle className="h-3 w-3 mr-1.5" />
              Late Return
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Total Items</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{returnStats.totalItems}</p>
            <p className="text-xs text-gray-500 mt-1">({returnStats.totalQuantity} qty)</p>
          </div>
          
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Returned</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{returnStats.returnedQuantity}</p>
            <p className="text-xs text-gray-500 mt-1">
              {returnStats.fullyReturnedItems} full, {returnStats.partiallyReturnedItems} partial
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <p className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Pending</p>
            <p className="text-xl sm:text-2xl font-bold text-orange-600">
              {returnStats.totalQuantity - returnStats.returnedQuantity}
            </p>
            <p className="text-xs text-gray-500 mt-1">{returnStats.notReturnedItems} items</p>
          </div>
          
          <div className="p-3 rounded-lg bg-[#273492]/10 border border-[#273492]/20">
            <p className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Status</p>
            <p className="text-base sm:text-lg font-bold text-[#273492]">
              {allItemsFullyReturned 
                ? "Completed" 
                : returnStats.returnedQuantity > 0 
                ? "Partial" 
                : "Pending"}
            </p>
            {returnStats.totalDamageFees > 0 && (
              <p className="text-xs text-red-600 mt-1 font-semibold">
                Damage: ₹{returnStats.totalDamageFees.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Items Table with Return Details */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Items & Return Details</h2>
          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllReturned}
              className="text-xs"
              disabled={disabled}
            >
              Mark All as Returned
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const state = itemReturnStates[item.id!] || {
              returned_quantity: 0,
              damage_fee: 0,
              damage_description: "",
              isSelected: false,
            };
            const returned = isItemReturned(item);
            const fullyReturned = isItemFullyReturned(item);
            const partiallyReturned = isItemPartiallyReturned(item);
            const itemLate = isItemLate(item);
            const isExpanded = expandedItems.has(item.id!);
            const hasDamage = (state.damage_fee > 0) || !!state.damage_description;

            return (
              <Card 
                key={item.id} 
                className={`p-4 border-2 ${
                  fullyReturned 
                    ? "bg-green-50 border-green-200" 
                    : partiallyReturned 
                    ? "bg-yellow-50 border-yellow-200" 
                    : itemLate 
                    ? "bg-orange-50 border-orange-200" 
                    : hasDamage
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="pt-1">
                    <Checkbox
                      id={`return-${item.id}`}
                      checked={state.isSelected}
                      onCheckedChange={() => handleToggleItem(item.id!)}
                      disabled={disabled}
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      {item.photo_url && (
                        <img
                          src={item.photo_url}
                          alt={item.product_name || "Product"}
                          className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-80"
                          onClick={() => setSelectedImage(item.photo_url)}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">
                            {item.product_name || "Unnamed Product"}
                          </p>
                          {fullyReturned && (
                            <Badge className="bg-green-500 text-white text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Fully Returned
                            </Badge>
                          )}
                          {partiallyReturned && (
                            <Badge className="bg-yellow-500 text-white text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              Partial Return
                            </Badge>
                          )}
                          {itemLate && !returned && (
                            <Badge className="bg-orange-500 text-white text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Late
                            </Badge>
                          )}
                          {hasDamage && (
                            <Badge className="bg-red-500 text-white text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Damage
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Qty: <strong>{item.quantity}</strong></span>
                          <span>Price: <strong>{formatCurrency(item.price_per_day)}</strong></span>
                          <span>Total: <strong>{formatCurrency(item.line_total)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Return Details (Always visible for selected items) */}
                    {(state.isSelected || returned) && (
                      <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                        {/* Returned Quantity */}
                        <div>
                          <Label htmlFor={`qty-${item.id}`} className="text-sm font-medium">
                            Returned Quantity *
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              id={`qty-${item.id}`}
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={state.returned_quantity}
                              onChange={(e) => handleReturnedQuantityChange(item.id!, e.target.value)}
                              className="w-24"
                              disabled={disabled}
                            />
                            <span className="text-sm text-gray-500">of {item.quantity}</span>
                            {partiallyReturned && (
                              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                {item.quantity - state.returned_quantity} missing
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Damage Fee */}
                        <div>
                          <Label htmlFor={`damage-fee-${item.id}`} className="text-sm font-medium">
                            Damage Fee (₹)
                          </Label>
                          <Input
                            id={`damage-fee-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={state.damage_fee || ""}
                            onChange={(e) => handleDamageFeeChange(item.id!, e.target.value)}
                            placeholder="0.00"
                            className="mt-1"
                            disabled={disabled}
                          />
                        </div>

                        {/* Damage Description */}
                        <div>
                          <Label htmlFor={`damage-desc-${item.id}`} className="text-sm font-medium">
                            Damage Description / Issues
                          </Label>
                          <Textarea
                            id={`damage-desc-${item.id}`}
                            value={state.damage_description}
                            onChange={(e) => handleDamageDescriptionChange(item.id!, e.target.value)}
                            placeholder="Describe any damage, missing parts, or issues..."
                            className="mt-1 min-h-[80px]"
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Late Fee Input */}
      <Card className="p-4">
        <div className="space-y-2">
          <Label htmlFor="late-fee" className="text-sm font-medium">
            Late Fee (₹) {isLate && <span className="text-orange-600">* Optional</span>}
          </Label>
          <Input
            id="late-fee"
            type="number"
            value={lateFee}
            onChange={(e) => setLateFee(e.target.value)}
            placeholder="0"
            min="0"
            step="0.01"
            className="h-12"
            disabled={disabled}
          />
          {isLate && (
            <p className="text-xs text-gray-500">
              This order was returned after the due date ({formatDateTime(endDate, false)}). 
              Enter a late fee if applicable.
            </p>
          )}
        </div>
      </Card>

      {/* Submit Button */}
      {!disabled && hasChanges && (
        <Button
          onClick={handleSubmitReturn}
          disabled={processReturnMutation.isPending}
          className="w-full h-14 bg-green-500 hover:bg-green-600 text-white text-base font-semibold rounded-xl"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          {processReturnMutation.isPending
            ? "Processing..."
            : allItemsFullyReturned
            ? "Save Changes (All Items Returned)"
            : "Save Changes"}
        </Button>
      )}

      {/* Disabled Message */}
      {disabled && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <p className="text-blue-800 font-medium">
              Rental has not started yet. Items cannot be marked as returned until the rental begins.
            </p>
          </div>
        </Card>
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

