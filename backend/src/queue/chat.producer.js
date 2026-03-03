import { redis } from './redis.client.js';
import { v4 as uuidv4 } from 'uuid';

const CHAT_QUEUE = 'chat:queue';

export async function enqueueChatMessage({
  conversationId,
  chatNumber,        // 🔥 ADD THIS
  userId,
  prompt,
  fileData = null    // optional
}) {
  const messageId = uuidv4();

  const payload = {
    id: messageId,
    conversationId,
    chatNumber,      // 🔥 ADD THIS
    userId,
    prompt,
    fileData,
    timestamp: Date.now()
  };

  await redis.rpush(CHAT_QUEUE, JSON.stringify(payload));

  return messageId;
}

export async function getQueueLength() {
  return redis.llen(CHAT_QUEUE);
}