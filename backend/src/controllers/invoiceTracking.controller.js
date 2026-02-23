import { getInvoiceStatusService } from "../../services/invoiceTracking.service.js";

export async function getInvoiceStatusController(req, res) {

  const { userId, invoiceNumber } = req.body;

  const result = await getInvoiceStatusService({
    userId,
    invoiceNumber
  });

  res.json(result);
}
