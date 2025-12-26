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
 * Simulated AI response (streaming)
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
 * 🔥 FIX: Update conversation title with proper logging
 */
async function updateConversationTitle(conversationId, prompt) {
  try {
    const title = prompt.trim().slice(0, 60) + (prompt.trim().length > 60 ? "..." : "");
    
    const result = await pool.query(
      `
      UPDATE conversations
      SET title = $2, updated_at = NOW()
      WHERE id = $1
      AND title IN ('New Chat', 'New Conversation')
      RETURNING id, title
      `,
      [conversationId, title]
    );

    if (result.rowCount > 0) {
      console.log(`✅ Title updated to: "${title}"`);
    } else {
      console.log(`⚠️ Title NOT updated (already has custom title or not found)`);
    }

    return result.rows[0];
  } catch (error) {
    console.error("❌ Failed to update conversation title:", error);
    // Don't throw - continue processing even if title update fails
  }
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

      // ✅ 1. Save USER message
      await saveMessage(conversationId, "user", prompt);

      // 🔥 2. Update conversation title (with proper logging and error handling)
      await updateConversationTitle(conversationId, prompt);

      // ✅ 3. Generate + stream AI response
      const aiResponse = await generateAIResponse(prompt, conversationId);

      // ✅ 4. Save ASSISTANT message
      await saveMessage(conversationId, "assistant", aiResponse);

      console.log("✅ Message processed\n");
    } catch (err) {
      console.error("❌ Worker error:", err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

startWorker();