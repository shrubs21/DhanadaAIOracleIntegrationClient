// src/controllers/invoice_number.controller.js

/**
 * Generate Invoice Number
 * Format: INV-YYYYMMDDHHMMSSmmm
 */
export const generateInvoiceNumber = (req, res) => {
  try {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

    const invoiceNumber = `INV-${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;

    return res.status(200).json({
      success: true,
      invoice_number: invoiceNumber,
    });

  } catch (error) {
    console.error("Invoice generation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate invoice number",
    });
  }
};