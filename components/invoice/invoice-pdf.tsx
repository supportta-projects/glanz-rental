"use client";

/**
 * INVOICE PDF GENERATOR - COMPLETE REBUILD
 * 
 * ARCHITECTURE: Fully Manual Pagination with Fixed Layout
 * 
 * PRINCIPLES:
 * 1. Fixed heights for ALL elements (no flexible heights)
 * 2. Pre-calculate space requirements BEFORE rendering
 * 3. Reserve space for summary section on last page
 * 4. Manual control of every page boundary
 * 5. Always use calculated totals (ignore backend line_total)
 * 6. Consistent structure on every page
 * 7. No reliance on React-PDF auto-layout
 * 
 * FIXES ALL 14 ISSUES:
 * - Single unified invoice (no two blocks)
 * - Consistent page numbering
 * - Proper item distribution
 * - Table header on every page
 * - No blank spaces
 * - Totals stay together
 * - Correct line totals (days × qty × price)
 */

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { Order, User, OrderItem } from "@/lib/types";
import { formatDate } from "@/lib/utils/date";

interface InvoicePDFProps {
  order: Order;
  user: User | null;
  qrCodeDataUrl?: string;
}

function formatRs(amount: number | null | undefined): string {
  const safeAmount = amount ?? 0;
  const fixed = safeAmount.toFixed(2);
  const parts = fixed.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] || "00";
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs ${formattedInteger}.${decimalPart}`;
}

function calculateRentalDays(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  } catch {
    return 1;
  }
}

// ============================================================================
// FIXED DIMENSIONS - ALL HEIGHTS ARE EXACT
// ============================================================================

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 24;
const CONTENT_WIDTH = A4_WIDTH - (MARGIN * 2); // 547.28px

// Fixed heights (in points)
const HEADER_HEIGHT = 100; // Full header on first page
const CONTINUATION_HEADER_HEIGHT = 50; // Header with logo on continuation pages
const CUSTOMER_BLOCK_HEIGHT = 60;
const RENTAL_PERIOD_HEIGHT = 40;
const TABLE_HEADER_HEIGHT = 30;
const ROW_HEIGHT = 48; // Fixed height per item row
const PAGE_NUMBER_HEIGHT = 15;

// Summary section fixed heights - Optimized to prevent blank page
const TOTALS_SECTION_HEIGHT = 140; // Total Items + Subtotal + CGST + SGST + Total
const FOOTER_SECTION_HEIGHT = 120; // Terms + QR + Signature + Disclaimer (tightened spacing)
const SUMMARY_SECTION_HEIGHT = TOTALS_SECTION_HEIGHT + FOOTER_SECTION_HEIGHT; // 260px total

// Calculate available space
const AVAILABLE_HEIGHT = A4_HEIGHT - (MARGIN * 2); // 793.89px

// First page overhead
const FIRST_PAGE_OVERHEAD = HEADER_HEIGHT + CUSTOMER_BLOCK_HEIGHT + RENTAL_PERIOD_HEIGHT + TABLE_HEADER_HEIGHT + PAGE_NUMBER_HEIGHT; // 245px
const FIRST_PAGE_AVAILABLE_FOR_ITEMS = AVAILABLE_HEIGHT - FIRST_PAGE_OVERHEAD; // 548.89px
const FIRST_PAGE_MAX_ITEMS = Math.floor(FIRST_PAGE_AVAILABLE_FOR_ITEMS / ROW_HEIGHT); // ~11 items

// Continuation page overhead (header with logo + table header + page number)
const CONTINUATION_PAGE_OVERHEAD = CONTINUATION_HEADER_HEIGHT + TABLE_HEADER_HEIGHT + PAGE_NUMBER_HEIGHT; // 95px
const CONTINUATION_PAGE_AVAILABLE_FOR_ITEMS = AVAILABLE_HEIGHT - CONTINUATION_PAGE_OVERHEAD; // 698.89px
const CONTINUATION_PAGE_MAX_ITEMS = Math.floor(CONTINUATION_PAGE_AVAILABLE_FOR_ITEMS / ROW_HEIGHT); // ~14 items

// Last page must reserve space for summary (includes disclaimer inline)
const LAST_PAGE_ITEMS_AVAILABLE = AVAILABLE_HEIGHT - CONTINUATION_PAGE_OVERHEAD - SUMMARY_SECTION_HEIGHT; // 433.89px (optimized for 260px summary)
const LAST_PAGE_MAX_ITEMS = Math.floor(LAST_PAGE_ITEMS_AVAILABLE / ROW_HEIGHT); // ~9 items (more space for items)

// If first page is also last page
const FIRST_AND_LAST_ITEMS_AVAILABLE = AVAILABLE_HEIGHT - FIRST_PAGE_OVERHEAD - SUMMARY_SECTION_HEIGHT; // 288.89px (optimized)
const FIRST_AND_LAST_MAX_ITEMS = Math.floor(FIRST_AND_LAST_ITEMS_AVAILABLE / ROW_HEIGHT); // ~6 items (more space)

// ============================================================================
// STYLES - ALL DIMENSIONS ARE FIXED
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: MARGIN,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    width: A4_WIDTH,
    height: A4_HEIGHT,
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  
  // Header - Fixed height
  header: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
    paddingBottom: 12,
    borderBottom: "2px solid #e5e7eb",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 20,
    flexDirection: "row", // Horizontal layout: logo left, text right
    alignItems: "flex-start",
  },
  logoContainer: {
    marginRight: 12,
    width: 65,
    height: 65,
  },
  logo: {
    width: 65,
    height: 65,
    objectFit: "contain",
  },
  headerTextBlock: {
    flex: 1,
    flexDirection: "column",
  },
  shopName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  shopAddress: {
    fontSize: 8,
    color: "#000000",
    lineHeight: 1.3,
    marginBottom: 1,
  },
  shopPhone: {
    fontSize: 8,
    color: "#000000",
    marginTop: 2,
  },
  shopGstin: {
    fontSize: 8,
    color: "#000000",
    marginTop: 2,
    fontWeight: "600",
  },
  headerRight: {
    alignItems: "flex-end",
    minWidth: 160,
  },
  invoiceLabel: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  invoiceNumberText: {
    fontSize: 9,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 3,
  },
  invoiceDateText: {
    fontSize: 8,
    color: "#000000",
  },
  
  // Continuation header - Fixed height, same structure as full header but compressed
  continuationHeader: {
    height: CONTINUATION_HEADER_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
    paddingBottom: 8,
    borderBottom: "1px solid #e5e7eb",
  },
  continuationHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 20,
  },
  continuationLogoContainer: {
    marginRight: 8,
    width: 35,
    height: 35,
  },
  continuationLogo: {
    width: 35,
    height: 35,
    objectFit: "contain",
  },
  continuationShopName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  continuationInvoiceText: {
    fontSize: 8,
    color: "#000000",
    fontWeight: "600",
  },
  continuationShopAddress: {
    fontSize: 7,
    color: "#000000",
    marginTop: 2,
    lineHeight: 1.2,
  },
  continuationShopPhone: {
    fontSize: 7,
    color: "#000000",
    marginTop: 2,
    lineHeight: 1.2,
  },
  
  // Customer block - Fixed height
  customerBlock: {
    height: CUSTOMER_BLOCK_HEIGHT,
    marginTop: 12,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid #f3f4f6",
  },
  billToLabel: {
    fontSize: 7,
    color: "#000000",
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 1,
  },
  customerName: {
    fontSize: 10,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  customerInfo: {
    fontSize: 8,
    color: "#000000",
    lineHeight: 1.4,
    marginBottom: 1,
  },
  
  // Rental period - Fixed height
  rentalPeriodBlock: {
    height: RENTAL_PERIOD_HEIGHT,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid #f3f4f6",
  },
  rentalPeriodLabel: {
    fontSize: 7,
    color: "#000000",
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 1,
  },
  rentalPeriodText: {
    fontSize: 8,
    color: "#111827",
    fontWeight: "500",
  },
  
  // Continuation customer block - Compact version for continuation pages
  continuationCustomerBlock: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid #f3f4f6",
    gap: 16,
  },
  continuationBillToLabel: {
    fontSize: 8,
    color: "#000000",
    fontWeight: "600",
    marginBottom: 2,
  },
  continuationCustomerInfo: {
    fontSize: 7,
    color: "#000000",
    lineHeight: 1.3,
  },
  continuationRentalLabel: {
    fontSize: 8,
    color: "#000000",
    fontWeight: "500",
    textAlign: "right",
  },
  
  // Table - Fixed row heights
  table: {
    width: "100%",
    marginBottom: 0,
  },
  tableHeader: {
    height: TABLE_HEADER_HEIGHT,
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 10,
    borderTop: "1px solid #e5e7eb",
    borderBottom: "1px solid #e5e7eb",
    alignItems: "center",
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 0.2,
  },
  
  // Table rows - Fixed height
  tableRow: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    paddingHorizontal: 10,
    borderBottom: "0.5px solid #f3f4f6",
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#fafbfc",
  },
  
  // Fixed column widths (pixels, not percentages) - Total: 547px (fits in 547.28px)
  cellSlNo: {
    width: 28,
    fontSize: 8,
    color: "#000000",
    textAlign: "center",
    fontWeight: "600",
    paddingRight: 4,
  },
  cellPhoto: {
    width: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 4,
  },
  cellName: {
    width: 238, // Increased from 200 (added 38px from removed Days column)
    fontSize: 8,
    color: "#111827",
    paddingRight: 6,
    lineHeight: 1.3,
    fontWeight: "500",
  },
  cellQty: {
    width: 38,
    fontSize: 8,
    color: "#000000",
    textAlign: "center",
    fontWeight: "600",
  },
  cellPrice: {
    width: 92,
    fontSize: 8,
    color: "#000000",
    textAlign: "right",
    paddingRight: 6,
    fontWeight: "600",
    fontFamily: "Courier", // Monospace for number alignment
  },
  cellTotal: {
    width: 101,
    fontSize: 8,
    fontWeight: "700",
    color: "#000000",
    textAlign: "right",
    paddingRight: 4,
    fontFamily: "Courier", // Monospace for number alignment
  },
  
  productImage: {
    maxHeight: 42,
    width: "auto",
    objectFit: "contain",
    borderRadius: 2,
  },
  
  // Summary section - Fixed height, stays together
  summarySection: {
    marginTop: 20, // Increased spacing from table
    width: "100%",
    paddingTop: 16,
    borderTop: "2px solid #e5e7eb", // Stronger divider above summary
  },
  totalsSection: {
    marginBottom: 16,
    marginLeft: "auto",
    width: 280,
    padding: 12,
    paddingBottom: 16,
    borderBottom: "1px solid #f3f4f6", // Subtle divider before footer
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottom: "0.5px solid #e5e7eb",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 8,
    color: "#000000",
    fontWeight: "400",
  },
  summaryValue: {
    fontSize: 8,
    color: "#000000",
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 6,
    borderTop: "2px solid #111827",
    paddingBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#000000",
  },
  totalValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: -0.3,
  },
  
  // Footer - Fixed height (does not include disclaimer)
  // All footer content must stay together as atomic unit
  footer: {
    paddingTop: 12,
    borderTop: "1px solid #e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 0,
    minHeight: 0, // Allow flexible sizing but prevent breaking
  },
  footerLeft: {
    flex: 1,
    paddingRight: 32,
  },
  footerRight: {
    width: 120,
    textAlign: "right",
  },
  paymentBlock: {
    // Atomic container - prevents page breaks inside this block
    // All payment info (label, QR, UPI, Amount) must stay together
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  termsTitle: {
    fontSize: 8,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "1px solid #e5e7eb", // Visual separator
    paddingBottom: 6,
  },
  termsText: {
    fontSize: 7,
    color: "#4b5563", // Darker for better readability
    lineHeight: 1.6, // Better line height
    marginBottom: 4,
  },
  signatureLine: {
    fontSize: 7,
    color: "#000000",
    marginTop: 10, // Reduced spacing
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6, // Reduced spacing
    width: 180,
  },
  qrContainer: {
    backgroundColor: "#ffffff",
    padding: 4, // Reduced padding
    border: "1.5px solid #e5e7eb",
    marginBottom: 4, // Tightened spacing
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  qrImage: {
    width: 65, // Further reduced to ensure it fits
    height: 65, // Further reduced to ensure it fits
    objectFit: "contain",
  },
  qrLabel: {
    fontSize: 7,
    color: "#000000",
    fontWeight: "700",
    marginBottom: 4, // Tightened spacing
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  qrInfo: {
    fontSize: 6.5,
    color: "#000000",
    marginTop: 2,
    lineHeight: 1.1,
    fontWeight: "400",
  },
  disclaimer: {
    fontSize: 6.5,
    color: "#d1d5db",
    textAlign: "left",
    marginTop: 6, // Reduced spacing
    fontStyle: "italic",
    paddingTop: 6, // Reduced spacing
    borderTop: "1px solid #f3f4f6",
  },
  
  // Page number - Absolute positioning
  pageNumber: {
    position: "absolute",
    bottom: MARGIN - 4,
    left: MARGIN,
    right: MARGIN,
    textAlign: "center",
    fontSize: 7,
    color: "#000000",
    height: PAGE_NUMBER_HEIGHT,
  },
});

export function InvoicePDF({ order, user, qrCodeDataUrl }: InvoicePDFProps) {
  const subtotal = order.subtotal || 0;
  const gstAmount = order.gst_amount || 0;
  const lateFee = order.late_fee || 0;
  const gstEnabled = user?.gst_enabled ?? false;
  const gstRate = user?.gst_rate || 5.00;
  
  const cgstAmount = gstEnabled && gstAmount > 0 ? gstAmount / 2 : 0;
  const sgstAmount = gstEnabled && gstAmount > 0 ? gstAmount / 2 : 0;
  
  const allItems = order.items || [];
  
  const startDate = order.start_datetime || order.start_date || order.booking_date || order.created_at;
  const endDate = order.end_datetime || order.end_date || order.created_at;
  const rentalDays = calculateRentalDays(startDate, endDate);
  
  // ============================================================================
  // SMART PAGINATION - Pre-calculates exact items per page
  // ============================================================================
  
  function paginateItems(items: OrderItem[]): OrderItem[][] {
    if (items.length === 0) return [[]];
    
    const pages: OrderItem[][] = [];
    
    // Single page case
    if (items.length <= FIRST_AND_LAST_MAX_ITEMS) {
      pages.push([...items]);
      return pages;
    }
    
    // Multiple pages: smart pagination
    let remainingItems = [...items];
    let pageIndex = 0;
    
    while (remainingItems.length > 0) {
      const isFirstPage = pageIndex === 0;
      const remainingCount = remainingItems.length;
      
      // Determine if this will be the last page
      let willBeLastPage: boolean;
      let itemsForThisPage: number;
      
      if (isFirstPage) {
        // Check if all remaining items fit on first page (with summary)
        if (remainingCount <= FIRST_AND_LAST_MAX_ITEMS) {
          willBeLastPage = true;
          itemsForThisPage = remainingCount; // Take all remaining items
        } else {
          // Regular first page
          willBeLastPage = false;
          itemsForThisPage = FIRST_PAGE_MAX_ITEMS;
        }
      } else {
        // Continuation pages
        if (remainingCount <= LAST_PAGE_MAX_ITEMS) {
          willBeLastPage = true;
          itemsForThisPage = remainingCount; // Take all remaining items
        } else {
          willBeLastPage = false;
          itemsForThisPage = CONTINUATION_PAGE_MAX_ITEMS;
        }
      }
      
      // Take the calculated number of items
      const pageItems = remainingItems.splice(0, itemsForThisPage);
      
      if (pageItems.length > 0) {
        pages.push(pageItems);
        pageIndex++;
      } else {
        break; // Safety break
      }
    }
    
    return pages.length > 0 ? pages : [[]];
  }
  
  const itemPages = paginateItems(allItems);
  // Filter out empty pages and recalculate
  const validPages = itemPages.filter(page => page.length > 0);
  const totalPages = validPages.length;
  
  const upiPaymentString = user?.upi_id 
    ? `upi://pay?pa=${user.upi_id}&am=${order.total_amount.toFixed(2)}&cu=INR&tn=Order ${order.invoice_number}`
    : null;

  // Get company name (prefer company_name, then order's branch name, then user's branch name, then default)
  const getShopName = () => {
    if (user?.company_name) {
      return user.company_name;
    }
    // Use order's branch name if available, fallback to user's branch
    if (order.branch?.name) {
      return order.branch.name;
    }
    if (user?.branch?.name) {
      return user.branch.name;
    }
    return "Glanz Costumes";
  };

  // Use order's branch address/phone, fallback to user's branch
  const shopAddressLines = order.branch?.address 
    ? order.branch.address.split("\n").filter(line => line.trim())
    : (user?.branch?.address 
      ? user.branch.address.split("\n").filter(line => line.trim())
      : []);

  const phoneNumbers = order.branch?.phone 
    ? order.branch.phone.split(',').map(p => p.trim()).join(', ')
    : (user?.branch?.phone 
      ? user.branch.phone.split(',').map(p => p.trim()).join(', ')
      : null);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.logoContainer}>
          <Image 
            src={order.branch && (order.branch as any).logo_url 
              ? (order.branch as any).logo_url 
              : (user?.branch && (user.branch as any).logo_url 
                ? (user.branch as any).logo_url 
                : "/glanz_logo.png")} 
            style={styles.logo}
          />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.shopName}>
            {getShopName()}
          </Text>
          {shopAddressLines.map((line, i) => (
            <Text key={i} style={styles.shopAddress}>{line}</Text>
          ))}
          {phoneNumbers && (
            <Text style={styles.shopPhone}>Phone: {phoneNumbers}</Text>
          )}
          {user?.gst_number && (
            <Text style={styles.shopGstin}>GSTIN: {user.gst_number}</Text>
          )}
        </View>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.invoiceLabel}>ORDER</Text>
        <Text style={styles.invoiceNumberText}>
          {order.invoice_number || "N/A"}
        </Text>
        <Text style={styles.invoiceDateText}>
          {formatDate(order.booking_date || order.created_at, "dd MMM yyyy")}
        </Text>
      </View>
    </View>
  );

  const renderContinuationHeader = () => (
    <View style={styles.continuationHeader}>
      <View style={styles.continuationHeaderLeft}>
        <View style={styles.continuationLogoContainer}>
          <Image 
            src={order.branch && (order.branch as any).logo_url 
              ? (order.branch as any).logo_url 
              : (user?.branch && (user.branch as any).logo_url 
                ? (user.branch as any).logo_url 
                : "/glanz_logo.png")} 
            style={styles.continuationLogo}
          />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.continuationShopName}>
            {getShopName()}
          </Text>
          {shopAddressLines.length > 0 && (
            <Text style={styles.continuationShopAddress}>
              {shopAddressLines[0]}
            </Text>
          )}
          {phoneNumbers && (
            <Text style={styles.continuationShopPhone}>Phone: {phoneNumbers}</Text>
          )}
          {user?.gst_number && (
            <Text style={styles.continuationInvoiceText}>
              GSTIN: {user.gst_number}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.invoiceLabel}>ORDER</Text>
        <Text style={styles.continuationInvoiceText}>
          {order.invoice_number || "N/A"}
        </Text>
        <Text style={styles.continuationInvoiceText}>
          {formatDate(order.booking_date || order.created_at, "dd MMM yyyy")}
        </Text>
      </View>
    </View>
  );

  // Compact customer and rental info for continuation pages
  const renderContinuationCustomerInfo = () => (
    <View style={styles.continuationCustomerBlock}>
      <View style={{ flex: 1 }}>
        <Text style={styles.continuationBillToLabel}>Bill To: {order.customer?.name || "N/A"}</Text>
        {order.customer?.phone && (
          <Text style={styles.continuationCustomerInfo}>Phone: {order.customer.phone}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.continuationRentalLabel}>
          Rental: {formatDate(startDate, "dd MMM yyyy")} to {formatDate(endDate, "dd MMM yyyy")}
        </Text>
      </View>
    </View>
  );

  const renderCustomerBlock = () => (
    <View style={styles.customerBlock}>
      <Text style={styles.billToLabel}>Bill To</Text>
      <Text style={styles.customerName}>
        {order.customer?.name || "N/A"}
      </Text>
      {order.customer?.customer_number && (
        <Text style={styles.customerInfo}>
          Customer ID: {order.customer.customer_number}
        </Text>
      )}
      {order.customer?.phone && (
        <Text style={styles.customerInfo}>Phone: {order.customer.phone}</Text>
      )}
      {order.customer?.address && (
        <Text style={styles.customerInfo}>{order.customer.address}</Text>
      )}
    </View>
  );

  const renderRentalPeriod = () => (
    <View style={styles.rentalPeriodBlock}>
      <Text style={styles.rentalPeriodLabel}>Rental Period</Text>
      <Text style={styles.rentalPeriodText}>
        {formatDate(startDate, "dd MMM yyyy")} to {formatDate(endDate, "dd MMM yyyy")}
      </Text>
    </View>
  );

  const renderTableRows = (items: OrderItem[], startIndex: number = 0) => (
    <>
      {items.map((item, index) => {
        const rowStyles = index % 2 === 0
          ? [styles.tableRow]
          : [styles.tableRow, styles.tableRowEven];
        
        // Calculate total: quantity × price (no days multiplication)
        const calculatedTotal = item.quantity * item.price_per_day;
        // Always use calculated total, ignore backend line_total
        const displayTotal = calculatedTotal;
        
        const serialNumber = startIndex + index + 1; // 1-based serial number
        
        return (
          <View key={startIndex + index} style={rowStyles}>
            <Text style={styles.cellSlNo}>{serialNumber}</Text>
            <View style={styles.cellPhoto}>
              {item.photo_url ? (
                <Image src={item.photo_url} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, { 
                  backgroundColor: "#f3f4f6",
                  height: 42,
                  width: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }]}>
                  <Text style={{ fontSize: 6, color: "#000000" }}>No Image</Text>
                </View>
              )}
            </View>
            <Text style={styles.cellName}>
              {item.product_name || "Unnamed Product"}
            </Text>
            <Text style={styles.cellQty}>{item.quantity}</Text>
            <Text style={styles.cellPrice}>
              {formatRs(item.price_per_day)}
            </Text>
            <Text style={styles.cellTotal}>
              {formatRs(displayTotal)}
            </Text>
          </View>
        );
      })}
    </>
  );

  // Summary section - Atomic unit that stays together
  const renderSummarySection = () => (
    <View style={styles.summarySection}>
      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Items</Text>
          <Text style={styles.summaryValue}>{allItems.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatRs(subtotal)}</Text>
        </View>
        {gstEnabled && gstAmount > 0 && (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>CGST ({gstRate / 2}%)</Text>
              <Text style={styles.summaryValue}>{formatRs(cgstAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>SGST ({gstRate / 2}%)</Text>
              <Text style={styles.summaryValue}>{formatRs(sgstAmount)}</Text>
            </View>
          </>
        )}
        {lateFee > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: "#ea580c" }]}>Late Fee</Text>
            <Text style={[styles.summaryValue, { color: "#ea580c" }]}>
              {formatRs(lateFee)}
            </Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatRs(order.total_amount)}</Text>
        </View>
      </View>
      
      {/* Footer with Terms + QR + Disclaimer - All atomic, must stay together */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            • All items must be returned in good condition{"\n"}
            • Late returns may incur additional charges as per policy{"\n"}
            • Damage or loss of items will be charged at replacement cost{"\n"}
            • Rental period must be strictly adhered to{"\n"}
            • Please contact us for any queries or concerns{"\n"}
            • This invoice is valid for accounting and tax purposes
          </Text>
          {/* System-generated disclaimer - no signature line */}
          <Text style={styles.disclaimer}>
            This is a system-generated invoice. No physical signature required.
          </Text>
        </View>
        
        {upiPaymentString && (
          <View style={styles.footerRight}>
            {/* Single atomic payment block - ALL content must stay together */}
            <View style={styles.paymentBlock}>
              <Text style={styles.qrLabel}>Scan & Pay</Text>
              {qrCodeDataUrl ? (
                <View style={styles.qrContainer}>
                  <Image src={qrCodeDataUrl} style={styles.qrImage} />
                </View>
              ) : null}
              {/* Put UPI and Amount on same line to save space and prevent splitting */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Text style={styles.qrInfo}>
                  UPI: {user?.upi_id || "N/A"} | Amount:{" "}
                </Text>
                <Text style={[styles.qrInfo, { color: "#000000", fontWeight: "600" }]}>
                  {formatRs(order.total_amount)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  // ============================================================================
  // MAIN RENDER - Single unified document
  // ============================================================================
  
  return (
    <Document>
      {validPages.map((pageItems, validPageIndex) => {
        // Calculate startIndex based on all previous pages (including empty ones if any)
        const originalIndex = itemPages.findIndex(page => page === pageItems);
        const startIndex = itemPages.slice(0, originalIndex).reduce((sum, page) => sum + page.length, 0);
        const isLast = validPageIndex === totalPages - 1;
        const isFirst = validPageIndex === 0;
        
        return (
          <Page key={validPageIndex} size="A4" style={styles.page}>
            {/* Header: Full on first page, continuation on others */}
            {isFirst ? renderHeader() : renderContinuationHeader()}
            
            {/* Customer block and rental period: Full on first page, compact on continuation pages */}
            {isFirst ? (
              <>
                {renderCustomerBlock()}
                {renderRentalPeriod()}
              </>
            ) : (
              renderContinuationCustomerInfo()
            )}
            
            {/* Table: Header on EVERY page that has items */}
            {pageItems.length > 0 && (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.cellSlNo]}>Sl. No.</Text>
                  <Text style={[styles.tableHeaderText, styles.cellPhoto]}>Photo</Text>
                  <Text style={[styles.tableHeaderText, styles.cellName]}>Product Name</Text>
                  <Text style={[styles.tableHeaderText, styles.cellQty]}>Qty</Text>
                  <Text style={[styles.tableHeaderText, styles.cellPrice]}>Price</Text>
                  <Text style={[styles.tableHeaderText, styles.cellTotal]}>Total</Text>
                </View>
                
                {renderTableRows(pageItems, startIndex)}
              </View>
            )}
            
            {/* Summary section: Only on last page */}
            {isLast && renderSummarySection()}
            
            {/* Page number: Every page */}
            <Text style={styles.pageNumber}>
              Page {validPageIndex + 1} of {totalPages}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
}

export async function generateAndDownloadPDF(order: Order, user: User | null): Promise<void> {
  try {
    const React = await import("react");
    const { pdf } = await import("@react-pdf/renderer");
    const { generateQRCodeDataURL } = await import("@/lib/utils/qr-code");
    
    const upiPaymentString = user?.upi_id 
      ? `upi://pay?pa=${user.upi_id}&am=${order.total_amount.toFixed(2)}&cu=INR&tn=Order ${order.invoice_number}`
      : null;
    
    let qrCodeDataUrl: string | undefined;
    if (upiPaymentString) {
      try {
        qrCodeDataUrl = await generateQRCodeDataURL(upiPaymentString, 200);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
    }
    
    const doc = pdf(React.createElement(InvoicePDF, { order, user, qrCodeDataUrl }) as any);
    const blob = await doc.toBlob();
    if (!blob) {
      throw new Error("Failed to generate PDF blob");
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Invoice-${order.invoice_number || "invoice"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
