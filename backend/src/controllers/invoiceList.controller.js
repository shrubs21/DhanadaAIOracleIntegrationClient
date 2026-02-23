import { listInvoicesService } from "../../services/invoiceList.service.js";

export async function listInvoicesController(req, res) {
  try {

    const userId = req.user.id;  // ✅ GET FROM JWT

    const result = await listInvoicesService(userId);

    return res.json(result);

  } catch (error) {
    console.error("List invoices error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Server error"
    });
  }
}
