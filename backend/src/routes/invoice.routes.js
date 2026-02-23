import express from "express";
import { listInvoicesController } from "../controllers/invoiceList.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Protected route
router.get("/invoices", authenticateToken, listInvoicesController);

export default router;
