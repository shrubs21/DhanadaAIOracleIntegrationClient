import express from "express";
import { oracleTool } from "./tools/oracle.tool.js";
import Redis from "ioredis";

const app = express();
app.use(express.json());

// Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379
});

redis.on("connect", () => console.log("🟢 MCP Redis connected"));
redis.on("error", err => console.error("🔴 MCP Redis error", err));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// MCP endpoint
app.post("/mcp", async (req, res) => {
  try {
    const { userId, product, tool, args } = req.body;

    if (tool !== "oracle.fetch" && tool !== "oracle_fetch") {
      return res.status(400).json({ error: "Unknown tool" });
    }

    const result = await oracleTool({
      userId,
      product,
      query: args?.query || ""
    });

    res.json({
      role: "tool",
      name: tool,
      content: JSON.stringify(result)
    });
  } catch (err) {
    console.error(" MCP Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`MCP Server listening on port ${PORT}`);
});
