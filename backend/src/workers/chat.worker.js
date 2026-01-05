import dotenv from "dotenv";
dotenv.config();

import { redis } from "../queue/redis.client.js";
import pg from "pg";
import { validate as isUUID } from "uuid";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres123",
  database: process.env.DB_NAME || "oracle_ai",
});


console.log("🤖 Chat Worker Starting...");
console.log("🟢 Redis connected:", !!redis);

/* ---------------- AI STREAM ---------------- */
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

/* ---------------- DB HELPERS ---------------- */
async function saveMessage(conversationId, role, content) {
  await pool.query(
    `INSERT INTO messages (conversation_id, role, content)
     VALUES ($1, $2, $3)`,
    [conversationId, role, content]
  );
}

// 🔥 FIXED: Update title ONLY if it's still "New Chat", NULL, or empty
async function updateConversationTitle(conversationId, prompt) {
  try {
    const title =
      prompt.trim().slice(0, 60) +
      (prompt.trim().length > 60 ? "..." : "");

    const result = await pool.query(
      `
      UPDATE conversations
      SET title = $2
      WHERE id = $1
      AND (title = 'New Chat' OR title IS NULL OR title = '' OR title = 'New Conversation')
      RETURNING id, title
      `,
      [conversationId, title]
    );

    if (result.rowCount > 0) {
      console.log(`✅ Title updated to: "${title}"`);
    } else {
      console.log(`⚠️ Title already set (not "New Chat")`);
    }
  } catch (error) {
    console.error("❌ Title update failed:", error);
    // Don't throw - continue processing
  }
}

/* ---------------- WORKER LOOP ---------------- */
async function startWorker() {
  console.log("✅ Worker listening on chat:queue");

  while (true) {
    try {
      const data = await redis.blpop("chat:queue", 0);
      const payload = JSON.parse(data[1]);

      const { conversationId, prompt } = payload;

      if (!isUUID(conversationId) || !prompt) {
        console.warn("⚠️ Invalid payload, skipping");
        continue;
      }

      console.log("🔄 Processing:", conversationId);

      // 1️⃣ Save user message FIRST (critical for title update)
      await saveMessage(conversationId, "user", prompt);
      console.log("✅ User message saved");

      // 2️⃣ Update title ONLY if still "New Chat" (first message only)
      await updateConversationTitle(conversationId, prompt);

      // 3️⃣ Stream AI response
      const ai = await generateAIResponse(prompt, conversationId);

      // 4️⃣ Save assistant message
      await saveMessage(conversationId, "assistant", ai);
      console.log("✅ Assistant message saved");

      console.log("✅ Done:", conversationId, "\n");
    } catch (err) {
      console.error("❌ Worker error:", err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

startWorker();