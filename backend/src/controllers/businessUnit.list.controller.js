import { getAllBusinessUnits } from "../../services/getAllBusinessUnits.service.js";

export async function getAllBusinessUnitsController(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: "ERROR",
        message: "userId is required"
      });
    }

    const result = await getAllBusinessUnits({ userId });

    return res.status(200).json(result);

  } catch (error) {
    console.error("Get Business Units error:", error);

    return res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch business units"
    });
  }
}
