import { redis } from "../mcp-server/src/queue/redis.client.js";

// services/invoice.session.service.js

export async function getSession(sessionId) {
  const data = await redis.get(`invoice:${sessionId}`);
  return data ? JSON.parse(data) : {};
}

export async function updateSession(sessionId, updates) {
  const current = await getSession(sessionId);
  const updated = { ...current, ...updates };

  // ✅ Set session with 3 minutes expiry (180 seconds)
  await redis.set(
    `invoice:${sessionId}`,
    JSON.stringify(updated),
    "EX",
    180
  );

  return updated;
}
