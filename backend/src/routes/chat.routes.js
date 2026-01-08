import express from 'express'
import { authenticateToken } from '../middlewares/auth.middleware.js'
import {
  sendMessage,
  streamChat,
  createConversation,
  getConversations,
  getMessages,
  deleteConversation,
  healthCheck
} from '../controllers/chat.controller.js'

const router = express.Router()

// 💬 Send message (queue to Redis)
router.post('/send', authenticateToken, sendMessage)

// 📡 Stream chat (SSE)
router.get('/stream/:conversationId', authenticateToken, streamChat)

// 📂 Conversations
router.post('/conversations', authenticateToken, createConversation)
router.get('/conversations', authenticateToken, getConversations)
router.get('/conversations/:conversationId/messages', authenticateToken, getMessages)
router.delete('/conversations/:conversationId', authenticateToken, deleteConversation)

// 🏥 Health check
router.get('/health', healthCheck)

export default router