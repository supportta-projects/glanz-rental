"use client";

import { formatCurrency, formatDate } from "@/lib/utils/date";
import type { Order, User } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";

interface InvoicePreviewProps {
  order: Order;
  user: User | null;
  onClose?: () => void;
}

// Format currency number only (without symbol) - matching PDF format
function formatCurrencyNumber(amount: number | null | undefined): string {
  const safeAmount = amount ?? 0;
  const fixed = safeAmount.toFixed(2);
  const parts = fixed.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] || "00";
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${formattedInteger}.${decimalPart}`;
}

export function InvoicePreview({ order, user, onClose }: InvoicePreviewProps) {
  const subtotal = order.subtotal || 0;
  const gstAmount = order.gst_amount || 0;
  const lateFee = order.late_fee || 0;
  const gstEnabled = user?.gst_enabled ?? false;
  const gstRate = user?.gst_rate || 5.00;
  
  // Limit items to 12 per page (matching PDF)
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
    <div 
      id="invoice-preview-content"
      className="bg-white print:p-4 max-w-[595px] mx-auto print:max-w-full"
      style={{ 
        width: "595px",
        height: "842px",
        maxHeight: "842px",
        fontFamily: "Helvetica, Arial, sans-serif",
        fontSize: "9pt",
        color: "#1a1a1a",
        backgroundColor: "#ffffff",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box"
      }}
    >
      {/* Clean Minimalist Header */}
      <div 
        className="mb-5 pb-4 border-b border-gray-300"
        style={{
          paddingBottom: "16px",
          marginBottom: "16px"
        }}
      >
        <div className="flex items-start justify-between">
          {/* Left: Company Info */}
          <div style={{ flex: 1 }}>
            <div className="flex items-center mb-3" style={{ gap: "12px" }}>
              <img 
                src={user?.branch && (user.branch as any).logo_url 
                  ? (user.branch as any).logo_url 
                  : "/glanz_logo.png"} 
                alt="Logo"
                style={{
                  width: "56px",
                  height: "56px",
                  objectFit: "contain"
                }}
              />
              <h1 
                style={{
                  fontSize: "22pt",
                  fontWeight: "600",
                  color: "#111827",
                  letterSpacing: "-0.5px",
                  lineHeight: "1.2",
                  margin: 0
                }}
              >
                {user?.branch?.name || "GLANZ RENTAL"}
              </h1>
            </div>
            {shopAddressLines.length > 0 && (
              <div style={{ marginTop: "6px" }}>
                {shopAddressLines.map((line, i) => (
                  <p 
                    key={i} 
                    style={{
                      fontSize: "8.5pt",
                      color: "#6b7280",
                      lineHeight: "1.6",
                      marginBottom: "3px"
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
            {user?.branch?.phone && (() => {
              const phoneNumbers = user.branch.phone.split(',');
              return (
                <p 
                  style={{
                    fontSize: "8.5pt",
                    color: "#6b7280",
                    marginTop: "4px",
                    lineHeight: "1.5"
                  }}
                >
                  {phoneNumbers.map((phone, index) => (
                    <span key={index}>
                      {phone.trim()}
                      {index < phoneNumbers.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              );
            })()}
          </div>

          {/* Right: Invoice Info */}
          <div 
            style={{
              textAlign: "right",
              paddingLeft: "24px"
            }}
          >
            <p 
              style={{
                fontSize: "12pt",
                fontWeight: "600",
                color: "#111827",
                marginBottom: "10px",
                letterSpacing: "0.5px"
              }}
            >
              INVOICE
            </p>
            <p 
              style={{
                fontSize: "9.5pt",
                color: "#374151",
                marginBottom: "6px",
                fontWeight: "500"
              }}
            >
              {order.invoice_number || "N/A"}
            </p>
            <p 
              style={{
                fontSize: "8.5pt",
                color: "#9ca3af"
              }}
            >
              {formatDate(order.booking_date || order.created_at, "dd MMM yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* Clean Customer Section */}
      <div 
        className="mb-5 pb-4 border-b border-gray-200"
        style={{
          paddingBottom: "14px",
          marginBottom: "14px"
        }}
      >
        <p 
          style={{
            fontSize: "7pt",
            color: "#9ca3af",
            textTransform: "uppercase",
            fontWeight: "600",
            letterSpacing: "1.2px",
            marginBottom: "8px"
          }}
        >
          Bill To
        </p>
        <p 
          style={{
            fontSize: "12pt",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "5px"
          }}
        >
          {order.customer?.name || "N/A"}
        </p>
        {order.customer?.phone && (
          <p 
            style={{
              fontSize: "8.5pt",
              color: "#6b7280",
              marginBottom: "3px"
            }}
          >
            {order.customer.phone}
          </p>
        )}
        {order.customer?.address && (
          <p 
            style={{
              fontSize: "8.5pt",
              color: "#6b7280",
              lineHeight: "1.6",
              marginTop: "3px"
            }}
          >
            {order.customer.address}
          </p>
        )}
      </div>

      {/* Clean Products Table */}
      <div className="mb-5" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Table Header - Subtle */}
        <div 
          className="flex"
          style={{
            background: "#f8f9fa",
            padding: "11px 10px",
            borderBottom: "1px solid #e5e7eb",
            fontSize: "8pt",
            fontWeight: "600",
            color: "#374151",
            letterSpacing: "0.2px"
          }}
        >
          <div className="w-[5%] text-center">#</div>
          <div className="w-[10%]">Photo</div>
          <div className="w-[35%]">Product Name</div>
          <div className="w-[8%] text-center">Qty</div>
          <div className="w-[21%] text-right pr-2">Price/Day</div>
          <div className="w-[21%] text-right">Total</div>
        </div>

        {/* Table Rows - Clean */}
        <div style={{ maxHeight: "350px", overflowY: "auto" }}>
          {displayItems.map((item, index) => (
            <div 
              key={index} 
              className="flex py-3 px-2 border-b border-gray-100"
              style={{
                minHeight: "50px",
                alignItems: "center",
                fontSize: "8.5pt"
              }}
            >
              <div className="w-[5%] flex items-center justify-center">
                <span style={{ color: "#9ca3af", fontSize: "8pt" }}>{index + 1}</span>
              </div>
              <div className="w-[10%] flex items-center justify-center pr-2">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.product_name || "Product"}
                    style={{
                      width: "44px",
                      height: "44px",
                      objectFit: "contain",
                      borderRadius: "4px"
                    }}
                  />
                ) : (
                  <div 
                    style={{
                      width: "44px",
                      height: "44px",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <span style={{ fontSize: "7pt", color: "#d1d5db" }}>—</span>
                  </div>
                )}
              </div>
              <div className="w-[35%] flex items-center pr-2">
                <p 
                  style={{
                    color: "#111827",
                    fontWeight: "500",
                    lineHeight: "1.5"
                  }}
                >
                  {item.product_name || "Unnamed Product"}
                </p>
              </div>
              <div className="w-[8%] flex items-center justify-center">
                <span style={{ color: "#374151", fontWeight: "500" }}>{item.quantity}</span>
              </div>
              <div className="w-[21%] flex items-center justify-end pr-2">
                <span style={{ color: "#6b7280" }}>
                  {`₹${formatCurrencyNumber(item.price_per_day)}`}
                </span>
              </div>
              <div className="w-[21%] flex items-center justify-end">
                <span style={{ color: "#111827", fontWeight: "600", fontSize: "9pt" }}>
                  {`₹${formatCurrencyNumber(item.line_total)}`}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {hasMoreItems && (
          <div 
            className="flex py-2"
            style={{
              background: "#fffbeb",
              borderTop: "1px solid #fde68a",
              fontSize: "7.5pt",
              color: "#92400e"
            }}
          >
            <div className="w-full text-center">
              * {order.items!.length - 12} more item(s) — see order details
            </div>
          </div>
        )}
      </div>

      {/* Clean Summary Section */}
      <div 
        className="mt-4 ml-auto"
        style={{
          width: "270px",
          padding: "14px 0"
        }}
      >
        <div 
          className="flex justify-between py-2"
          style={{ 
            marginBottom: "8px", 
            fontSize: "8.5pt",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "8px"
          }}
        >
          <span style={{ color: "#6b7280" }}>Subtotal</span>
          <span style={{ color: "#111827", fontWeight: "500" }}>
            {`₹${formatCurrencyNumber(subtotal)}`}
          </span>
        </div>
        {gstEnabled && gstAmount > 0 && (
          <div 
            className="flex justify-between py-2"
            style={{ 
              marginBottom: "8px", 
              fontSize: "8.5pt",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "8px"
            }}
          >
            <span style={{ color: "#6b7280" }}>GST ({gstRate}%)</span>
            <span style={{ color: "#111827", fontWeight: "500" }}>
              {`₹${formatCurrencyNumber(gstAmount)}`}
            </span>
          </div>
        )}
        {lateFee > 0 && (
          <div 
            className="flex justify-between py-2"
            style={{ 
              marginBottom: "8px", 
              fontSize: "8.5pt",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "8px"
            }}
          >
            <span style={{ color: "#ea580c", fontWeight: "500" }}>Late Fee</span>
            <span style={{ color: "#ea580c", fontWeight: "600" }}>
              {`₹${formatCurrencyNumber(lateFee)}`}
            </span>
          </div>
        )}
        <div 
          className="flex justify-between pt-4 mt-3"
          style={{
            borderTop: "2px solid #111827",
            paddingTop: "12px",
            marginTop: "10px"
          }}
        >
          <span 
            style={{
              fontSize: "12pt",
              color: "#111827",
              fontWeight: "600"
            }}
          >
            Total Amount
          </span>
          <span 
            style={{
              fontSize: "18pt",
              color: "#111827",
              fontWeight: "700",
              letterSpacing: "-0.5px"
            }}
          >
            {`₹${formatCurrencyNumber(order.total_amount)}`}
          </span>
        </div>
      </div>

      {/* Clean Footer */}
      <div 
        className="mt-5 pt-5 border-t border-gray-200 flex justify-between items-start"
        style={{
          paddingTop: "20px",
          marginTop: "16px",
          fontSize: "7.5pt"
        }}
      >
        <div className="flex-1 pr-8">
          <p 
            style={{
              fontSize: "7.5pt",
              color: "#9ca3af",
              textTransform: "uppercase",
              fontWeight: "600",
              marginBottom: "8px",
              letterSpacing: "1px"
            }}
          >
            Terms & Conditions
          </p>
          <div style={{ color: "#6b7280", lineHeight: "1.7" }}>
            <p style={{ marginBottom: "4px" }}>Items must be returned in good condition</p>
            <p style={{ marginBottom: "4px" }}>Late returns may incur additional charges</p>
            <p style={{ marginBottom: "4px" }}>Contact us for any queries or concerns</p>
          </div>
          <div 
            className="mt-5 pt-3 border-t border-gray-200"
            style={{ width: "180px", paddingTop: "12px" }}
          >
            <p style={{ color: "#9ca3af", fontSize: "7.5pt" }}>Authorized Signature</p>
          </div>
        </div>
        
        {upiPaymentString && (
          <div 
            style={{
              padding: "10px",
              textAlign: "right"
            }}
          >
            <p 
              style={{
                fontSize: "7.5pt",
                color: "#9ca3af",
                textTransform: "uppercase",
                fontWeight: "600",
                marginBottom: "10px",
                letterSpacing: "1px"
              }}
            >
              Scan & Pay
            </p>
            <div 
              style={{
                background: "#ffffff",
                padding: "8px",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <QRCodeSVG 
                value={upiPaymentString} 
                size={90}
                style={{ width: "90px", height: "90px" }}
              />
            </div>
            <p style={{ fontSize: "7pt", color: "#6b7280", marginTop: "6px", lineHeight: "1.5" }}>
              {user?.upi_id || "N/A"}
            </p>
            <p style={{ fontSize: "8pt", color: "#111827", fontWeight: "600", marginTop: "3px" }}>
              {`₹${formatCurrencyNumber(order.total_amount)}`}
            </p>
          </div>
        )}
      </div>

      {/* Clean Disclaimer */}
      <p 
        className="text-center mt-4"
        style={{
          fontSize: "7pt",
          color: "#d1d5db",
          fontStyle: "italic",
          paddingTop: "16px",
          borderTop: "1px solid #f3f4f6",
          marginTop: "16px"
        }}
      >
        This is a system-generated invoice
      </p>
    </div>
  );
}
