import express from 'express';
import {
  sendMessage,
  streamChat,
  createConversation,
  getConversations,
  getMessages,
  healthCheck
} from '../controllers/chat.controller.js';

import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/send', sendMessage);
router.get('/stream/:conversationId', streamChat);
router.post('/conversations', createConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.get('/health', healthCheck);

export default router;
