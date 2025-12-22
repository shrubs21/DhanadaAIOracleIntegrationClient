import "dotenv/config";

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";  // ← ADD THIS

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);  // ← ADD THIS

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Backend is running" });
});

export default app;