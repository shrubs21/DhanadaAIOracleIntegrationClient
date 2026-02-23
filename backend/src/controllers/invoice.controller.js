import { createInvoiceService } from "../../services/invoice.service.js";


export async function createInvoiceController(req, res) {
  try {

    const result = await createInvoiceService(req.body);

    return res.json(result);

  } catch (error) {

    console.error("Controller Error:", error);

    return res.status(500).json({
      status: "ERROR",
      message: "Invoice creation failed"
    });
  }
}

