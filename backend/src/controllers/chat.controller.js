import { enqueueChatMessage, getQueueLength } from "../queue/chat.producer.js"
import { redis } from "../queue/redis.client.js"
import pool from "../config/db.js"
import { v4 as uuidv4 } from "uuid"

/**
 * POST /api/chat/send
 * Queue a user message into Redis
 */
export async function sendMessage(req, res) {
  try {
    const userId = req.user.id
    let { prompt, conversationId } = req.body

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" })
    }

    // ✅ Ensure conversation exists
    if (!conversationId) {
      conversationId = uuidv4()

      await pool.query(
        `INSERT INTO conversations (id, user_id, title)
         VALUES ($1, $2, $3)`,
        [conversationId, userId, "New Chat"]
      )
    } else {
      const exists = await pool.query(
        `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
      )

      if (!exists.rows.length) {
        return res.status(403).json({ error: "Invalid conversation" })
      }
    }

  // ✅ Push message into Redis queue
await enqueueChatMessage({
  conversationId,
  userId,
  prompt
})

// 🔥 AUTO-UPDATE CONVERSATION TITLE (Claude-like)
const smartTitle = prompt && prompt.trim().length
  ? (prompt.trim().slice(0, 60) + (prompt.trim().length > 60 ? "..." : ""))
  : "New Chat"

// 🔥 Update title ONLY for first user message (ChatGPT/Claude style)
await pool.query(
  `
  UPDATE conversations c
  SET title = $2
  WHERE c.id = $1
  AND NOT EXISTS (
    SELECT 1
    FROM messages
    WHERE conversation_id = c.id
    AND role = 'user'
  )
  `,
  [conversationId, smartTitle]
)


// ✅ Respond to UI
res.json({
  status: "queued",
  conversationId
})


  } catch (error) {
    console.error("❌ Send message error:", error)
    res.status(500).json({ error: "Failed to send message" })
  }
}

/**
 * GET /api/chat/stream/:conversationId
 * Server-Sent Events (AI streaming)
 */
export async function streamChat(req, res) {
  const { conversationId } = req.params

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")

  const streamKey = `stream:${conversationId}`

  try {
    while (true) {
      const data = await redis.blpop(streamKey, 0)
      if (!data) continue

      const chunk = JSON.parse(data[1])
      res.write(`data: ${JSON.stringify(chunk)}\n\n`)

      if (chunk.done) {
        res.end()
        break
      }
    }
  } catch (error) {
    console.error("❌ Stream error:", error)
    res.end()
  }
}

/**
 * POST /api/chat/conversations
 */
export async function createConversation(req, res) {
  try {
    const userId = req.user.id
    const { title } = req.body

    const conversationId = uuidv4()

    const result = await pool.query(
      `INSERT INTO conversations (id, user_id, title)
       VALUES ($1, $2, $3)
       RETURNING id, title, created_at`,
      [conversationId, userId, title || "New Conversation"]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("❌ Create conversation error:", error)
    res.status(500).json({ error: "Failed to create conversation" })
  }
}

/**
 * GET /api/chat/conversations
 * ✅ UPDATED: Now includes first_message for smart chat names
 */
export async function getConversations(req, res) {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT 
        c.id, 
        c.title, 
        c.created_at,
        (SELECT content 
         FROM messages 
         WHERE conversation_id = c.id 
         AND role = 'user' 
         ORDER BY created_at ASC 
         LIMIT 1) as first_message
       FROM conversations c
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error("❌ Get conversations error:", error)
    res.status(500).json({ error: "Failed to fetch conversations" })
  }
}

/**
 * GET /api/chat/conversations/:conversationId/messages
 */
export async function getMessages(req, res) {
  try {
    const { conversationId } = req.params
    const userId = req.user.id

    const conv = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, userId]
    )

    if (!conv.rows.length) {
      return res.status(404).json({ error: "Conversation not found" })
    }

    const result = await pool.query(
      `SELECT role, content, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error("❌ Get messages error:", error)
    res.status(500).json({ error: "Failed to fetch messages" })
  }
}

/**
 * GET /api/chat/health
 */
export async function healthCheck(req, res) {
  try {
    const queueLength = await getQueueLength()

    res.json({
      status: "ok",
      redis: redis.status === "ready",
      queueLength,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    })
  }
}