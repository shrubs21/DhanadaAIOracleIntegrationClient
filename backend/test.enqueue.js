import { enqueueChatMessage } from './src/queue/chat.producer.js';

await enqueueChatMessage({
  conversationId: 'conv-test',
  userId: 1,
  prompt: 'Hello Redis'
});

console.log('Message sent');
process.exit(0);
