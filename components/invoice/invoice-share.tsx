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
    // Open invoice dialog first
    setShowInvoice(true);
    
    // Wait for dialog to render, then extract invoice content and print in new window
    setTimeout(() => {
      // Try multiple robust methods to find the invoice element
      let invoiceElement: HTMLElement | null = null;
      
      // Method 1: Direct ID search (most reliable - works even outside dialog)
      invoiceElement = document.getElementById('invoice-preview-content');
      
      // Method 2: Search within dialog by role attribute
      if (!invoiceElement) {
        const dialog = document.querySelector('[role="dialog"]');
        invoiceElement = dialog?.querySelector('#invoice-preview-content') as HTMLElement;
      }
      
      // Method 3: Search within dialog container by class
      if (!invoiceElement) {
        const dialogContainer = document.querySelector('.fixed.inset-0.z-50');
        invoiceElement = dialogContainer?.querySelector('#invoice-preview-content') as HTMLElement;
      }
      
      // Method 4: Search within DialogContent
      if (!invoiceElement) {
        const dialogContent = document.querySelector('.max-w-4xl');
        invoiceElement = dialogContent?.querySelector('#invoice-preview-content') as HTMLElement;
      }
      
      // Method 5: Global search as last resort
      if (!invoiceElement) {
        invoiceElement = document.querySelector('#invoice-preview-content') as HTMLElement;
      }
      
      // If still not found, show error instead of printing whole page
      if (!invoiceElement) {
        console.error('Invoice element not found. Debug info:', {
          byId: !!document.getElementById('invoice-preview-content'),
          dialog: !!document.querySelector('[role="dialog"]'),
          dialogContainer: !!document.querySelector('.fixed.inset-0.z-50'),
          dialogContent: !!document.querySelector('.max-w-4xl'),
        });
        showToast('Unable to prepare invoice for printing. Please try again.', 'error');
        setShowInvoice(false); // Close dialog on error
        return;
      }

      // Clone the invoice element with all its content
      const invoiceClone = invoiceElement.cloneNode(true) as HTMLElement;
      
      // Fix QR code SVG - convert to base64 image for better print compatibility
      const qrSvg = invoiceClone.querySelector('svg');
      if (qrSvg) {
        try {
          // Get SVG as string
          const svgString = new XMLSerializer().serializeToString(qrSvg);
          // Create data URL
          const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
          
          // Create img element to replace SVG
          const img = document.createElement('img');
          img.src = svgDataUrl;
          img.style.width = '90px';
          img.style.height = '90px';
          img.style.objectFit = 'contain';
          img.style.display = 'block';
          
          // Replace SVG with img
          if (qrSvg.parentNode) {
            qrSvg.parentNode.replaceChild(img, qrSvg);
          }
        } catch (e) {
          console.warn('Could not convert QR SVG to image:', e);
        }
      }
      
      // Ensure all images have absolute URLs (fix relative paths)
      const allImages = invoiceClone.querySelectorAll('img');
      allImages.forEach(img => {
        if (img.src && !img.src.startsWith('http') && !img.src.startsWith('data:')) {
          // Convert relative URL to absolute
          try {
            const absoluteUrl = new URL(img.src, window.location.origin).href;
            img.src = absoluteUrl;
          } catch (e) {
            console.warn('Could not convert image URL:', e);
          }
        }
      });
      
      // Preserve all inline styles from original element
      const originalStyle = invoiceElement.getAttribute('style') || '';
      invoiceClone.setAttribute('style', originalStyle);
      
      // Create a new window with only the invoice
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        // If popup blocked, show error instead of printing whole page
        showToast('Please allow popups to print invoice, or use the Download PDF option.', 'error');
        return;
      }

      // Extract all relevant CSS from the current page for the invoice
      const extractStyles = () => {
        let styles = '';
        try {
          Array.from(document.styleSheets).forEach(sheet => {
            try {
              Array.from(sheet.cssRules || []).forEach(rule => {
                if (rule instanceof CSSStyleRule) {
                  // Include styles that might affect the invoice
                  if (rule.selectorText.includes('invoice') || 
                      rule.selectorText.includes('#invoice-preview-content') ||
                      rule.selectorText.includes('.bg-white') ||
                      rule.selectorText.includes('.flex') ||
                      rule.selectorText.includes('.text-')) {
                    styles += rule.cssText + '\n';
                  }
                } else if (rule instanceof CSSMediaRule && rule.media.mediaText.includes('print')) {
                  styles += rule.cssText + '\n';
                }
              });
            } catch (e) {
              // Cross-origin stylesheet, skip
            }
          });
        } catch (e) {
          console.warn('Could not extract all styles:', e);
        }
        return styles;
      };

      // Write the complete HTML document with print styles
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice - ${order.invoice_number}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @page {
                size: A4;
                margin: 12mm 16mm;
              }
              
              /* Responsive print styles for different paper sizes */
              @page :first {
                size: A4;
                margin: 12mm 16mm;
              }
              
              @media print and (orientation: landscape) {
                @page {
                  size: A4 landscape;
                  margin: 10mm 12mm;
                }
              }
              
              @media print and (max-width: 210mm) {
                @page {
                  size: A4;
                  margin: 10mm;
                }
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              
              html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background: white;
                font-family: Helvetica, Arial, sans-serif;
              }
              
              body {
                color: #111827;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              
              #invoice-preview-content {
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                min-height: auto !important;
                margin: 0 auto !important;
                background: white !important;
                padding: 16px !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                display: flex !important;
                flex-direction: column !important;
                box-sizing: border-box !important;
                font-size: clamp(7pt, 1.5vw, 9pt) !important;
              }
              
              /* Preserve all flex and layout styles */
              .flex { display: flex !important; }
              .items-start { align-items: flex-start !important; }
              .items-center { align-items: center !important; }
              .justify-between { justify-content: space-between !important; }
              .justify-end { justify-content: flex-end !important; }
              .justify-center { justify-content: center !important; }
              .flex-1 { flex: 1 !important; }
              
              /* Text alignment */
              .text-left { text-align: left !important; }
              .text-right { text-align: right !important; }
              .text-center { text-align: center !important; }
              
              /* Spacing */
              .mb-4 { margin-bottom: 16px !important; }
              .mb-3 { margin-bottom: 12px !important; }
              .mb-2 { margin-bottom: 8px !important; }
              .mb-1 { margin-bottom: 4px !important; }
              .mb-5 { margin-bottom: 20px !important; }
              .mt-4 { margin-top: 16px !important; }
              .mt-3 { margin-top: 12px !important; }
              .mt-2 { margin-top: 8px !important; }
              .mt-5 { margin-top: 20px !important; }
              .mt-auto { margin-top: auto !important; }
              .mr-3 { margin-right: 12px !important; }
              .pr-4 { padding-right: 16px !important; }
              .pr-2 { padding-right: 8px !important; }
              .pr-1 { padding-right: 4px !important; }
              .pl-2\\.5 { padding-left: 10px !important; }
              .p-2\\.5 { padding: 10px !important; }
              .p-1\\.5 { padding: 6px !important; }
              .py-0\\.75 { padding-top: 3px !important; padding-bottom: 3px !important; }
              .pt-3 { padding-top: 12px !important; }
              .pt-2 { padding-top: 8px !important; }
              .pt-1 { padding-top: 4px !important; }
              .pb-3 { padding-bottom: 12px !important; }
              .pb-2 { padding-bottom: 8px !important; }
              .pb-4 { padding-bottom: 16px !important; }
              .space-y-0\\.5 > * + * { margin-top: 2px !important; }
              
              /* Margin utilities for alignment */
              .ml-auto { margin-left: auto !important; }
              .mr-auto { margin-right: auto !important; }
              
              /* Borders */
              .border { border: 1px solid #e5e7eb !important; }
              .border-2 { border-width: 2px !important; }
              .border-b { border-bottom: 1px solid #e5e7eb !important; }
              .border-b-2 { border-bottom: 2px solid #e5e7eb !important; }
              .border-t { border-top: 1px solid #e5e7eb !important; }
              .border-t-2 { border-top: 2px solid #e5e7eb !important; }
              .border-l { border-left: 1px solid #e5e7eb !important; }
              .border-gray-200 { border-color: #e5e7eb !important; }
              .border-gray-300 { border-color: #d1d5db !important; }
              .border-gray-800 { border-color: #1f2937 !important; }
              
              /* Backgrounds */
              .bg-white { background-color: white !important; }
              .bg-gray-50 { background-color: #f9fafb !important; }
              .bg-gray-100 { background-color: #f3f4f6 !important; }
              
              /* Text colors */
              .text-gray-400 { color: #9ca3af !important; }
              .text-gray-500 { color: #6b7280 !important; }
              .text-gray-600 { color: #4b5563 !important; }
              .text-gray-700 { color: #374151 !important; }
              .text-gray-900 { color: #111827 !important; }
              .text-orange-600 { color: #ea580c !important; }
              .text-blue-600 { color: #273492 !important; }
              
              /* Font weights */
              .font-bold { font-weight: 700 !important; }
              .font-medium { font-weight: 500 !important; }
              .font-semibold { font-weight: 600 !important; }
              
              /* Font sizes - using pt for print */
              .text-\\[6pt\\] { font-size: 6pt !important; }
              .text-\\[7pt\\] { font-size: 7pt !important; }
              .text-\\[8pt\\] { font-size: 8pt !important; }
              .text-\\[9pt\\] { font-size: 9pt !important; }
              .text-\\[11pt\\] { font-size: 11pt !important; }
              .text-\\[14pt\\] { font-size: 14pt !important; }
              .text-\\[16pt\\] { font-size: 16pt !important; }
              .text-\\[20pt\\] { font-size: 20pt !important; }
              
              /* Width utilities - responsive */
              .w-\\[5\\%\\] { width: 5% !important; min-width: 30px !important; }
              .w-\\[6\\%\\] { width: 6% !important; min-width: 35px !important; }
              .w-\\[8\\%\\] { width: 8% !important; min-width: 40px !important; }
              .w-\\[10\\%\\] { width: 10% !important; min-width: 50px !important; }
              .w-\\[21\\%\\] { width: 21% !important; min-width: 80px !important; }
              .w-\\[22\\%\\] { width: 22% !important; min-width: 85px !important; }
              .w-\\[32\\%\\] { width: 32% !important; min-width: 120px !important; }
              .w-\\[35\\%\\] { width: 35% !important; min-width: 130px !important; }
              .w-\\[70px\\] { width: 70px !important; min-width: 50px !important; }
              .w-\\[110px\\] { width: 110px !important; min-width: 80px !important; }
              .w-\\[140px\\] { width: 140px !important; min-width: 100px !important; }
              .w-\\[150px\\] { width: 150px !important; min-width: 110px !important; }
              .w-\\[180px\\] { width: 180px !important; min-width: 130px !important; }
              .w-\\[240px\\] { width: 240px !important; min-width: 180px !important; }
              .w-\\[270px\\] { width: 270px !important; min-width: 200px !important; max-width: 100% !important; }
              .w-full { width: 100% !important; }
              
              /* Height utilities */
              .h-\\[70px\\] { height: 70px !important; }
              .min-h-\\[120px\\] { min-height: 120px !important; }
              .min-h-\\[842px\\] { min-height: 842px !important; }
              
              /* Leading */
              .leading-snug { line-height: 1.375 !important; }
              .leading-relaxed { line-height: 1.625 !important; }
              .leading-tight { line-height: 1.25 !important; }
              
              /* Tracking */
              .tracking-wide { letter-spacing: 0.025em !important; }
              .tracking-\\[0\\.3\\] { letter-spacing: 0.3px !important; }
              
              /* Text transform */
              .uppercase { text-transform: uppercase !important; }
              
              /* Display */
              .hidden { display: none !important; }
              
              /* Images - responsive */
              img {
                max-width: 100% !important;
                height: auto !important;
                object-fit: contain !important;
                display: block !important;
                width: auto !important;
              }
              
              /* QR Code SVG - responsive */
              svg {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
                width: auto !important;
              }
              
              /* Ensure all text elements are visible */
              p, span, div, h1, h2, h3, h4, h5, h6 {
                color: inherit;
                font-family: inherit;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              
              /* Table specific styles - responsive */
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: auto !important;
              }
              
              /* Ensure flex containers work in print */
              [style*="display: flex"] {
                display: flex !important;
              }
              
              /* Responsive text sizing */
              h1 { font-size: clamp(16pt, 4vw, 22pt) !important; }
              h2 { font-size: clamp(14pt, 3.5vw, 18pt) !important; }
              h3 { font-size: clamp(12pt, 3vw, 16pt) !important; }
              
              /* Responsive spacing */
              @media print and (max-width: 500px) {
                #invoice-preview-content {
                  padding: 10px !important;
                  font-size: 8pt !important;
                }
                
                .w-\\[270px\\] {
                  width: 100% !important;
                  max-width: 100% !important;
                }
              }
              
              @media print {
                @page {
                  size: A4;
                  margin: 12mm 16mm;
                }
                
                html, body {
                  width: 100% !important;
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  font-size: 9pt !important;
                }
                
                body {
                  padding: 0 !important;
                  margin: 0 !important;
                  display: block !important;
                  min-height: auto !important;
                }
                
                #invoice-preview-content {
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  padding: 12px !important;
                  page-break-inside: avoid;
                  box-shadow: none !important;
                  height: auto !important;
                  min-height: auto !important;
                  background: white !important;
                  font-size: clamp(7pt, 1.2vw, 9pt) !important;
                }
                
                /* Responsive table in print */
                .flex {
                  flex-wrap: wrap !important;
                }
                
                /* Ensure summary section stays right-aligned */
                .ml-auto {
                  margin-left: auto !important;
                  width: auto !important;
                  min-width: 200px !important;
                  max-width: 100% !important;
                }
                
                /* Hide any unwanted elements */
                .no-print {
                  display: none !important;
                }
                
                /* Ensure proper page breaks */
                * {
                  page-break-inside: avoid;
                }
                
                /* Force print colors */
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                /* Ensure images print */
                img {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  max-width: 100% !important;
                  height: auto !important;
                }
              }
              
              /* Landscape orientation */
              @media print and (orientation: landscape) {
                @page {
                  size: A4 landscape;
                  margin: 10mm 12mm;
                }
                
                #invoice-preview-content {
                  padding: 10px !important;
                  font-size: clamp(8pt, 1vw, 10pt) !important;
                }
              }
              
              /* Smaller paper sizes */
              @media print and (max-width: 210mm) {
                @page {
                  size: A4;
                  margin: 8mm;
                }
                
                #invoice-preview-content {
                  padding: 10px !important;
                  font-size: 8pt !important;
                }
                
                .w-\\[270px\\] {
                  width: 100% !important;
                  max-width: 100% !important;
                }
              }
            </style>
          </head>
          <body>
            ${invoiceClone.outerHTML}
            <script>
              // Auto-print when window loads
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  // Close window after print dialog is closed (or cancelled)
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }, 500);
              };
              
              // Also handle print event to close window
              window.addEventListener('afterprint', function() {
                setTimeout(function() {
                  window.close();
                }, 500);
              });
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    }, 800); // Increased timeout to ensure dialog is fully rendered
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
          {/* View Invoice Button */}
          <Button
            onClick={() => setShowInvoice(true)}
            variant="outline"
            disabled={isGenerating}
            size="sm"
            className="gap-2"
            title="View Invoice"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">View</span>
          </Button>

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

          {/* Print Button */}
          <Button
            onClick={handlePrint}
            variant="outline"
            disabled={isGenerating}
            size="sm"
            className="gap-2"
            title="Print Invoice"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
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

