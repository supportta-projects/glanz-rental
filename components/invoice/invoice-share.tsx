"use client";

import { useState } from "react";
import { Share2, MessageCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InvoicePreview } from "./invoice-preview";
import type { Order, User } from "@/lib/types";
import { generateAndDownloadPDF } from "./invoice-pdf";
import { useToast } from "@/components/ui/toast";

interface InvoiceShareProps {
  order: Order;
  user: User | null;
}

export function InvoiceShare({ order, user }: InvoiceShareProps) {
  const [showInvoice, setShowInvoice] = useState(false);
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

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => setShowInvoice(true)}
          variant="outline"
          className="h-12 flex-1"
        >
          <Share2 className="h-4 w-4 mr-2" />
          View Invoice
        </Button>
        <Button
          onClick={shareOnWhatsApp}
          className="h-12 flex-1 bg-green-500 hover:bg-green-600 text-white"
          disabled={isGenerating || !order.customer?.phone}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {isGenerating ? "Opening..." : "Share on WhatsApp"}
        </Button>
        <Button
          onClick={downloadPDF}
          variant="outline"
          className="h-12 flex-1"
          disabled={isGenerating}
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating..." : "Download PDF"}
        </Button>
      </div>

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

