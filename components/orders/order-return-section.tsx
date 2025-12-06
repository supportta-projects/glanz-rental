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
    
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    
    setItemReturnStates((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      
      const newIsSelected = !current.isSelected;
      
      return {
        ...prev,
        [itemId]: {
          ...current,
          isSelected: newIsSelected,
          // When checked = fully returned (all quantity)
          // When unchecked = reset to 0
          returned_quantity: newIsSelected ? item.quantity : 0,
          // Reset damage when unchecking
          damage_fee: newIsSelected ? current.damage_fee : 0,
          damage_description: newIsSelected ? current.damage_description : "",
        },
      };
    });
    
  };

  const handleReturnedQuantityChange = (itemId: string, value: string) => {
    if (disabled) return;
    
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // ✅ CRITICAL FIX (Issue M1, M2, M6): Validate returned_quantity
    // Only allow integers, non-negative, and not exceeding quantity
    
    // ✅ FIX (Issue M6): Check if input contains decimal point (not an integer)
    if (value.includes('.') || value.includes(',')) {
      showToast("Returned quantity must be a whole number (no decimals)", "error");
      return;
    }
    
    const numValue = parseInt(value, 10);
    
    // Check if input is valid integer
    if (isNaN(numValue) || value.trim() === "" || !Number.isInteger(numValue)) {
      // If empty or invalid, allow it but clamp to 0
      if (value.trim() === "" || isNaN(numValue)) {
        setItemReturnStates((prev) => ({
          ...prev,
          [itemId]: {
            ...prev[itemId],
            returned_quantity: 0,
          },
        }));
      }
      return; // Don't update if invalid input
    }

    // Clamp value: 0 <= returned_quantity <= quantity
    const maxQuantity = item.quantity;
    const clampedValue = Math.max(0, Math.min(numValue, maxQuantity));

    // Show warning if user tried to exceed max
    if (numValue > maxQuantity) {
      showToast(`Returned quantity cannot exceed ${maxQuantity} (original quantity)`, "info");
    }

    // Show warning if user tried to enter negative
    if (numValue < 0) {
      showToast("Returned quantity cannot be negative", "info");
    }

    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        returned_quantity: clampedValue,
        // Keep checkbox state as-is, don't auto-uncheck when quantity changes
        // isSelected remains unchanged - only toggles when checkbox is clicked
      },
    }));
  };

  const handleDamageFeeChange = (itemId: string, value: string) => {
    if (disabled) return;
    
    // ✅ FIX (Issue M3): Validate damage fee is non-negative
    const numValue = parseFloat(value) || 0;
    
    // Show error if negative value entered
    if (numValue < 0) {
      showToast("Damage fee cannot be negative", "error");
      return;
    }
    
    const clampedValue = Math.max(0, numValue);
    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        damage_fee: clampedValue,
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
    
    // ✅ FIX: Mark all items as returned and automatically submit
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
    
    // ✅ FIX: Automatically submit after marking all as returned
    // Use setTimeout to ensure state is updated before submission
    setTimeout(() => {
      handleSubmitReturn();
    }, 150);
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

      // ✅ CRITICAL FIX (Issue N1): Determine return status based on returned quantity
      // Logic:
      // - 0 returned → not_yet_returned
      // - All returned (qty = quantity) → returned
      // - Partial return (0 < qty < quantity) → returned (but order status will be partially_returned or flagged)
      // - Missing items are tracked separately via return_status = "missing"
      
      // Validate returned_quantity is within bounds (should already be clamped, but double-check)
      const validatedQty = Math.max(0, Math.min(newReturnedQty, item.quantity));
      
      let returnStatus: "returned" | "missing" | "not_yet_returned";
      if (validatedQty === 0) {
        returnStatus = "not_yet_returned";
      } else if (validatedQty === item.quantity) {
        // All items returned
        returnStatus = "returned";
      } else {
        // Partial return: some items returned (0 < qty < quantity)
        // Status is "returned" because items were physically returned
        // The missing quantity (quantity - returned_quantity) will be handled by the database
        // The order-level status will be determined as "partially_returned" or "flagged"
        returnStatus = "returned";
      }

      // ✅ CRITICAL FIX (Issue M1, M2): Final validation before sending
      // Ensure returned_quantity is valid (0 <= qty <= quantity)
      const finalReturnedQty = Math.max(0, Math.min(Number(newReturnedQty), item.quantity));
      
      // Validate damage_fee is non-negative
      const finalDamageFee = state.damage_fee > 0 ? Math.max(0, Number(state.damage_fee)) : undefined;
      
      // If damage_fee > 0, require damage_description
      if (finalDamageFee && finalDamageFee > 0 && !state.damage_description?.trim()) {
        showToast(`Please provide a damage description for item "${item.product_name || 'item'}"`, "error");
        return;
      }

      itemReturns.push({
        itemId: item.id,
        returnStatus,
        returned_quantity: finalReturnedQty, // Validated: 0 <= qty <= quantity
        damage_fee: finalDamageFee, // Validated: >= 0
        damage_description: state.damage_description?.trim() || undefined,
        actualReturnDate: finalReturnedQty > 0 ? new Date().toISOString() : undefined,
      });
    });

    if (itemReturns.length === 0) {
      showToast("No changes to save", "info");
      return;
    }

    // ✅ CRITICAL FIX (Issue M1, M2): Final validation of all item returns
    for (const itemReturn of itemReturns) {
      const item = items.find((i) => i.id === itemReturn.itemId);
      if (!item) continue;
      
      // Validate returned_quantity
      if (itemReturn.returned_quantity !== undefined) {
        if (itemReturn.returned_quantity < 0) {
          showToast(`Returned quantity cannot be negative for item "${item.product_name || 'item'}"`, "error");
          return;
        }
        if (itemReturn.returned_quantity > item.quantity) {
          showToast(`Returned quantity (${itemReturn.returned_quantity}) cannot exceed original quantity (${item.quantity}) for item "${item.product_name || 'item'}"`, "error");
          return;
        }
      }
      
      // Validate damage_fee
      if (itemReturn.damage_fee !== undefined && itemReturn.damage_fee < 0) {
        showToast(`Damage fee cannot be negative for item "${item.product_name || 'item'}"`, "error");
        return;
      }
    }

    try {
      // ✅ FIX (Issue M3): Validate late fee is non-negative and reasonable
      const feeValue = parseFloat(lateFee) || 0;
      if (isNaN(feeValue) || feeValue < 0) {
        showToast("Late fee must be a valid non-negative number", "error");
        return;
      }
      
      // Validate late fee is reasonable (not more than order total)
      const orderTotal = order.total_amount || 0;
      if (feeValue > orderTotal * 2) {
        showToast(`Late fee (₹${feeValue.toLocaleString()}) seems unusually high. Please verify.`, "error");
        return;
      }
      
      const fee = Math.max(0, feeValue);

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
            // Calculate partiallyReturned from state (local) instead of item (database)
            // This allows damage fields to show immediately while editing
            const partiallyReturned = state.returned_quantity > 0 && state.returned_quantity < item.quantity;
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

                    {/* Show quantity input when checkbox is checked, damage fields only when quantity is missing */}
                    {state.isSelected && (
                      <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                        {/* Returned Quantity - Always editable when checkbox is checked */}
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
                            {state.returned_quantity === item.quantity && (
                              <Badge className="bg-green-500 text-white text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Fully Returned
                              </Badge>
                            )}
                            {partiallyReturned && (
                              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                {item.quantity - state.returned_quantity} missing
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Damage Fee & Description - Only show when quantity is missing (partial return) */}
                        {partiallyReturned && (
                          <>
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
                          </>
                        )}
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

