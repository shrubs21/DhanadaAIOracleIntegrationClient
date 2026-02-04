import { callOracleAPI } from "./oracle.client.js";

export async function oracleInvoiceTool({ tool, params, userId }) {

  // ✅ Create Invoice
  if (tool === "oracle_invoice_create") {
    return await callOracleAPI({
      userId,
      product: "ERP",
      method: "POST",
      endpoint: "/invoices",
      payload: {
        Supplier: params.supplier,
        SupplierSite: params.site,
        InvoiceAmount: params.amount,
        Currency: "USD",
        Description: "Created via AI Copilot"
      }
    });
  }

  // ✅ Status Tracking
  if (tool === "oracle_invoice_status") {
    return await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: `/invoices/${params.invoiceId}`
    });
  }

  // ✅ Cancel Invoice
  if (tool === "oracle_invoice_cancel") {
    return await callOracleAPI({
      userId,
      product: "ERP",
      method: "PATCH",
      endpoint: `/invoices/${params.invoiceId}`,
      payload: { Status: "Cancelled" }
    });
  }

  // ✅ Delete Invoice
  if (tool === "oracle_invoice_delete") {
    return await callOracleAPI({
      userId,
      product: "ERP",
      method: "DELETE",
      endpoint: `/invoices/${params.invoiceId}`
    });
  }

  // ✅ List Invoices
  if (tool === "oracle_invoice_list") {
    return await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: "/invoices",
      queryParams: { limit: params.limit || 10 }
    });
  }

  // ✅ Unpaid Invoices
  if (tool === "oracle_invoice_unpaid") {
    return await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: "/invoices",
      queryParams: {
        q: "PaidStatus='Unpaid'",
        limit: params.limit || 10
      }
    });
  }

  return { error: "Unsupported Invoice Tool" };
}
