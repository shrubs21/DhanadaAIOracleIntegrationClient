import express from "express";
import {
  validateSupplierInput,
  validateBusinessUnit,
  getAllBusinessUnits,
  createSupplier,
 
} from "../controllers/supplier_agent.controller.js";

const router = express.Router();

router.post("/validate-supplier-input", validateSupplierInput);
router.post("/validate-business-unit", validateBusinessUnit);
router.post("/business-units", getAllBusinessUnits);
router.post("/create-supplier", createSupplier);


export default router;