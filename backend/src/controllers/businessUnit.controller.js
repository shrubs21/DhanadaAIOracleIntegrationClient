import { validateBusinessUnit } from "../../services/validateBusinessUnit.service.js";

export async function validateBusinessUnitController(req, res) {
  try {
    const { userId, businessUnitName } = req.body;

    const result = await validateBusinessUnit({
      userId,
      businessUnitName
    });

    return res.json(result);

  } catch (error) {
    console.error("Business Unit validation error:", error);

    return res.status(500).json({
      status: "ERROR",
      message: "Business Unit validation failed"
    });
  }
}
