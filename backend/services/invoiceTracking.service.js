import { callOracleAPI } from "../mcp-server/src/tools/oracle.client.js";
import pool from "../src/config/db.js";


export async function getInvoiceStatusService({ userId, invoiceNumber }) {

  if (!userId || !invoiceNumber) {
    return { status: "ERROR", message: "userId and invoiceNumber required" };
  }

  try {

    const response = await callOracleAPI({
      userId,
      product: "ERP",
      endpoint: `/invoices`,
      queryParams: {
        q: `InvoiceNumber='${invoiceNumber}'`
      }
    });

    const invoice = response?.items?.[0];

    if (!invoice) {
      return { status: "NOT_FOUND" };
    }

    const approvalStatus = invoice.ApprovalStatus || "Unknown";
    const paymentStatus = invoice.PaymentStatus || "Unpaid";
    const amountPaid = invoice.AmountPaid || 0;
    const remainingAmount =
      Number(invoice.InvoiceAmount || 0) - Number(amountPaid);

    // 🔥 OPTIONAL (Recommended): Update local DB
    await pool.query(
      `UPDATE public.invoices
       SET approval_status = $1,
           payment_status = $2,
           amount_paid = $3,
           remaining_amount = $4,
           last_synced_at = NOW()
       WHERE invoice_number = $5`,
      [
        approvalStatus,
        paymentStatus,
        amountPaid,
        remainingAmount,
        invoiceNumber
      ]
    );

    return {
      status: "SUCCESS",
      invoice: {
        invoiceId: invoice.InvoiceId,
        invoiceNumber: invoice.InvoiceNumber,
        approvalStatus,
        amount: invoice.InvoiceAmount,
        currency: invoice.InvoiceCurrency,
        businessUnit: invoice.BusinessUnit,
        supplier: invoice.Supplier,
        supplierSite: invoice.SupplierSite,
        invoiceDate: invoice.InvoiceDate,
        creationDate: invoice.CreationDate,
        paymentStatus,
        amountPaid,
        remainingAmount
      }
    };

  } catch (error) {

    return {
      status: "ERROR",
      message: error.message
    };
  }
}
