/**
 * Generate auto-invoice number in format: GLAORD-YYYYMMDD-XXXX
 * Example: GLAORD-20241202-0001
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  
  return `GLAORD-${year}${month}${day}-${random}`;
}

