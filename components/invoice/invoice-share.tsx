"use client";

import { useState } from "react";
import { MessageCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Order, User } from "@/lib/types";
import { generateAndDownloadPDF } from "./invoice-pdf";
import { useToast } from "@/components/ui/toast";

interface InvoiceShareProps {
  order: Order;
  user: User | null;
  showInvoice?: boolean;
  onShowInvoiceChange?: (show: boolean) => void;
}

export function InvoiceShare({ order, user, showInvoice: externalShowInvoice, onShowInvoiceChange }: InvoiceShareProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

  const shareOnWhatsApp = async () => {
    const customerPhone = order.customer?.phone?.replace(/\D/g, "") || "";
    if (!customerPhone) {
      showToast("Customer phone number not available", "error");
      return;
    }

    if (customerPhone.length !== 10) {
      showToast("Invalid customer phone number", "error");
      return;
    }

    setIsGenerating(true);
    try {
      // Build items list
      let itemsText = "";
      if (order.items && order.items.length > 0) {
        itemsText = "\n*Items:*\n";
        order.items.forEach((item, index) => {
          itemsText += `${index + 1}. ${item.product_name || "Unnamed Product"}\n`;
          itemsText += `   Price: ₹${item.price_per_day.toLocaleString()}\n`;
          itemsText += `   Quantity: ${item.quantity}\n`;
          itemsText += `   Total: ₹${item.line_total.toLocaleString()}\n\n`;
        });
      }

      const subtotal = order.subtotal || 0;
      const gstAmount = order.gst_amount || 0;
      const lateFee = order.late_fee || 0;
      const gstEnabled = user?.gst_enabled ?? false;
      const gstRate = user?.gst_rate || 5.00;

      // Generate invoice text with detailed items
      const companyName = user?.company_name || "Glanz Costumes";
      let invoiceText = `*${companyName} - Order*\n\n` +
        `*Order Number:* ${order.invoice_number}\n` +
        `*Customer:* ${order.customer?.name || "N/A"}\n` +
        `*Date:* ${new Date(order.created_at).toLocaleDateString()}\n\n` +
        itemsText +
        `*Summary:*\n` +
        `Subtotal: ₹${subtotal.toLocaleString()}\n`;

      // Only include GST in WhatsApp message if enabled and amount > 0
      if (gstEnabled && gstAmount > 0) {
        invoiceText += `GST (${gstRate}%): ₹${gstAmount.toLocaleString()}\n`;
      }

      if (lateFee > 0) {
        invoiceText += `Late Fee: ₹${lateFee.toLocaleString()}\n`;
      }

      invoiceText += `\n*Final Total Amount: ₹${order.total_amount.toLocaleString()}*\n\n` +
        `Thank you for your business!`;

      // Open WhatsApp with pre-filled message
      const whatsappUrl = `https://wa.me/91${customerPhone}?text=${encodeURIComponent(invoiceText)}`;
      window.open(whatsappUrl, "_blank");
      
      showToast("Opening WhatsApp...", "info");
    } catch (error) {
      console.error("Error sharing on WhatsApp:", error);
      showToast("Failed to open WhatsApp", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      showToast("Generating PDF...", "info");
      await generateAndDownloadPDF(order, user);
      showToast("PDF downloaded successfully", "success");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Failed to generate PDF. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Compact Invoice Actions */}
      <Card className="p-3 sm:p-4 rounded-lg bg-white shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Invoice Actions</h3>
          {isGenerating && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Share WhatsApp Button */}
          <Button
            onClick={shareOnWhatsApp}
            disabled={isGenerating || !order.customer?.phone}
            size="sm"
            className="gap-2 bg-green-500 hover:bg-green-600 text-white border-0 shadow-md hover:shadow-lg"
            title="Share on WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>

          {/* Download PDF Button */}
          <Button
            onClick={downloadPDF}
            variant="outline"
            disabled={isGenerating}
            size="sm"
            className="gap-2"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </Card>
    </>
  );
}
