/**
 * Centralized Color System for Glanz Rental
 * 
 * All theme colors are defined here. Update these values to change
 * the entire application theme at once.
 */

export const COLORS = {
  // Primary Brand Colors
  primary: "#273492",
  primaryHover: "#1f2a7a",
  primaryLight: "#27349210", // 10% opacity
  primaryMedium: "#27349230", // 30% opacity
  primaryDark: "#1a2566",

  // Secondary Brand Colors
  secondary: "#e7342f",
  secondaryHover: "#d12a26",
  secondaryLight: "#e7342f10", // 10% opacity
  secondaryMedium: "#e7342f30", // 30% opacity

  // Status Colors
  success: "#0f9d58",
  successLight: "#d1fae5",
  successText: "#065f46",

  warning: "#d97706",
  warningLight: "#fef3c7",
  warningText: "#92400e",

  error: "#e7342f",
  errorLight: "#fee2e2",
  errorText: "#991b1b",

  // Neutral Colors
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
} as const;

/**
 * Tailwind-compatible color classes
 * Use these in className strings
 */
export const COLOR_CLASSES = {
  primary: "bg-[#273492]",
  primaryHover: "hover:bg-[#1f2a7a]",
  primaryText: "text-[#273492]",
  primaryTextHover: "hover:text-[#1f2a7a]",
  primaryBorder: "border-[#273492]",
  primaryBorderHover: "hover:border-[#1f2a7a]",
  primaryLight: "bg-[#273492]/10",
  primaryMedium: "bg-[#273492]/30",
  primaryRing: "ring-[#273492]",
  primaryFocus: "focus:ring-[#273492]",

  secondary: "bg-[#e7342f]",
  secondaryHover: "hover:bg-[#d12a26]",
  secondaryText: "text-[#e7342f]",
  secondaryTextHover: "hover:text-[#d12a26]",
  secondaryBorder: "border-[#e7342f]",
  secondaryLight: "bg-[#e7342f]/10",
} as const;

/**
 * Order Status Badge Colors
 */
export const ORDER_STATUS_COLORS = {
  scheduled: {
    bg: "bg-[#273492]",
    text: "text-white",
    border: "border-[#273492]",
  },
  active: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
  },
  ongoing: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
  },
  pending_return: {
    bg: "bg-[#e7342f]/10",
    text: "text-[#e7342f]",
    border: "border-[#e7342f]/20",
  },
  completed: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
  },
  returned: {
    bg: "bg-[#273492]",
    text: "text-white",
    border: "border-[#273492]",
  },
  partially_returned: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  cancelled: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
  },
  late: {
    bg: "bg-[#e7342f]/10",
    text: "text-[#e7342f]",
    border: "border-[#e7342f]/20",
  },
} as const;

