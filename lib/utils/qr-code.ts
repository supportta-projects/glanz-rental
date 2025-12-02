import QRCode from "qrcode";

/**
 * Generate QR code as base64 data URL for embedding in PDFs
 * @param text - The text/data to encode in the QR code
 * @param size - The size of the QR code in pixels (default: 200)
 * @returns Base64 data URL string
 */
export async function generateQRCodeDataURL(
  text: string,
  size: number = 200
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    // Return a placeholder if QR generation fails
    return "";
  }
}

