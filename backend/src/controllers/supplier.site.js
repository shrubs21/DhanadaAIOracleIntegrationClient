import { validateSupplierSite } from "../../services/supplier.service.js";

/**
 * Controller: Supplier Sites
 */
export async function supplierSitesController(req, res) {
  try {
    const { userId, supplierId , businessUnitId} = req.body;

    if (!userId || !supplierId ) {
      return res.status(400).json({
        status: "ERROR",
        message: "userId and supplierId are required"
      });
    }

    const result = await validateSupplierSite({
      userId,
      supplierId,
      businessUnitId
    });

    return res.json(result);

  } catch (error) {
    console.error("supplierSitesController error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: error.message
    });
  }
}
