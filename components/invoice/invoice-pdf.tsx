"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { Order, User } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/date";

interface InvoicePDFProps {
  order: Order;
  user: User | null;
}

// Generate QR code image URL (we'll use a service or convert SVG)
function getQRCodeImageUrl(upiString: string): string {
  // Using a QR code API service
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
}

// Styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottom: "2px solid #e5e7eb",
    paddingBottom: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "medium",
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    marginBottom: 15,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 3,
    fontWeight: "semibold",
  },
  value: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "bold",
  },
  valueSmall: {
    fontSize: 10,
    color: "#111827",
    fontWeight: "semibold",
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderBottom: "2px solid #d1d5db",
  },
  tableRow: {
    flexDirection: "row",
    padding: 10,
    borderBottom: "1px solid #e5e7eb",
  },
  tableCell: {
    fontSize: 9,
    color: "#111827",
  },
  tableCellBold: {
    fontSize: 9,
    color: "#111827",
    fontWeight: "bold",
  },
  tableCellImage: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  summary: {
    marginTop: 20,
    marginLeft: "auto",
    width: 200,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottom: "1px solid #e5e7eb",
  },
  summaryLabel: {
    fontSize: 9,
    color: "#4b5563",
    fontWeight: "medium",
  },
  summaryValue: {
    fontSize: 9,
    color: "#111827",
    fontWeight: "bold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 10,
    borderTop: "2px solid #9ca3af",
  },
  totalLabel: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 18,
    color: "#0284c7",
    fontWeight: "bold",
  },
  qrSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    border: "2px solid #e5e7eb",
    textAlign: "center",
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 15,
  },
  qrImage: {
    width: 150,
    height: 150,
    marginBottom: 10,
    alignSelf: "center",
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: "2px solid #d1d5db",
    textAlign: "center",
  },
  footerText: {
    fontSize: 9,
    color: "#374151",
    fontWeight: "semibold",
    marginBottom: 3,
  },
  footerTextSmall: {
    fontSize: 8,
    color: "#6b7280",
  },
  infoBox: {
    backgroundColor: "#f9fafb",
    padding: 15,
    borderRadius: 4,
    marginBottom: 10,
  },
});

export function InvoicePDF({ order, user }: InvoicePDFProps) {
  const subtotal = order.subtotal || 0;
  const gstAmount = order.gst_amount || 0;
  const lateFee = order.late_fee || 0;
  const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const gstEnabled = user?.gst_enabled ?? false;
  const gstRate = user?.gst_rate || 5.00;
  
  // Generate UPI payment string
  const upiPaymentString = user?.upi_id 
    ? `upi://pay?pa=${user.upi_id}&am=${order.total_amount}&cu=INR&tn=Order ${order.invoice_number}`
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>GLANZ RENTAL</Text>
          <Text style={styles.subtitle}>Rental Invoice</Text>
        </View>

        {/* Business Info */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>From</Text>
              {user?.branch && (
                <>
                  <Text style={styles.value}>{user.branch.name}</Text>
                  {user.branch.address && (
                    <Text style={styles.valueSmall}>{user.branch.address}</Text>
                  )}
                  {user.branch.phone && (
                    <Text style={styles.valueSmall}>Phone: {user.branch.phone}</Text>
                  )}
                </>
              )}
              {user?.gst_number && (
                <Text style={styles.valueSmall}>GSTIN: {user.gst_number}</Text>
              )}
              {user?.upi_id && (
                <Text style={styles.valueSmall}>UPI ID: {user.upi_id}</Text>
              )}
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Bill To</Text>
              <Text style={styles.value}>{order.customer?.name || "N/A"}</Text>
              {order.customer?.phone && (
                <Text style={styles.valueSmall}>Phone: {order.customer.phone}</Text>
              )}
              {order.customer?.address && (
                <Text style={styles.valueSmall}>{order.customer.address}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={[styles.infoBox]}>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Invoice Number</Text>
                <Text style={styles.value}>{order.invoice_number}</Text>
              </View>
              <View style={styles.col}>
                <Text style={[styles.label, { textAlign: "right" }]}>Invoice Date</Text>
                <Text style={[styles.value, { textAlign: "right" }]}>
                  {formatDate(order.created_at, "dd MMM yyyy")}
                </Text>
              </View>
            </View>
            <View style={[styles.row, { marginTop: 10 }]}>
              <View style={styles.col}>
                <Text style={styles.label}>Rental Start</Text>
                <Text style={styles.valueSmall}>
                  {formatDateTime((order as any).start_datetime || order.start_date, false)}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={[styles.label, { textAlign: "right" }]}>Rental End</Text>
                <Text style={[styles.valueSmall, { textAlign: "right" }]}>
                  {formatDateTime((order as any).end_datetime || order.end_date, false)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellBold, { width: "15%" }]}>Image</Text>
            <Text style={[styles.tableCellBold, { width: "30%" }]}>Product</Text>
            <Text style={[styles.tableCellBold, { width: "15%", textAlign: "center" }]}>Qty</Text>
            <Text style={[styles.tableCellBold, { width: "20%", textAlign: "right" }]}>Price</Text>
            <Text style={[styles.tableCellBold, { width: "20%", textAlign: "right" }]}>Total</Text>
          </View>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={{ width: "15%" }}>
                {item.photo_url ? (
                  <Image
                    src={item.photo_url}
                    style={styles.tableCellImage}
                  />
                ) : (
                  <Text style={styles.tableCell}>-</Text>
                )}
              </View>
              <Text style={[styles.tableCell, { width: "30%" }]}>
                {item.product_name || "Unnamed Product"}
              </Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}>
                {formatCurrency(item.price_per_day)}
              </Text>
              <Text style={[styles.tableCellBold, { width: "20%", textAlign: "right" }]}>
                {formatCurrency(item.line_total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Items:</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {gstEnabled && gstAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST ({gstRate}%):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(gstAmount)}</Text>
            </View>
          )}
          {lateFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#ea580c" }]}>Late Fee:</Text>
              <Text style={[styles.summaryValue, { color: "#ea580c" }]}>
                {formatCurrency(lateFee)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Final Total Amount:</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total_amount)}</Text>
          </View>
        </View>

        {/* UPI QR Code */}
        {upiPaymentString && (
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>Scan to Pay via UPI</Text>
            <Image
              src={getQRCodeImageUrl(upiPaymentString)}
              style={styles.qrImage}
            />
            <Text style={styles.valueSmall}>UPI ID: {user?.upi_id}</Text>
            <Text style={styles.valueSmall}>Amount: {formatCurrency(order.total_amount)}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
          <Text style={styles.footerTextSmall}>
            For any queries, please contact us at: {user?.phone || "N/A"}
          </Text>
          {user?.branch?.address && (
            <Text style={styles.footerTextSmall}>{user.branch.address}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

// Export function to generate and download PDF
export async function generateAndDownloadPDF(order: Order, user: User | null): Promise<void> {
  const React = await import("react");
  const { pdf } = await import("@react-pdf/renderer");
  
  // Create PDF document instance
  const doc = pdf(React.createElement(InvoicePDF, { order, user }));
  
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

