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
      className="bg-white p-5 print:p-5 max-w-[595px] mx-auto print:max-w-full"
      style={{ 
        width: "595px",
        minHeight: "842px",
        fontFamily: "Helvetica, Arial, sans-serif",
        fontSize: "9pt",
        color: "#111827",
        backgroundColor: "#ffffff"
      }}
    >
      {/* Header with Logo - Matching PDF Design */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-gray-800 print:mb-3 print:pb-2">
        {/* Logo Area (Top Left) */}
        <div className="w-[70px] h-[70px] mr-3 border border-gray-200 bg-gray-50 flex items-center justify-center print:w-[70px] print:h-[70px]">
          {user?.branch && (user.branch as any).logo_url ? (
            <img 
              src={(user.branch as any).logo_url} 
              alt="Logo"
              className="w-[65px] h-[65px] object-contain"
            />
          ) : (
            <span className="text-[7pt] text-gray-400">LOGO</span>
          )}
        </div>
        
        {/* Shop Name & Address */}
        <div className="flex-1">
          <h1 className="text-[20pt] font-bold text-gray-900 mb-1 leading-tight">
            {user?.branch?.name || "GLANZ RENTAL"}
          </h1>
          {shopAddressLines.length > 0 && (
            <div className="space-y-0.5">
              {shopAddressLines.map((line, i) => (
                <p key={i} className="text-[8pt] text-gray-600 leading-snug">
                  {line}
                </p>
              ))}
            </div>
          )}
          {user?.branch?.phone && (
            <p className="text-[8pt] text-gray-600 mt-1">Phone: {user.branch.phone}</p>
          )}
        </div>

        {/* Invoice Label & Details (Top Right) */}
        <div className="w-[140px] pl-2.5 border-l border-gray-200 text-right">
          <p className="text-[16pt] font-bold text-gray-900 mb-2">INVOICE</p>
          <p className="text-[9pt] font-bold text-gray-700 mb-0.5">
            {order.invoice_number || "N/A"}
          </p>
          <p className="text-[8pt] text-gray-500">
            {formatDate(order.booking_date || order.created_at, "dd MMM yyyy")}
          </p>
        </div>
      </div>

      {/* Customer Details - Matching PDF Design */}
      <div className="flex items-start mb-4 pb-3 border-b border-gray-200 print:mb-3 print:pb-2">
        <div className="flex-1 pr-4">
          <p className="text-[7pt] text-gray-600 uppercase font-bold tracking-wide mb-1">Bill To</p>
          <p className="text-[11pt] font-bold text-gray-900 mb-1">
            {order.customer?.name || "N/A"}
          </p>
          {order.customer?.phone && (
            <p className="text-[8pt] text-gray-600 mb-0.5">
              Phone: {order.customer.phone}
            </p>
          )}
          {order.customer?.address && (
            <p className="text-[8pt] text-gray-600 leading-relaxed">
              {order.customer.address}
            </p>
          )}
        </div>
      </div>

      {/* Products Table - Matching PDF Design */}
      <div className="mb-3 print:mb-2">
        {/* Table Header */}
        <div className="flex bg-gray-100 py-1.5 px-1.5 border-t border-b-2 border-gray-800">
          <div className="w-[6%] text-center">
            <p className="text-[7pt] font-bold text-gray-900 uppercase tracking-wide">S.No</p>
          </div>
          <div className="w-[10%]">
            <p className="text-[7pt] font-bold text-gray-900 uppercase tracking-wide">Photo</p>
          </div>
          <div className="w-[32%]">
            <p className="text-[7pt] font-bold text-gray-900 uppercase tracking-wide">Product Name</p>
          </div>
          <div className="w-[8%] text-center">
            <p className="text-[7pt] font-bold text-gray-900 uppercase tracking-wide">Qty</p>
          </div>
          <div className="w-[22%] text-right pr-1">
            <p className="text-[7pt] font-bold text-gray-900 uppercase tracking-wide">Per Day Price</p>
          </div>
          <div className="w-[22%] text-right">
            <p className="text-[7pt] font-bold text-gray-900 uppercase tracking-wide">Total</p>
          </div>
        </div>

        {/* Table Rows */}
        {displayItems.map((item, index) => (
          <div 
            key={index} 
            className={`flex py-1.5 px-1.5 border-b border-gray-200 min-h-[50px] ${
              index % 2 === 1 ? "bg-gray-50" : ""
            }`}
          >
            <div className="w-[6%] flex items-center justify-center">
              <span className="text-[8pt] text-gray-900">{index + 1}</span>
            </div>
            <div className="w-[10%] flex items-center justify-center pr-1">
              {item.photo_url ? (
                <img
                  src={item.photo_url}
                  alt={item.product_name || "Product"}
                  className="w-12 h-12 object-contain border border-gray-200 bg-white"
                />
              ) : (
                <div className="w-12 h-12 border border-gray-200 bg-gray-100 flex items-center justify-center">
                  <span className="text-[6pt] text-gray-400">No Image</span>
                </div>
              )}
            </div>
            <div className="w-[32%] flex items-center pr-1">
              <p className="text-[8pt] text-gray-900 leading-snug">
                {item.product_name || "Unnamed Product"}
              </p>
            </div>
            <div className="w-[8%] flex items-center justify-center">
              <span className="text-[8pt] text-gray-900">{item.quantity}</span>
            </div>
            <div className="w-[22%] flex items-center justify-end pr-1">
              <span className="text-[8pt] text-gray-900">
                {`₹${formatCurrencyNumber(item.price_per_day)}`}
              </span>
            </div>
            <div className="w-[22%] flex items-center justify-end">
              <span className="text-[8pt] font-bold text-gray-900">
                {`₹${formatCurrencyNumber(item.line_total)}`}
              </span>
            </div>
          </div>
        ))}
        
        {/* Warning if more than 12 items */}
        {hasMoreItems && (
          <div className="flex py-1 bg-yellow-50 border-b border-gray-200">
            <div className="w-full text-center">
              <p className="text-[7pt] text-yellow-800">
                * Additional {order.items!.length - 12} item(s) not shown. Please refer to order details.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary Section - Matching PDF Design */}
      <div className="mt-4 ml-auto w-[240px] border border-gray-300 p-2.5 bg-gray-50 print:mt-3 print:p-2">
        <div className="flex justify-between py-0.75 border-b border-gray-200">
          <span className="text-[8pt] text-gray-600 font-medium">Subtotal:</span>
          <span className="text-[8pt] font-bold text-gray-900">
            {`₹${formatCurrencyNumber(subtotal)}`}
          </span>
        </div>
        {gstEnabled && gstAmount > 0 && (
          <div className="flex justify-between py-0.75 border-b border-gray-200">
            <span className="text-[8pt] text-gray-600 font-medium">GST ({gstRate}%):</span>
            <span className="text-[8pt] font-bold text-gray-900">
              {`₹${formatCurrencyNumber(gstAmount)}`}
            </span>
          </div>
        )}
        {lateFee > 0 && (
          <div className="flex justify-between py-0.75 border-b border-gray-200">
            <span className="text-[8pt] text-orange-600 font-medium">Late Fee:</span>
            <span className="text-[8pt] font-bold text-orange-600">
              {`₹${formatCurrencyNumber(lateFee)}`}
            </span>
          </div>
        )}
        <div className="flex justify-between pt-1.5 mt-1.5 border-t-2 border-gray-800">
          <span className="text-[11pt] font-bold text-gray-900">Total Amount:</span>
          <span className="text-[14pt] font-bold text-blue-600">
            {`₹${formatCurrencyNumber(order.total_amount)}`}
          </span>
        </div>
      </div>

      {/* Footer with QR Code & Terms - Matching PDF Design */}
      <div className="mt-auto pt-3 border-t border-gray-300 flex justify-between items-start min-h-[120px] print:pt-2">
        <div className="flex-1 pr-4">
          <p className="text-[7pt] font-bold text-gray-700 uppercase tracking-wide mb-0.75">Terms & Conditions</p>
          <div className="text-[7pt] text-gray-600 leading-snug space-y-0.5">
            <p>• All items must be returned in good condition</p>
            <p>• Late returns may incur additional charges</p>
            <p>• Please contact us for any queries or concerns</p>
            <p>• This invoice is valid for accounting purposes</p>
          </div>
          <div className="mt-4 pt-1 border-t border-gray-300 w-[150px]">
            <p className="text-[7pt] text-gray-600">Authorized Signature</p>
          </div>
        </div>
        
        {upiPaymentString && (
          <div className="w-[110px] text-right">
            <p className="text-[6pt] text-gray-700 font-bold uppercase tracking-wide mb-0.75">Scan & Pay</p>
            <div className="bg-white p-1.5 border border-gray-200 mb-1 flex items-center justify-center">
              <QRCodeSVG 
                value={upiPaymentString} 
                size={90}
                style={{ width: "90px", height: "90px" }}
              />
            </div>
            <p className="text-[6pt] text-gray-600 mt-0.5 leading-snug">
              UPI: {user?.upi_id || "N/A"}
            </p>
            <p className="text-[6pt] text-gray-600 mt-0.5 leading-snug">
              {`Amount: ₹${formatCurrencyNumber(order.total_amount)}`}
            </p>
          </div>
        )}
      </div>

      {/* Disclaimer - Matching PDF Design */}
      <p className="text-[6pt] text-gray-400 text-center mt-2 italic print:mt-1">
        This is a system-generated invoice
      </p>
    </div>
  );
}
