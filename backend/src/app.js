import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import exportRoutes from "./routes/export.routes.js";
import fileRoutes from './routes/file.routes.js'

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        origin === "http://localhost:3000" ||
        origin.endsWith(".trycloudflare.com")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.options("*", cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/export", exportRoutes);
app.use('/api/files', fileRoutes)

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Backend is running" });
});

export default app;
