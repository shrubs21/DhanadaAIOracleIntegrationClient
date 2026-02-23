import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import exportRoutes from "./routes/export.routes.js";
import fileRoutes from "./routes/file.routes.js";
import integrationRoutes from "./routes/integration.routes.js";
import downloadRoutes from "./routes/download.routes.js";
import payrollDownloadRoutes from "./routes/payrollDownload.routes.js";
import dataRoutes from "./routes/data.routes.js";

import { generateInvoiceNumber } from "./controllers/invoice_number.controller.js";
import { validateBusinessUnitController } from "./controllers/businessUnit.controller.js";

import businessUnitRoutes from "./routes/businessUnit.routes.js";
import { getSuppliersByBUController } from "./controllers/supplier.controller.js";
import { supplierSitesController } from "./controllers/supplier.site.js";
import { createInvoiceController } from "./controllers/invoice.controller.js";
import { getInvoiceStatusController } from "./controllers/invoiceTracking.controller.js";
import supplierRoutes from "./routes/supplier.routes.js";

import invoiceRoutes from "./routes/invoice.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import suppliersRoute from "./routes/suppliers_list.js";





const app = express();

/* -------------------- Middleware -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- ✅ FIXED CORS (Cloudflare Ready) -------------------- */
app.use(
  cors({
    origin: "*", // ✅ Allow all origins (works for Cloudflare tunnel)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* -------------------- Routes -------------------- */
app.use("/api", dataRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api", downloadRoutes);
app.use("/api/payroll-download", payrollDownloadRoutes);

app.post("/api/generate-invoice-number", generateInvoiceNumber);
app.post("/api/validate-business-unit", validateBusinessUnitController);/*validate the bu with keyword*/
app.post("/api/suppliers-by-bu", getSuppliersByBUController);/*supplier get using the bu  id*/
app.use("/api", businessUnitRoutes);/*for getting all the bu */
app.post("/api/supplier-sites", supplierSitesController);
app.post("/api/create-invoice", createInvoiceController);/* invoice creation api*/
app.post("/api/invoice-status", getInvoiceStatusController);
app.use("/api", invoiceRoutes);
app.use("/api", customerRoutes);
app.use("/api", supplierRoutes);
app.use("/api/suppliers", suppliersRoute);



/* -------------------- Health Check -------------------- */
app.get("/", (req, res) => {
  res.json({ status: "Backend is running ✅" });
});

export default app;
