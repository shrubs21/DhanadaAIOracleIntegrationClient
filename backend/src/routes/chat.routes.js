import express from 'express'
import { authenticateToken } from '../middlewares/auth.middleware.js'
import {
  sendMessage,
  streamChat,
  createConversation,
  getConversations,
  getMessages,
  deleteConversation,
  renameConversation, // ✅ NEW IMPORT
  healthCheck
} from '../controllers/chat.controller.js'

const router = express.Router()

/**
 * -----------------------------
 * CHAT MESSAGE (JWT REQUIRED)
 * -----------------------------
 * UI sends message → queued to Redis
 */
router.post('/send', authenticateToken, sendMessage)

/**
 * -----------------------------
 * STREAM CHAT (NO JWT ❗❗❗)
 * -----------------------------
 * ⚠️ IMPORTANT:
 * EventSource / SSE CANNOT send Authorization headers
 * If JWT is applied here → stream will BREAK
 */
router.get('/stream/:conversationId', streamChat)

/**
 * -----------------------------
 * CONVERSATIONS (JWT REQUIRED)
 * -----------------------------
 */
router.post('/conversations', authenticateToken, createConversation)
router.get('/conversations', authenticateToken, getConversations)
router.get(
  '/conversations/:conversationId/messages',
  authenticateToken,
  getMessages
)

/**
 * -----------------------------
 * RENAME CONVERSATION (JWT REQUIRED) ✅ NEW
 * -----------------------------
 */
router.patch(
  '/conversations/:conversationId/rename',
  authenticateToken,
  renameConversation
)

// Alternative PUT method for compatibility
router.put(
  '/conversations/:conversationId/rename',
  authenticateToken,
  renameConversation
)

router.delete(
  '/conversations/:conversationId',
  authenticateToken,
  deleteConversation
)

/**
 * -----------------------------
 * HEALTH CHECK
 * -----------------------------
 */
router.get('/health', healthCheck)

export default router