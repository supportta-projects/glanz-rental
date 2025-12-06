/**
 * ============================================
 * VALIDATION UTILITIES
 * ============================================
 * Centralized validation functions for order management
 * Used across order creation, editing, and return processing
 * ============================================
 */

/**
 * Validates that end date is after start date
 * @param startDate - Start date string (ISO format)
 * @param endDate - End date string (ISO format)
 * @returns Object with isValid flag and error message
 */
export function validateDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): { isValid: boolean; error?: string } {
  if (!startDate) {
    return { isValid: false, error: "Start date is required" };
  }

  if (!endDate) {
    return { isValid: false, error: "End date is required" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return { isValid: false, error: "Invalid start date format" };
  }

  if (isNaN(end.getTime())) {
    return { isValid: false, error: "Invalid end date format" };
  }

  if (end <= start) {
    return { isValid: false, error: "End date must be after start date" };
  }

  // Validate minimum rental period (at least 1 hour)
  const rentalDurationMs = end.getTime() - start.getTime();
  const rentalDurationHours = rentalDurationMs / (1000 * 60 * 60);
  if (rentalDurationHours < 1) {
    return { isValid: false, error: "Rental period must be at least 1 hour" };
  }

  return { isValid: true };
}

/**
 * Validates returned quantity is within valid range
 * @param returnedQuantity - Quantity returned
 * @param maxQuantity - Maximum allowed quantity (original quantity)
 * @returns Object with isValid flag, clamped value, and error message
 */
export function validateReturnedQuantity(
  returnedQuantity: number | string | null | undefined,
  maxQuantity: number
): { isValid: boolean; clampedValue: number; error?: string; warning?: string } {
  // Convert to number
  const numValue = typeof returnedQuantity === 'string' 
    ? parseInt(returnedQuantity, 10) 
    : (returnedQuantity ?? 0);

  // Check if valid integer
  if (isNaN(numValue) || !Number.isInteger(numValue)) {
    return {
      isValid: false,
      clampedValue: 0,
      error: "Returned quantity must be a valid integer"
    };
  }

  // Clamp value: 0 <= returned_quantity <= maxQuantity
  const clampedValue = Math.max(0, Math.min(numValue, maxQuantity));

  // Generate warnings/errors
  if (numValue < 0) {
    return {
      isValid: false,
      clampedValue: 0,
      error: "Returned quantity cannot be negative"
    };
  }

  if (numValue > maxQuantity) {
    return {
      isValid: true, // Valid after clamping
      clampedValue,
      warning: `Returned quantity cannot exceed ${maxQuantity} (original quantity). Value clamped to ${maxQuantity}.`
    };
  }

  return { isValid: true, clampedValue };
}

/**
 * Validates damage fee is non-negative
 * @param damageFee - Damage fee amount
 * @returns Object with isValid flag, clamped value, and error message
 */
export function validateDamageFee(
  damageFee: number | string | null | undefined
): { isValid: boolean; clampedValue: number; error?: string } {
  const numValue = typeof damageFee === 'string' 
    ? parseFloat(damageFee) 
    : (damageFee ?? 0);

  if (isNaN(numValue)) {
    return {
      isValid: false,
      clampedValue: 0,
      error: "Damage fee must be a valid number"
    };
  }

  const clampedValue = Math.max(0, numValue);

  if (numValue < 0) {
    return {
      isValid: false,
      clampedValue: 0,
      error: "Damage fee cannot be negative"
    };
  }

  return { isValid: true, clampedValue };
}

/**
 * Validates that damage description is provided when damage fee > 0
 * @param damageFee - Damage fee amount
 * @param damageDescription - Damage description text
 * @returns Object with isValid flag and error message
 */
export function validateDamageDescription(
  damageFee: number | null | undefined,
  damageDescription: string | null | undefined
): { isValid: boolean; error?: string } {
  const fee = damageFee ?? 0;
  const description = damageDescription?.trim() ?? "";

  if (fee > 0 && description.length === 0) {
    return {
      isValid: false,
      error: "Damage description is required when damage fee is greater than 0"
    };
  }

  return { isValid: true };
}

/**
 * Validates late fee is non-negative
 * @param lateFee - Late fee amount
 * @returns Object with isValid flag, clamped value, and error message
 */
export function validateLateFee(
  lateFee: number | string | null | undefined
): { isValid: boolean; clampedValue: number; error?: string } {
  const numValue = typeof lateFee === 'string' 
    ? parseFloat(lateFee) 
    : (lateFee ?? 0);

  if (isNaN(numValue)) {
    return {
      isValid: false,
      clampedValue: 0,
      error: "Late fee must be a valid number"
    };
  }

  const clampedValue = Math.max(0, numValue);

  if (numValue < 0) {
    return {
      isValid: false,
      clampedValue: 0,
      error: "Late fee cannot be negative"
    };
  }

  return { isValid: true, clampedValue };
}

/**
 * Validates order item has all required fields
 * @param item - Order item object
 * @returns Object with isValid flag and error message
 */
export function validateOrderItem(item: {
  quantity?: number;
  price_per_day?: number;
  product_name?: string;
  photo_url?: string;
}): { isValid: boolean; error?: string } {
  if (!item.quantity || item.quantity <= 0) {
    return { isValid: false, error: "Item quantity must be greater than 0" };
  }

  if (!item.price_per_day || item.price_per_day <= 0) {
    return { isValid: false, error: "Item price per day must be greater than 0" };
  }

  if (!item.product_name || item.product_name.trim().length === 0) {
    return { isValid: false, error: "Item product name is required" };
  }

  if (!item.photo_url || item.photo_url.trim().length === 0) {
    return { isValid: false, error: "Item photo is required" };
  }

  if (item.photo_url.startsWith("blob:")) {
    return { isValid: false, error: "Item photo is still uploading. Please wait." };
  }

  return { isValid: true };
}

/**
 * Determines order status based on return state
 * Priority: completed > flagged > partially_returned > current status
 * 
 * @param items - Array of order items with return information
 * @returns Calculated order status
 */
export function determineOrderStatus(items: Array<{
  return_status?: string;
  returned_quantity?: number;
  quantity: number;
  damage_fee?: number;
  damage_description?: string;
}>, currentStatus: string): "completed" | "flagged" | "partially_returned" | string {
  // Check if all items are fully returned
  const allReturned = items.every((item) => {
    const returnedQty = item.returned_quantity ?? 0;
    return item.return_status === "returned" && returnedQty === item.quantity;
  });

  // Check for missing items
  const hasMissing = items.some((item) => item.return_status === "missing");

  // Check for items not yet returned
  const hasNotReturned = items.some((item) => {
    const returnedQty = item.returned_quantity ?? 0;
    return (!item.return_status || item.return_status === "not_yet_returned") && returnedQty === 0;
  });

  // Check for partial returns
  const hasPartialReturns = items.some((item) => {
    const returnedQty = item.returned_quantity ?? 0;
    return returnedQty > 0 && returnedQty < item.quantity;
  });

  // Check for damage
  const hasDamage = items.some((item) => {
    const damageFee = item.damage_fee ?? 0;
    return damageFee > 0 || (item.damage_description && item.damage_description.trim().length > 0);
  });

  // Priority 1: All items fully returned, no damage, no missing → completed
  if (allReturned && !hasPartialReturns && !hasDamage && !hasMissing) {
    return "completed";
  }

  // Priority 2: Any damage OR partial returns OR missing items → flagged
  if (hasDamage || hasPartialReturns || hasMissing) {
    return "flagged";
  }

  // Priority 3: Some items returned but no damage and no missing → partially_returned
  if (!hasNotReturned && !allReturned) {
    return "partially_returned";
  }

  // Priority 4: No items returned yet → keep current status
  return currentStatus;
}

