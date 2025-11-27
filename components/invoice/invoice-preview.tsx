"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/date";
import type { Order, User } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";

interface InvoicePreviewProps {
  order: Order;
  user: User | null;
  onClose?: () => void;
}

export function InvoicePreview({ order, user, onClose }: InvoicePreviewProps) {
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

  // Generate unique ID for this invoice instance (for hidden container)
  const invoiceId = `invoice-preview-${order.id}`;
  
  return (
    <div 
      className="bg-white p-6 md:p-10 max-w-3xl mx-auto" 
      id="invoice-preview"
      data-invoice-id={invoiceId}
      style={{ 
        colorScheme: 'light',
        // Force standard color format to avoid lab() parsing issues
        color: 'rgb(0, 0, 0)',
        backgroundColor: 'rgb(255, 255, 255)'
      }}
    >
      {/* Professional Header with Logo Area */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">GLANZ RENTAL</h1>
        <p className="text-base text-gray-600 font-medium">Rental Invoice</p>
      </div>

      {/* Business Info Section */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">From</h3>
          {user?.branch && (
            <>
              <p className="text-lg font-bold text-gray-900">{user.branch.name}</p>
              {user.branch.address && (
                <p className="text-sm text-gray-600 leading-relaxed">{user.branch.address}</p>
              )}
              {user.branch.phone && (
                <p className="text-sm text-gray-600">Phone: {user.branch.phone}</p>
              )}
            </>
          )}
          {user?.gst_number && (
            <p className="text-sm text-gray-600 font-medium">GSTIN: {user.gst_number}</p>
          )}
          {user?.upi_id && (
            <p className="text-sm text-gray-600 font-medium">UPI ID: {user.upi_id}</p>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Bill To</h3>
          <p className="text-lg font-bold text-gray-900">{order.customer?.name || "N/A"}</p>
          {order.customer?.phone && (
            <p className="text-sm text-gray-600">Phone: {order.customer.phone}</p>
          )}
          {order.customer?.address && (
            <p className="text-sm text-gray-600 leading-relaxed">{order.customer.address}</p>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="mb-8 grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Invoice Number</p>
          <p className="text-lg font-bold text-gray-900">{order.invoice_number}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Invoice Date</p>
          <p className="text-lg font-bold text-gray-900">{formatDate(order.created_at, "dd MMM yyyy")}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Rental Start</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatDateTime((order as any).start_datetime || order.start_date, false)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Rental End</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatDateTime((order as any).end_datetime || order.end_date, false)}
          </p>
        </div>
      </div>

      {/* Items Table - Professional Design */}
      <div className="mb-8 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Image</th>
              <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Product Name</th>
              <th className="text-center py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Quantity</th>
              <th className="text-right py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Price per Unit</th>
              <th className="text-right py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4">
                  <img 
                    src={item.photo_url} 
                    alt={item.product_name || "Product"} 
                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </td>
                <td className="py-4 px-4">
                  <p className="font-semibold text-gray-900 text-sm">{item.product_name || "Unnamed Product"}</p>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="font-semibold text-gray-900 text-sm">{item.quantity}</span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="font-medium text-gray-700 text-sm">{formatCurrency(item.price_per_day)}</span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="font-bold text-gray-900 text-sm">{formatCurrency(item.line_total)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Section - Professional Layout */}
      <div className="mb-8 flex justify-end">
        <div className="w-full md:w-80 space-y-3">
          <div className="flex justify-between text-sm py-2 border-b border-gray-200">
            <span className="text-gray-600 font-medium">Total Items:</span>
            <span className="font-bold text-gray-900">{totalItems}</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b border-gray-200">
            <span className="text-gray-600 font-medium">Subtotal:</span>
            <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
          {/* Only show GST if enabled and amount > 0 */}
          {gstEnabled && gstAmount > 0 && (
            <div className="flex justify-between text-sm py-2 border-b border-gray-200">
              <span className="text-gray-600 font-medium">GST ({gstRate}%):</span>
              <span className="font-bold text-gray-900">{formatCurrency(gstAmount)}</span>
            </div>
          )}
          {lateFee > 0 && (
            <div className="flex justify-between text-sm py-2 border-b border-gray-200">
              <span className="text-orange-600 font-medium">Late Fee:</span>
              <span className="font-bold text-orange-600">{formatCurrency(lateFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-gray-400">
            <span className="text-gray-900">Final Total Amount:</span>
            <span className="text-sky-600">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* UPI QR Code Section */}
      {upiPaymentString && (
        <div className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 text-center">
          <p className="font-bold text-gray-900 mb-3 text-lg">Scan to Pay via UPI</p>
          <div className="flex justify-center mb-4">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <QRCodeSVG value={upiPaymentString} size={220} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-700">UPI ID: <span className="text-gray-900">{user?.upi_id || "N/A"}</span></p>
            <p className="text-sm font-semibold text-gray-700">Amount: <span className="text-sky-600">{formatCurrency(order.total_amount)}</span></p>
          </div>
        </div>
      )}

      {/* Professional Footer */}
      <div className="text-center border-t-2 border-gray-300 pt-6 space-y-2">
        <p className="text-sm font-semibold text-gray-700">Thank you for your business!</p>
        <p className="text-xs text-gray-500">For any queries, please contact us at: {user?.phone || "N/A"}</p>
        {user?.branch?.address && (
          <p className="text-xs text-gray-500">{user.branch.address}</p>
        )}
      </div>
    </div>
  );
}

