import { enqueueChatMessage, getQueueLength } from "../queue/chat.producer.js"
import { redis } from "../queue/redis.client.js"
import pool from "../config/db.js"
import { v4 as uuidv4 } from "uuid"
import jwt from "jsonwebtoken"

/**
 * POST /api/chat/send
 * ✅ ONLY enqueue user message
 * ❌ NO MCP
 * ❌ NO Oracle
 * ❌ NO OpenAI
 */
export async function sendMessage(req, res) {
  try {
    const userId = req.user.id
    const { message, conversationId, chatNumber,fileData } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" })
    }

    let convId = conversationId

    // ✅ Ensure conversation exists
    if (!convId) {
      convId = uuidv4()
      await pool.query(
        `INSERT INTO conversations (id, user_id, title)
         VALUES ($1, $2, $3)`,
        [convId, userId, "New Chat"]
      )
    } else {
      const exists = await pool.query(
        `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
        [convId, userId]
      )

      if (!exists.rows.length) {
        return res.status(403).json({ error: "Invalid conversation" })
      }
    }

    // ✅ Push ONLY raw user input to Redis
    await enqueueChatMessage({
      conversationId: convId,
      chatNumber: chatNumber,
      userId,
      prompt: message,
      fileData: fileData || null
    })

    return res.json({
      status: "queued",
      conversationId: convId
    })
  } catch (error) {
    console.error("❌ Send message error:", error)
    res.status(500).json({ error: "Failed to send message" })
  }
}

/**
 * GET /api/chat/stream/:conversationId
 * ✅ Server-Sent Events (SSE)
 * ✅ Auth via query param (browser-safe)
 */
export async function streamChat(req, res) {
  const { conversationId } = req.params
  const token = req.query.token

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" })
  }

  const userId = decoded.id

  // Optional ownership check
  const conv = await pool.query(
    `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
    [conversationId, userId]
  )

  if (!conv.rows.length) {
    return res.status(403).json({ error: "Conversation not found" })
  }

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
         LIMIT 1) AS first_message
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
 * PATCH/PUT /api/chat/conversations/:conversationId/rename
 * ✅ Rename conversation title
 */
export async function renameConversation(req, res) {
  try {
    const { conversationId } = req.params
    const { title } = req.body
    const userId = req.user.id

    // Validate title
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        error: 'Title is required',
        message: 'Please provide a valid title for the conversation'
      })
    }

    // Trim and validate length
    const trimmedTitle = title.trim()
    if (trimmedTitle.length > 200) {
      return res.status(400).json({ 
        error: 'Title too long',
        message: 'Title must be less than 200 characters'
      })
    }

    // Update conversation title
    const result = await pool.query(
      `UPDATE conversations 
       SET title = $1, updated_at = NOW() 
       WHERE id = $2 AND user_id = $3 
       RETURNING id, title, created_at, updated_at`,
      [trimmedTitle, conversationId, userId]
    )

    // Check if conversation was found and updated
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Conversation not found',
        message: 'The conversation does not exist or you do not have permission to rename it'
      })
    }

    console.log(`✅ Conversation renamed: ${conversationId} -> "${trimmedTitle}"`)

    res.json({ 
      success: true, 
      conversation: result.rows[0],
      message: 'Conversation renamed successfully'
    })
  } catch (error) {
    console.error('❌ Rename conversation error:', error)
    res.status(500).json({ 
      error: 'Failed to rename conversation',
      message: 'An error occurred while renaming the conversation'
    })
  }
}

/**
 * DELETE /api/chat/conversations/:conversationId
 */
export async function deleteConversation(req, res) {
  try {
    const { conversationId } = req.params
    const userId = req.user.id

    await pool.query(`DELETE FROM messages WHERE conversation_id = $1`, [conversationId])
    await pool.query(
      `DELETE FROM conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, userId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error("❌ Delete conversation error:", error)
    res.status(500).json({ error: "Failed to delete conversation" })
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
      queueLength
    })
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message })
  }
}