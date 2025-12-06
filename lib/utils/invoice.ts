import { createClient } from "@/lib/supabase/client";

/**
 * Generate auto-invoice number in format: GLAORD-YYYYMMDD-XXXX
 * Example: GLAORD-20241202-0001
 * ✅ FIX: Checks for duplicates and retries if needed
 */
export async function generateInvoiceNumber(): Promise<string> {
  const supabase = createClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  // Try up to 10 times to find a unique invoice number
  for (let attempt = 0; attempt < 10; attempt++) {
    // Generate random 4-digit number
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const invoiceNumber = `GLAORD-${datePrefix}-${random}`;
    
    // Check if this invoice number already exists
    const { data, error } = await supabase
      .from("orders")
      .select("invoice_number")
      .eq("invoice_number", invoiceNumber)
      .limit(1)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if not found
    
    // If no data found (error code PGRST116 or null data), this invoice number is available
    if (error && error.code === 'PGRST116') {
      return invoiceNumber;
    }
    
    // If we got no data, it means the invoice number doesn't exist (unique)
    if (!data) {
      return invoiceNumber;
    }
    
    // If we got data, it means the invoice number exists, try again
  }
  
  // Fallback: use timestamp if all random attempts fail
  const timestamp = Date.now().toString().slice(-6);
  return `GLAORD-${datePrefix}-${timestamp}`;
}

