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

/* ---------------- AI STREAM WITH FILE SUPPORT ---------------- */
async function generateAIResponse(prompt, conversationId, fileData = null) {
  let response = `I received your message: "${prompt}".`;
  
  // ✅ Add file context if file was uploaded
  if (fileData) {
    if (fileData.isImage) {
      response += `\n\n📷 I can see you've uploaded an image: "${fileData.filename}".`;
      response += `\n\nI can help you analyze this image, extract information, or answer questions about it.`;
    } else if (fileData.extractedText) {
      response += `\n\n📄 I've analyzed the PDF "${fileData.filename}" with ${fileData.pages} pages.`;
      response += `\n\nKey content from the document:\n${fileData.extractedText.substring(0, 300)}...`;
      response += `\n\nWhat specific information would you like me to help you find in this document?`;
    } else {
      response += `\n\n📎 I've received the file: "${fileData.filename}" (${(fileData.size / 1024).toFixed(2)} KB).`;
    }
  }
  
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

/* ---------------- WORKER LOOP WITH FILE SUPPORT ---------------- */
async function startWorker() {
  console.log("✅ Worker listening on chat:queue");

  while (true) {
    try {
      const data = await redis.blpop("chat:queue", 0);
      const payload = JSON.parse(data[1]);

      const { conversationId, prompt, fileData } = payload;

      if (!isUUID(conversationId) || !prompt) {
        console.warn("⚠️ Invalid payload, skipping");
        continue;
      }

      console.log("🔄 Processing:", conversationId);
      if (fileData) {
        console.log("📎 File attached:", fileData.filename);
        if (fileData.isImage) {
          console.log("   Type: Image");
        } else if (fileData.pages) {
          console.log(`   Type: PDF (${fileData.pages} pages)`);
        }
      }

      // 1️⃣ Save user message FIRST (critical for title update)
      let userMessage = prompt;
      if (fileData) {
        userMessage += `\n\n📎 Attached: ${fileData.filename}`;
      }
      await saveMessage(conversationId, "user", userMessage);
      console.log("✅ User message saved");

      // 2️⃣ Update title ONLY if still "New Chat" (first message only)
      await updateConversationTitle(conversationId, prompt);

      // 3️⃣ Stream AI response WITH FILE CONTEXT
      const ai = await generateAIResponse(prompt, conversationId, fileData);

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