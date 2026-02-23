import { getSuppliersByBusinessUnit } from "../../services/supplierByBU.service.js";

export async function getSuppliersByBUController(req, res) {
  try {
    const { userId, businessUnitId } = req.body;

    const result = await getSuppliersByBusinessUnit({
      userId,
      businessUnitId
    });

    return res.json(result);

  } catch (error) {
    console.error("Supplier by BU error:", error);

    return res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch suppliers"
    });
  }
}
