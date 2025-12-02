"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { Order, User } from "@/lib/types";
import { formatDate } from "@/lib/utils/date";

interface InvoicePDFProps {
  order: Order;
  user: User | null;
  qrCodeDataUrl?: string; // Pre-generated QR code data URL
}

// Format currency number only (without symbol) to avoid superscript issues in react-pdf
function formatCurrencyNumber(amount: number | null | undefined): string {
  const safeAmount = amount ?? 0;
  const fixed = safeAmount.toFixed(2);
  const parts = fixed.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] || "00";
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${formattedInteger}.${decimalPart}`;
}

// A4 dimensions in points (1 point = 1/72 inch)
// A4 = 210mm x 297mm = 595.28pt x 841.89pt
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 16; // Compact margins to fit everything on one page

// Professional, accountant-grade invoice styles
const styles = StyleSheet.create({
  page: {
    padding: MARGIN,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    width: A4_WIDTH,
    height: A4_HEIGHT, // Fixed height to ensure single page
    display: "flex",
    flexDirection: "column",
  },
  // Header Section - Clean Minimalist Design
  header: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: "1px solid #d1d5db",
  },
  logoContainer: {
    width: 56,
    height: 56,
    marginRight: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 56,
    height: 56,
    objectFit: "contain",
  },
  headerText: {
    flex: 1,
  },
  shopName: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
    lineHeight: 1.2,
    letterSpacing: -0.5,
  },
  shopAddress: {
    fontSize: 8.5,
    color: "#6b7280",
    lineHeight: 1.6,
    marginBottom: 3,
  },
  shopPhone: {
    fontSize: 8.5,
    color: "#6b7280",
    marginTop: 4,
  },
  invoiceLabelContainer: {
    width: 140,
    alignItems: "flex-end",
    paddingLeft: 24,
    textAlign: "right",
  },
  invoiceLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  invoiceNumberText: {
    fontSize: 9.5,
    color: "#374151",
    fontWeight: "500",
    marginBottom: 6,
  },
  invoiceDateText: {
    fontSize: 8.5,
    color: "#9ca3af",
    fontWeight: "400",
  },
  // Customer & Invoice Details Section - Clean
  detailsSection: {
    flexDirection: "row",
    marginTop: 14,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottom: "1px solid #e5e7eb",
  },
  customerDetails: {
    flex: 1,
    paddingRight: 15,
  },
  sectionLabel: {
    fontSize: 7,
    color: "#9ca3af",
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  customerName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 5,
  },
  customerInfo: {
    fontSize: 8.5,
    color: "#6b7280",
    lineHeight: 1.6,
    marginBottom: 3,
  },
  // Products Table - Clean Design
  table: {
    marginTop: 14,
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottom: "1px solid #e5e7eb",
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: "600",
    color: "#374151",
    letterSpacing: 0.2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottom: "1px solid #f3f4f6",
    minHeight: 45,
  },
  tableRowEven: {
    backgroundColor: "#ffffff",
  },
  // Table Cell Widths: S.No: 5%, Photo: 10%, Name: 35%, Qty: 8%, Price: 21%, Total: 21%
  cellSNo: { 
    width: "5%", 
    fontSize: 8, 
    color: "#9ca3af", 
    textAlign: "center",
    paddingRight: 2,
  },
  cellPhoto: { 
    width: "10%", 
    paddingRight: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cellName: { 
    width: "35%", 
    fontSize: 8.5, 
    color: "#111827", 
    paddingRight: 4,
    lineHeight: 1.5,
    fontWeight: "500",
  },
  cellQty: { 
    width: "8%", 
    fontSize: 8.5, 
    color: "#374151", 
    textAlign: "center",
    paddingRight: 2,
    fontWeight: "500",
  },
  cellPrice: { 
    width: "21%", 
    fontSize: 8.5, 
    color: "#6b7280", 
    textAlign: "right", 
    paddingRight: 4,
    fontFamily: "Helvetica",
    textRendering: "optimizeLegibility",
  },
  cellTotal: { 
    width: "21%", 
    fontSize: 9, 
    fontWeight: "600", 
    color: "#111827", 
    textAlign: "right",
    fontFamily: "Helvetica",
    textRendering: "optimizeLegibility",
  },
  productImage: {
    width: 40,
    height: 40,
    objectFit: "contain",
    borderRadius: 3,
  },
  // Summary Section - Clean Professional
  summary: {
    marginTop: 12,
    marginLeft: "auto",
    width: 270,
    padding: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottom: "1px solid #e5e7eb",
    marginBottom: 8,
    paddingBottom: 8,
  },
  summaryLabel: {
    fontSize: 8.5,
    color: "#6b7280",
    fontWeight: "400",
  },
  summaryValue: {
    fontSize: 8.5,
    color: "#111827",
    fontWeight: "500",
    fontFamily: "Helvetica",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 10,
    borderTop: "2px solid #111827",
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Helvetica",
    textRendering: "optimizeLegibility",
    letterSpacing: -0.5,
  },
  // Footer Section - Clean Design
  footer: {
    marginTop: "auto",
    paddingTop: 16,
    borderTop: "1px solid #e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    minHeight: 110,
  },
  footerLeft: {
    flex: 1,
    paddingRight: 32,
  },
  footerRight: {
    width: 120,
    textAlign: "right",
    padding: 10,
  },
  termsTitle: {
    fontSize: 7.5,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  termsText: {
    fontSize: 7.5,
    color: "#6b7280",
    lineHeight: 1.7,
    marginBottom: 4,
  },
  signatureLine: {
    fontSize: 7.5,
    color: "#9ca3af",
    marginTop: 20,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 12,
    width: 180,
  },
  qrContainer: {
    backgroundColor: "#ffffff",
    padding: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  qrImage: {
    width: 85,
    height: 85,
    objectFit: "contain",
  },
  qrLabel: {
    fontSize: 7.5,
    color: "#9ca3af",
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  qrInfo: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 6,
    lineHeight: 1.5,
    fontWeight: "400",
  },
  disclaimer: {
    fontSize: 7,
    color: "#d1d5db",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
    paddingTop: 16,
    borderTop: "1px solid #f3f4f6",
  },
});

export function InvoicePDF({ order, user, qrCodeDataUrl }: InvoicePDFProps) {
  const subtotal = order.subtotal || 0;
  const gstAmount = order.gst_amount || 0;
  const lateFee = order.late_fee || 0;
  const gstEnabled = user?.gst_enabled ?? false;
  const gstRate = user?.gst_rate || 5.00;
  
  // Limit items to 12 per page (professional standard)
  const displayItems = (order.items || []).slice(0, 12);
  const hasMoreItems = (order.items || []).length > 12;
  
  // Generate UPI payment string
  const upiPaymentString = user?.upi_id 
    ? `upi://pay?pa=${user.upi_id}&am=${order.total_amount.toFixed(2)}&cu=INR&tn=Order ${order.invoice_number}`
    : null;

  // Format shop address (handle multi-line)
  const shopAddressLines = user?.branch?.address 
    ? user.branch.address.split("\n").filter(line => line.trim())
    : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.header}>
          {/* Logo Area (Top Left) */}
          <View style={styles.logoContainer}>
            <Image 
              src={user?.branch && (user.branch as any).logo_url 
                ? (user.branch as any).logo_url 
                : "/glanz_logo.png"} 
              style={styles.logo}
            />
          </View>
          
          {/* Shop Name & Address */}
          <View style={styles.headerText}>
            <Text style={styles.shopName}>
              {user?.branch?.name || "GLANZ RENTAL"}
            </Text>
            {shopAddressLines.length > 0 && (
              <>
                {shopAddressLines.map((line, i) => (
                  <Text key={i} style={styles.shopAddress}>
                    {line}
                  </Text>
                ))}
              </>
            )}
            {user?.branch?.phone && (
              <>
                {user.branch.phone.split(',').map((phone, index) => (
                  <Text key={index} style={styles.shopPhone}>
                    {index === 0 ? 'Phone: ' : ''}{phone.trim()}
                  </Text>
                ))}
              </>
            )}
          </View>

          {/* Invoice Label & Details (Top Right) */}
          <View style={styles.invoiceLabelContainer}>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceNumberText}>
              {order.invoice_number || "N/A"}
            </Text>
            <Text style={styles.invoiceDateText}>
              {formatDate(order.booking_date || order.created_at, "dd MMM yyyy")}
            </Text>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.detailsSection}>
          <View style={styles.customerDetails}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.customerName}>
              {order.customer?.name || "N/A"}
            </Text>
            {order.customer?.phone && (
              <Text style={styles.customerInfo}>
                Phone: {order.customer.phone}
              </Text>
            )}
            {order.customer?.address && (
              <Text style={styles.customerInfo}>
                {order.customer.address}
              </Text>
            )}
          </View>
        </View>

        {/* Products Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.cellSNo]}>S.No</Text>
            <Text style={[styles.tableHeaderText, styles.cellPhoto]}>Photo</Text>
            <Text style={[styles.tableHeaderText, styles.cellName]}>Product Name</Text>
            <Text style={[styles.tableHeaderText, styles.cellQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.cellPrice]}>Per Day Price</Text>
            <Text style={[styles.tableHeaderText, styles.cellTotal]}>Total</Text>
          </View>

          {/* Table Rows - Fixed height container */}
          <View style={{ maxHeight: 320 }}>
            {displayItems.map((item, index) => {
              const rowStyles = index % 2 === 1 
                ? [styles.tableRow, styles.tableRowEven]
                : [styles.tableRow];
              
              return (
              <View 
                key={index} 
                style={rowStyles}
              >
                <Text style={styles.cellSNo}>{index + 1}</Text>
                <View style={styles.cellPhoto}>
                  {item.photo_url ? (
                    <Image
                      src={item.photo_url}
                      style={styles.productImage}
                    />
                  ) : (
                    <View style={[styles.productImage, { 
                      backgroundColor: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }]}>
                      <Text style={{ fontSize: 6, color: "#9ca3af" }}>No Image</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cellName}>
                  {item.product_name || "Unnamed Product"}
                </Text>
                <Text style={styles.cellQty}>{item.quantity}</Text>
                <Text style={styles.cellPrice}>
                  {`Rs. ${formatCurrencyNumber(item.price_per_day)}`}
                </Text>
                <Text style={styles.cellTotal}>
                  {`Rs. ${formatCurrencyNumber(item.line_total)}`}
                </Text>
              </View>
              );
            })}
            
            {/* Warning if more than 12 items */}
            {hasMoreItems && (
              <View style={[styles.tableRow, { backgroundColor: "#fef3c7", paddingVertical: 4 }]}>
                <Text style={[styles.cellName, { width: "100%", textAlign: "center", fontSize: 7, color: "#92400e" }]}>
                  * Additional {order.items!.length - 12} item(s) not shown. Please refer to order details.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>
              {`Rs. ${formatCurrencyNumber(subtotal)}`}
            </Text>
          </View>
          {gstEnabled && gstAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST ({gstRate}%):</Text>
              <Text style={styles.summaryValue}>
                {`Rs. ${formatCurrencyNumber(gstAmount)}`}
              </Text>
            </View>
          )}
          {lateFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#ea580c" }]}>Late Fee:</Text>
              <Text style={[styles.summaryValue, { color: "#ea580c" }]}>
                {`Rs. ${formatCurrencyNumber(lateFee)}`}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>
              {`Rs. ${formatCurrencyNumber(order.total_amount)}`}
            </Text>
          </View>
        </View>

        {/* Footer with QR Code & Terms */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>
              • All items must be returned in good condition{"\n"}
              • Late returns may incur additional charges{"\n"}
              • Please contact us for any queries or concerns{"\n"}
              • This invoice is valid for accounting purposes
            </Text>
            <View style={styles.signatureLine}>
              <Text>Authorized Signature</Text>
            </View>
          </View>
          
          {upiPaymentString && (
            <View style={styles.footerRight}>
              <Text style={styles.qrLabel}>Scan & Pay</Text>
              <View style={styles.qrContainer}>
                {qrCodeDataUrl ? (
                  <Image src={qrCodeDataUrl} style={styles.qrImage} />
                ) : (
                  <Text style={{ fontSize: 6, color: "#9ca3af" }}>QR Code</Text>
                )}
              </View>
              <Text style={styles.qrInfo}>
                UPI: {user?.upi_id || "N/A"}
              </Text>
              <Text style={styles.qrInfo}>
                {`Amount: Rs. ${formatCurrencyNumber(order.total_amount)}`}
              </Text>
            </View>
          )}
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          This is a system-generated invoice
        </Text>
      </Page>
    </Document>
  );
}

// Export function to generate and download PDF
export async function generateAndDownloadPDF(order: Order, user: User | null): Promise<void> {
  try {
    const React = await import("react");
    const { pdf } = await import("@react-pdf/renderer");
    const { generateQRCodeDataURL } = await import("@/lib/utils/qr-code");
    
    // Generate UPI payment string
    const upiPaymentString = user?.upi_id 
      ? `upi://pay?pa=${user.upi_id}&am=${order.total_amount.toFixed(2)}&cu=INR&tn=Order ${order.invoice_number}`
      : null;
    
    // Pre-generate QR code before rendering PDF
    let qrCodeDataUrl: string | undefined;
    if (upiPaymentString) {
      try {
        qrCodeDataUrl = await generateQRCodeDataURL(upiPaymentString, 200);
        if (!qrCodeDataUrl) {
          console.warn("QR code generation returned empty string");
        }
      } catch (error) {
        console.error("Failed to generate QR code:", error);
        // Continue without QR code rather than failing completely
      }
    }
    
    // Create PDF document instance with pre-generated QR code
    const doc = pdf(React.createElement(InvoicePDF, { order, user, qrCodeDataUrl }) as any);
    
    // Generate blob and download
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
