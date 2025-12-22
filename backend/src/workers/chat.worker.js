import dotenv from "dotenv";
dotenv.config();

import { redis } from "../queue/redis.client.js";
import pg from "pg";
import { validate as isUUID } from "uuid";

const { Pool } = pg;

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

console.log("🤖 Chat Worker Starting...");
console.log("🟢 Redis instance exists:", !!redis);

/**
 * Simulated AI response
 */
async function generateAIResponse(prompt, conversationId) {
  const response = `I received your message: "${prompt}".`;

  const tokens = response.split(" ");

  for (const token of tokens) {
    await redis.rpush(
      `stream:${conversationId}`,
      JSON.stringify({ token: token + " ", done: false })
    );
    await new Promise((r) => setTimeout(r, 30));
  }

  await redis.rpush(
    `stream:${conversationId}`,
    JSON.stringify({ token: "", done: true })
  );

  return response;
}

/**
 * Save message
 */
async function saveMessage(conversationId, role, content) {
  await pool.query(
    `INSERT INTO messages (conversation_id, role, content)
     VALUES ($1, $2, $3)`,
    [conversationId, role, content]
  );
}

/**
 * Worker loop
 */
async function startWorker() {
  console.log("✅ Worker listening on chat:queue");

  while (true) {
    try {
      console.log("🟡 Waiting on BLPOP chat:queue");

      const data = await redis.blpop("chat:queue", 0);
      let payload;
try {
  payload = JSON.parse(data[1]);
} catch (err) {
  console.error("❌ Invalid JSON in Redis message:", data[1]);
  continue;
}


      const { conversationId, userId, prompt } = payload;

      if (!conversationId || !prompt) {
        console.warn("⚠️ Invalid payload:", payload);
        continue;
      }

      if (!isUUID(conversationId)) {
        console.warn("❌ Skipping invalid conversationId:", conversationId);
        continue;
      }

      console.log("\n🔄 Processing message");
      console.log("Conversation:", conversationId);
      console.log("User:", userId);
      console.log("Prompt:", prompt);

      await saveMessage(conversationId, "user", prompt);
      const aiResponse = await generateAIResponse(prompt, conversationId);
      await saveMessage(conversationId, "assistant", aiResponse);

      console.log("✅ Message processed");
    } catch (err) {
      console.error("❌ Worker error:", err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

startWorker();
