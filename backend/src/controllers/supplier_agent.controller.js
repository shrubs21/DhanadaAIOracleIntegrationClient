import { validateSupplierInputService } from "../../services/supplier/validation.service.js";
import {
  validateProcurementBU,
  getAllProcurementBUs
} from "../../services/supplier/businessUnit.service.js";

import { createFullSupplierService } from "../../services/supplier/supplier.service.js";

/* ================= VALIDATE SUPPLIER INPUT ================= */
export async function validateSupplierInput(req, res) {
  try {
    const result = validateSupplierInputService(req.body);

    if (result.status === "INVALID") {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function validateBusinessUnit(req, res) {
  try {
    const { userId, businessUnitName } = req.body;

    const result = await validateProcurementBU({
      userId,
      procurementBUName: businessUnitName
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
export async function getAllBusinessUnits(req, res) {
  try {
    const { userId } = req.body;

    const result = await getAllProcurementBUs({ userId });

    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
/* ================= CREATE SUPPLIER ================= */

export async function createSupplier(req, res) {
  try {
    const result = await createFullSupplierService(req.body);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
