/**
 *  Oracle ERP Invoice Agent Router
 * Converts user natural requests into structured ERP actions
 */

export function invoiceAgentRouter(prompt) {
  const p = prompt.toLowerCase();

  //  Create Invoice Intent
  if (p.includes("create invoice") || p.includes("create payable invoice")) {
    const supplierMatch = prompt.match(/for (\w+)/i);
    const amountMatch = prompt.match(/amount (\d+)/i);

    if (!supplierMatch) {
      return { ask: " Which supplier invoice should I create?" };
    }

    if (!amountMatch) {
      return { ask: " What invoice amount?" };
    }

    return {
      action: "CREATE_INVOICE",
      params: {
        supplier: supplierMatch[1],
        amount: Number(amountMatch[1]),
      },
    };
  }

  //  Cancel Invoice
  if (p.includes("cancel invoice")) {
    const idMatch = prompt.match(/\b\d{6,15}\b/);
    if (!idMatch) {
      return { ask: " Please provide invoice ID to cancel." };
    }

    return {
      action: "CANCEL_INVOICE",
      params: { invoiceId: idMatch[0] },
    };
  }

  //  Track Invoice Status
  if (p.includes("track invoice") || p.includes("invoice status")) {
    const idMatch = prompt.match(/\b\d{6,15}\b/);

    if (!idMatch) {
      return { ask: " Provide invoice ID to track." };
    }

    return {
      action: "TRACK_INVOICE",
      params: { invoiceId: idMatch[0] },
    };
  }

  //  General FAQ
  if (p.includes("how to create invoice")) {
    return {
      action: "FAQ",
      answer: `
 How to Create Invoice in Oracle Payables:

1. Payables → Invoices → Create Invoice
2. Select Supplier
3. Enter Amount + Date
4. Validate Invoice
5. Submit for Approval
6. Pay invoice through Payment Process Request
      `,
    };
  }

  // Default = normal fetch flow
  return { action: "FETCH" };
}
