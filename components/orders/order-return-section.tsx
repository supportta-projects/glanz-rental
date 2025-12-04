"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderItem, Order } from "@/lib/types";
import { formatDateTime, isOrderLate, formatCurrency } from "@/lib/utils/date";
import { useProcessOrderReturn } from "@/lib/queries/orders";
import { useToast } from "@/components/ui/toast";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OrderReturnSectionProps {
  order: Order;
  onReturnComplete?: () => void;
  disabled?: boolean; // Disable all interactions (e.g., for scheduled orders)
}

export function OrderReturnSection({ order, onReturnComplete, disabled = false }: OrderReturnSectionProps) {
  const { showToast } = useToast();
  const processReturnMutation = useProcessOrderReturn();
  
  const items = order.items || [];
  const endDate = (order as any).end_datetime || order.end_date;
  const isLate = isOrderLate(endDate);

  // Initialize selectedItems with already returned items
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    const returned = new Set<string>();
    items.forEach((item) => {
      if (item.return_status === "returned" && item.id) {
        returned.add(item.id);
      }
    });
    return returned;
  });

  const [lateFee, setLateFee] = useState(() => {
    return order.late_fee ? order.late_fee.toString() : "0";
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Update selectedItems when order changes (e.g., after refetch)
  useEffect(() => {
    const returned = new Set<string>();
    items.forEach((item) => {
      if (item.return_status === "returned" && item.id) {
        returned.add(item.id);
      }
    });
    setSelectedItems(returned);
  }, [items]);

  // Calculate return statistics
  const returnStats = useMemo(() => {
    const returned = items.filter(
      (item) => item.return_status === "returned"
    ).length;
    const notReturned = items.filter(
      (item) => !item.return_status || item.return_status === "not_yet_returned"
    ).length;
    const missing = items.filter(
      (item) => item.return_status === "missing"
    ).length;

    return { returned, notReturned, missing, total: items.length };
  }, [items]);

  // Get items that are not yet returned (can be marked as returned)
  const returnableItems = useMemo(() => {
    return items.filter(
      (item) => !item.return_status || item.return_status === "not_yet_returned"
    );
  }, [items]);

  const handleToggleItem = (itemId: string) => {
    if (disabled) return; // Prevent toggling when disabled
    
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Allow toggling all items - check/uncheck returned items for partial return
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleMarkAllReturned = () => {
    if (disabled) return; // Prevent action when disabled
    
    const allIds = new Set(returnableItems.map((item) => item.id!));
    setSelectedItems(allIds);
  };

  const handleUncheckAll = () => {
    if (disabled) return; // Prevent action when disabled
    
    setSelectedItems(new Set());
  };

  const handleSubmitReturn = async () => {
    if (disabled) return; // Prevent submission when disabled
    // Determine which items changed status
    const itemsToReturn: Array<{ itemId: string; returnStatus: "returned"; actualReturnDate: string }> = [];
    const itemsToRevert: Array<{ itemId: string; returnStatus: "not_yet_returned" }> = [];

    items.forEach((item) => {
      if (!item.id) return;
      
      const isCurrentlyReturned = item.return_status === "returned";
      const isSelected = selectedItems.has(item.id);

      // Item is being marked as returned
      if (isSelected && !isCurrentlyReturned) {
        itemsToReturn.push({
          itemId: item.id,
          returnStatus: "returned",
          actualReturnDate: new Date().toISOString(),
        });
      }
      
      // Item is being unselected (reverted from returned to not_yet_returned)
      if (!isSelected && isCurrentlyReturned) {
        itemsToRevert.push({
          itemId: item.id,
          returnStatus: "not_yet_returned",
        });
      }
    });

    // Check if there are any changes
    if (itemsToReturn.length === 0 && itemsToRevert.length === 0) {
      showToast("No changes to save", "info");
      return;
    }

    try {
      const fee = parseFloat(lateFee) || 0;

      // Combine all changes into one mutation call
      const itemReturns = [
        ...itemsToReturn.map((ir) => ({
          itemId: ir.itemId,
          returnStatus: ir.returnStatus,
          actualReturnDate: ir.actualReturnDate,
        })),
        ...itemsToRevert.map((ir) => ({
          itemId: ir.itemId,
          returnStatus: ir.returnStatus,
        })),
      ];

      // Mutation with optimistic updates - UI updates instantly (<1ms)
      await processReturnMutation.mutateAsync({
        orderId: order.id,
        itemReturns,
        lateFee: fee,
      });

      // Reset late fee input after successful submission
      setLateFee("0");

      // Determine the result message
      const allItemsNowReturned = items.every((item) => {
        if (!item.id) return false;
        const willBeReturned = selectedItems.has(item.id);
        return willBeReturned;
      });

      if (allItemsNowReturned && itemsToRevert.length === 0) {
        showToast("All items returned successfully. Order completed!", "success");
      } else if (itemsToRevert.length > 0 && itemsToReturn.length === 0) {
        showToast(`Items reverted successfully. Order marked as partially returned.`, "success");
      } else if (itemsToRevert.length > 0) {
        showToast("Items updated successfully. Some items marked as returned, some reverted.", "success");
      } else {
        showToast("Items returned successfully. Order marked as partially returned.", "success");
      }

      // No manual refetch needed - optimistic update already handled it
      // Background refetch will happen automatically via query invalidation
      onReturnComplete?.();
    } catch (error: any) {
      showToast(error.message || "Failed to process return", "error");
    }
  };

  const isItemReturned = (item: OrderItem) => {
    return item.return_status === "returned";
  };

  const isItemLate = (item: OrderItem) => {
    if (item.return_status === "returned" && item.late_return) return true;
    if (!item.return_status || item.return_status === "not_yet_returned") {
      return isLate;
    }
    return false;
  };

  const allItemsReturned = useMemo(() => {
    return items.every((item) => {
      if (!item.id) return false;
      return selectedItems.has(item.id) || item.return_status === "returned";
    });
  }, [items, selectedItems]);

  const hasChanges = useMemo(() => {
    // Check if there are any changes from current state
    return items.some((item) => {
      if (!item.id) return false;
      const isCurrentlyReturned = item.return_status === "returned";
      const isSelected = selectedItems.has(item.id);
      // Has change if status differs from current state
      return isCurrentlyReturned !== isSelected;
    });
  }, [items, selectedItems]);

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
          {/* Total Items */}
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Total Items</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{returnStats.total}</p>
          </div>
          
          {/* Returned */}
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Returned</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{returnStats.returned}</p>
          </div>
          
          {/* Pending */}
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <p className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Pending</p>
            <p className="text-xl sm:text-2xl font-bold text-orange-600">{returnStats.notReturned}</p>
          </div>
          
          {/* Status */}
          <div className="p-3 rounded-lg bg-[#273492]/10 border border-[#273492]/20">
            <p className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Status</p>
            <p className="text-base sm:text-lg font-bold text-[#273492]">
              {allItemsReturned ? "Completed" : returnStats.returned > 0 ? "Partial" : "Pending"}
            </p>
          </div>
        </div>
      </Card>

      {/* Unified Items Table */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Items</h2>
          {!disabled && (
            <div className="flex gap-2">
              {returnableItems.length > 0 && (
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleUncheckAll}
                className="text-xs"
                disabled={disabled}
              >
                Uncheck All
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price/Day</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const returned = isItemReturned(item);
                const checked = selectedItems.has(item.id!);
                const itemLate = isItemLate(item);

                return (
                  <TableRow
                    key={item.id}
                    className={returned ? "bg-green-50" : itemLate ? "bg-orange-50" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        id={`return-${item.id}`}
                        checked={checked}
                        onCheckedChange={() => handleToggleItem(item.id!)}
                        disabled={disabled}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.photo_url && (
                          <img
                            src={item.photo_url}
                            alt={item.product_name || "Product"}
                            className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-80"
                            onClick={() => setSelectedImage(item.photo_url)}
                          />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.product_name || "Unnamed Product"}
                          </p>
                          {itemLate && !returned && (
                            <Badge className="bg-orange-500 text-white text-xs mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              Late
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{item.quantity || 0}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{formatCurrency(item.price_per_day || 0)}</span>
                        <span className="text-xs text-gray-500">per day</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(item.line_total || 0)}
                      </span>
                      <p className="text-xs text-gray-500">
                        {item.quantity || 0} × {formatCurrency(item.price_per_day || 0)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {returned ? (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Returned
                          {item.actual_return_date && (
                            <span className="ml-1 text-xs">
                              ({formatDateTime(item.actual_return_date, false)})
                            </span>
                          )}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">
                          Not Returned
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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

      {/* Submit Button - Show when there are changes and not disabled */}
      {!disabled && hasChanges && (
        <Button
          onClick={handleSubmitReturn}
          disabled={processReturnMutation.isPending}
          className="w-full h-14 bg-green-500 hover:bg-green-600 text-white text-base font-semibold rounded-xl"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          {processReturnMutation.isPending
            ? "Processing..."
            : allItemsReturned
            ? "Save Changes (All Items Returned)"
            : "Save Changes"}
        </Button>
      )}

      {/* Disabled Message for Scheduled Orders */}
      {disabled && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <p className="text-blue-800 font-medium">
              Rental has not started yet. Items cannot be marked as returned until the rental begins. Click "Start Rental Now" to enable return tracking.
            </p>
          </div>
        </Card>
      )}

      {/* Completion Message */}
      {allItemsReturned && returnStats.returned === returnStats.total && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">
              All items have been returned. Order is completed.
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
