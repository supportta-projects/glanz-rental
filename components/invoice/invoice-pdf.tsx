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
const MARGIN = 20; // 20pt margins (within 18-24px range)

// Professional, accountant-grade invoice styles
const styles = StyleSheet.create({
  page: {
    padding: MARGIN,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    width: A4_WIDTH,
    minHeight: A4_HEIGHT,
  },
  // Header Section - Logo + Shop Info
  header: {
    flexDirection: "row",
    marginBottom: 18,
    paddingBottom: 12,
    borderBottom: "2px solid #1f2937",
  },
  logoContainer: {
    width: 70,
    height: 70,
    marginRight: 12,
    border: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  logo: {
    width: 65,
    height: 65,
    objectFit: "contain",
  },
  headerText: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  shopAddress: {
    fontSize: 8,
    color: "#4b5563",
    lineHeight: 1.4,
    marginBottom: 1,
  },
  shopPhone: {
    fontSize: 8,
    color: "#4b5563",
    marginTop: 2,
  },
  invoiceLabelContainer: {
    width: 140,
    alignItems: "flex-end",
    paddingLeft: 10,
    borderLeft: "1px solid #e5e7eb",
  },
  invoiceLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  invoiceNumberText: {
    fontSize: 9,
    color: "#374151",
    fontWeight: "bold",
    marginBottom: 2,
  },
  invoiceDateText: {
    fontSize: 8,
    color: "#6b7280",
  },
  // Customer & Invoice Details Section
  detailsSection: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #e5e7eb",
  },
  customerDetails: {
    flex: 1,
    paddingRight: 15,
  },
  sectionLabel: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 3,
  },
  customerInfo: {
    fontSize: 8,
    color: "#374151",
    lineHeight: 1.5,
    marginBottom: 1,
  },
  // Products Table
  table: {
    marginTop: 12,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderTop: "1px solid #d1d5db",
    borderBottom: "2px solid #1f2937",
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderBottom: "1px solid #e5e7eb",
    minHeight: 50,
  },
  tableRowEven: {
    backgroundColor: "#fafafa",
  },
  // Table Cell Widths: S.No: 6%, Photo: 10%, Name: 32%, Qty: 8%, Price: 22%, Total: 22%
  cellSNo: { 
    width: "6%", 
    fontSize: 8, 
    color: "#111827", 
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
    width: "32%", 
    fontSize: 8, 
    color: "#111827", 
    paddingRight: 4,
    lineHeight: 1.3,
  },
  cellQty: { 
    width: "8%", 
    fontSize: 8, 
    color: "#111827", 
    textAlign: "center",
    paddingRight: 2,
  },
  cellPrice: { 
    width: "22%", 
    fontSize: 8, 
    color: "#111827", 
    textAlign: "right", 
    paddingRight: 4,
    fontFamily: "Helvetica",
    textRendering: "optimizeLegibility",
  },
  cellTotal: { 
    width: "22%", 
    fontSize: 8, 
    fontWeight: "bold", 
    color: "#111827", 
    textAlign: "right",
    fontFamily: "Helvetica",
    textRendering: "optimizeLegibility",
  },
  productImage: {
    width: 48,
    height: 48,
    objectFit: "contain",
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
  },
  // Summary Section
  summary: {
    marginTop: 16,
    marginLeft: "auto",
    width: 240,
    border: "1px solid #d1d5db",
    padding: 10,
    backgroundColor: "#fafafa",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottom: "1px solid #e5e7eb",
  },
  summaryLabel: {
    fontSize: 8,
    color: "#4b5563",
    fontWeight: "medium",
  },
  summaryValue: {
    fontSize: 8,
    color: "#111827",
    fontWeight: "bold",
    fontFamily: "Helvetica",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 6,
    borderTop: "2px solid #1f2937",
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0b63ff",
    fontFamily: "Helvetica",
    textRendering: "optimizeLegibility",
  },
  // Footer Section
  footer: {
    marginTop: "auto",
    paddingTop: 12,
    borderTop: "1px solid #d1d5db",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    minHeight: 120,
  },
  footerLeft: {
    flex: 1,
    paddingRight: 15,
  },
  footerRight: {
    width: 110,
    textAlign: "right",
  },
  termsTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  termsText: {
    fontSize: 7,
    color: "#6b7280",
    lineHeight: 1.4,
    marginBottom: 2,
  },
  signatureLine: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 15,
    borderTop: "1px solid #d1d5db",
    paddingTop: 4,
    width: 150,
  },
  qrContainer: {
    backgroundColor: "#ffffff",
    padding: 6,
    border: "1px solid #e5e7eb",
    marginBottom: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: {
    width: 90,
    height: 90,
    objectFit: "contain",
  },
  qrLabel: {
    fontSize: 6,
    color: "#374151",
    fontWeight: "bold",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  qrInfo: {
    fontSize: 6,
    color: "#6b7280",
    marginTop: 2,
    lineHeight: 1.3,
  },
  disclaimer: {
    fontSize: 6,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
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
            {user?.branch && (user.branch as any).logo_url ? (
              <Image 
                src={(user.branch as any).logo_url} 
                style={styles.logo}
              />
            ) : (
              <Text style={{ fontSize: 7, color: "#9ca3af" }}>LOGO</Text>
            )}
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
              <Text style={styles.shopPhone}>Phone: {user.branch.phone}</Text>
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

          {/* Table Rows */}
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
      qrCodeDataUrl = await generateQRCodeDataURL(upiPaymentString, 180);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  }
  
  // Create PDF document instance with pre-generated QR code
  const doc = pdf(React.createElement(InvoicePDF, { order, user, qrCodeDataUrl }) as any);
  
  // Generate blob and download
  const blob = await doc.toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Invoice-${order.invoice_number}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
