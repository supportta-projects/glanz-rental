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
  return `₹${safeAmount.toLocaleString("en-IN")}`;
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

