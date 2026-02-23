/**
 * ============================================
 * ORACLE INVOICE SESSION MANAGER
 * ============================================
 * Manages user sessions, draft invoices, and conversation state in Redis
 */

export class InvoiceSessionManager {
  constructor(redis) {
    this.redis = redis;
    this.sessionTTL = 3600; // 1 hour
  }

  /**
   * Get user session (draft + context)
   */
  async getSession(userId) {
    try {
      const sessionKey = `invoice:session:${userId}`;
      const data = await this.redis.get(sessionKey);
      
      if (!data) {
        return {
          userId,
          draft: null,
          context: {},
          createdAt: Date.now(),
        };
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Session get error:', error);
      return {
        userId,
        draft: null,
        context: {},
        createdAt: Date.now(),
      };
    }
  }

  /**
   * Update draft invoice in session
   */
  async updateDraft(userId, draft) {
    try {
      const session = await this.getSession(userId);
      
      session.draft = {
        ...session.draft,
        ...draft,
        updatedAt: Date.now(),
      };

      const sessionKey = `invoice:session:${userId}`;
      await this.redis.setex(
        sessionKey,
        this.sessionTTL,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      console.error('Session update error:', error);
      throw error;
    }
  }

  /**
   * Clear draft (after creation or cancellation)
   */
  async clearDraft(userId) {
    try {
      const session = await this.getSession(userId);
      session.draft = null;
      session.lastClearedAt = Date.now();

      const sessionKey = `invoice:session:${userId}`;
      await this.redis.setex(
        sessionKey,
        this.sessionTTL,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      console.error('Session clear error:', error);
      throw error;
    }
  }

  /**
   * Store context (e.g., last viewed invoices, preferences)
   */
  async updateContext(userId, context) {
    try {
      const session = await this.getSession(userId);
      
      session.context = {
        ...session.context,
        ...context,
      };

      const sessionKey = `invoice:session:${userId}`;
      await this.redis.setex(
        sessionKey,
        this.sessionTTL,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      console.error('Context update error:', error);
      throw error;
    }
  }

  /**
   * Get conversation history (last N messages)
   */
  async getHistory(userId, limit = 10) {
    try {
      const historyKey = `invoice:history:${userId}`;
      const messages = await this.redis.lrange(historyKey, 0, limit - 1);
      return messages.map(m => JSON.parse(m));
    } catch (error) {
      console.error('History get error:', error);
      return [];
    }
  }

  /**
   * Add message to conversation history
   */
  async addToHistory(userId, role, content) {
    try {
      const historyKey = `invoice:history:${userId}`;
      const message = {
        role,
        content,
        timestamp: Date.now(),
      };

      await this.redis.lpush(historyKey, JSON.stringify(message));
      await this.redis.ltrim(historyKey, 0, 49); // Keep last 50 messages
      await this.redis.expire(historyKey, this.sessionTTL);
    } catch (error) {
      console.error('History add error:', error);
    }
  }

  /**
   * Delete entire session
   */
  async deleteSession(userId) {
    try {
      const sessionKey = `invoice:session:${userId}`;
      const historyKey = `invoice:history:${userId}`;
      
      await this.redis.del(sessionKey);
      await this.redis.del(historyKey);
    } catch (error) {
      console.error('Session delete error:', error);
    }
  }
}