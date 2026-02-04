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

/* -------------------- Health Check -------------------- */
app.get("/", (req, res) => {
  res.json({ status: "Backend is running ✅" });
});

export default app;
