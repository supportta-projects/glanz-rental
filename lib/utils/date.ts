import { format, differenceInDays, isAfter, isBefore, startOfDay } from "date-fns";

export function formatDate(date: string | Date, formatStr: string = "dd MMM yyyy"): string {
  return format(new Date(date), formatStr);
}

export function formatDateTime(date: string | Date, includeTime: boolean = true): string {
  const dateObj = new Date(date);
  if (includeTime) {
    return format(dateObj, "dd MMM yyyy, hh:mm a");
  }
  return format(dateObj, "dd MMM yyyy");
}

export function calculateDays(startDate: string | Date, endDate: string | Date): number {
  return differenceInDays(new Date(endDate), new Date(startDate)) + 1;
}

export function isOverdue(endDate: string | Date): boolean {
  const today = startOfDay(new Date());
  const end = startOfDay(new Date(endDate));
  return isAfter(today, end);
}

export function getOrderStatus(
  startDate: string,
  endDate: string,
  currentStatus: string
): "active" | "pending_return" | "completed" {
  if (currentStatus === "completed") {
    return "completed";
  }

  const today = startOfDay(new Date());
  const start = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate));

  if (isAfter(today, end)) {
    return "pending_return";
  }

  if (isBefore(today, start) || (today >= start && today <= end)) {
    return "active";
  }

  return "active";
}

export function formatCurrency(amount: number | null | undefined): string {
  const safeAmount = amount ?? 0;
  // Format with clean number formatting - avoid any locale-specific formatting that may add superscripts
  // Use simple toFixed and manual comma insertion for guaranteed clean output
  const fixed = safeAmount.toFixed(2);
  const parts = fixed.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] || "00";
  
  // Add commas for thousands (US style, clean and simple)
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  return `₹${formattedInteger}.${decimalPart}`;
}

/**
 * Format currency with Indian numbering system abbreviations (K, L, Cr)
 * Shows 2 decimal places and formats large numbers compactly
 * 
 * @param amount - The amount to format
 * @returns Formatted string like ₹60.83K, ₹1.25L, ₹2.50Cr
 * 
 * @example
 * ```ts
 * formatCurrencyCompact(60825.38) // "₹60.83K"
 * formatCurrencyCompact(125000) // "₹1.25L"
 * formatCurrencyCompact(25000000) // "₹2.50Cr"
 * ```
 */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  const safeAmount = amount ?? 0;
  
  if (safeAmount === 0) {
    return "₹0";
  }
  
  // Crore (1,00,00,000)
  if (safeAmount >= 10000000) {
    const crores = safeAmount / 10000000;
    return `₹${crores.toFixed(2)}Cr`;
  }
  
  // Lakh (1,00,000)
  if (safeAmount >= 100000) {
    const lakhs = safeAmount / 100000;
    return `₹${lakhs.toFixed(2)}L`;
  }
  
  // Thousand (1,000)
  if (safeAmount >= 1000) {
    const thousands = safeAmount / 1000;
    return `₹${thousands.toFixed(2)}K`;
  }
  
  // Less than 1000, show with 2 decimal places
  return `₹${safeAmount.toFixed(2)}`;
}

/**
 * Check if order is late (returned after end date)
 */
export function isOrderLate(endDate: string | Date): boolean {
  const now = new Date();
  const end = new Date(endDate);
  return now > end;
}

/**
 * Check if order is a booking (scheduled for future - tomorrow or later)
 * A booking is an order that starts after today (not including today)
 * 
 * @param startDate - The start date of the order (string or Date)
 * @returns true if the order starts after today, false otherwise
 * 
 * @example
 * ```ts
 * isBooking("2024-01-15") // true if today is before Jan 15, 2024
 * isBooking(new Date("2024-01-15")) // true if today is before Jan 15, 2024
 * ```
 */
export function isBooking(startDate: string | Date): boolean {
  const today = startOfDay(new Date());
  const start = startOfDay(new Date(startDate));
  return isAfter(start, today);
}

