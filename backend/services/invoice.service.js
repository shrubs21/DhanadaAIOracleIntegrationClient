import { callOracleAPI } from "../mcp-server/src/tools/oracle.client.js";

export async function createInvoiceService({
  userId,
  invoiceNumber,
  invoiceDate,
  amount,
  currency,
  businessUnitName,
  supplierName,
  siteName,
  description,
  invoiceType
}) {

  if (!userId) {
    return { status: "ERROR", message: "userId required" };
  }

  try {

    // Clean Oracle Payload
    const payload = {
      InvoiceNumber: String(invoiceNumber),
      InvoiceDate: invoiceDate,
      InvoiceAmount: Number(amount),
      InvoiceCurrency: currency,
      BusinessUnit: businessUnitName,
      Supplier: supplierName,
      SupplierSite: siteName,
      InvoiceType: invoiceType || "Standard",
      Description: description || ""
    };

    console.log(" Sending to Oracle:", payload);

    const response = await callOracleAPI({
      userId,
      product: "ERP",
      method: "POST",
      endpoint: "/invoices",
      payload
    });

    return {
      status: "SUCCESS",
      invoice: {
        invoiceId: response.InvoiceId,
        invoiceNumber: response.InvoiceNumber,
        amount: response.InvoiceAmount,
        currency: response.InvoiceCurrency,
        businessUnit: response.BusinessUnit,
        supplier: response.Supplier,
        supplierSite: response.SupplierSite,
        creationDate: response.CreationDate
      }
    };

  } catch (error) {

    console.error("Create Invoice Error:", error.message);

    return {
      status: "ERROR",
      message: error.message
    };
  }
}
