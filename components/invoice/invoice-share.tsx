"use client";

import { useState, useEffect } from "react";
import { Eye, MessageCircle, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InvoicePreview } from "./invoice-preview";
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
  const [internalShowInvoice, setInternalShowInvoice] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();
  
  // Use external control if provided, otherwise use internal state
  const showInvoice = externalShowInvoice !== undefined ? externalShowInvoice : internalShowInvoice;
  const setShowInvoice = onShowInvoiceChange || setInternalShowInvoice;

  // Handle print when dialog opens with print parameter
  useEffect(() => {
    if (showInvoice) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('print') === 'true') {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    }
  }, [showInvoice]);


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
      let invoiceText = `*GLANZ RENTAL - Invoice*\n\n` +
        `*Invoice Number:* ${order.invoice_number}\n` +
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

  const handlePrint = () => {
    // Open invoice dialog first, then trigger print
    setShowInvoice(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <>
      {/* Professional Invoice Actions Card */}
      <Card className="p-5 rounded-xl bg-white shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* View Invoice Button */}
          <Button
            onClick={() => setShowInvoice(true)}
            variant="outline"
            className="h-14 flex flex-col items-center justify-center gap-1.5 border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-50 transition-all rounded-lg"
          >
            <Eye className="h-5 w-5 text-sky-600" />
            <span className="text-xs font-semibold text-gray-700">View</span>
          </Button>

          {/* Share WhatsApp Button */}
          <Button
            onClick={shareOnWhatsApp}
            disabled={isGenerating || !order.customer?.phone}
            className="h-14 flex flex-col items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white border-2 border-green-400 transition-all rounded-lg shadow-sm"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs font-semibold">WhatsApp</span>
          </Button>

          {/* Download PDF Button */}
          <Button
            onClick={downloadPDF}
            variant="outline"
            disabled={isGenerating}
            className="h-14 flex flex-col items-center justify-center gap-1.5 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all rounded-lg"
          >
            <Download className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold text-gray-700">Download</span>
          </Button>

          {/* Print Button */}
          <Button
            onClick={handlePrint}
            variant="outline"
            className="h-14 flex flex-col items-center justify-center gap-1.5 border-2 border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-all rounded-lg"
          >
            <Printer className="h-5 w-5 text-gray-700" />
            <span className="text-xs font-semibold text-gray-700">Print</span>
          </Button>
        </div>
      </Card>

      {/* Invoice Preview Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto p-0"
          onClose={() => setShowInvoice(false)}
        >
          <InvoicePreview order={order} user={user} />
        </DialogContent>
      </Dialog>
    </>
  );
}

