/**
 * ============================================
 * ORACLE INVOICE COPILOT - OPENAI AGENT
 * ============================================
 * Real LLM-powered intent recognition using OpenAI (GPT-4o-mini)
 * Matches your existing OpenRouter pattern
 */

import { INVOICE_SYSTEM_PROMPT } from './invoice.agent.prompt.js';
import { InvoiceSessionManager } from './invoice.session.js';

export class InvoiceAgent {
  constructor(config = {}) {
    this.openRouterKey = config.openRouterKey || process.env.OPENROUTER_API_KEY;
    this.sessionManager = new InvoiceSessionManager(config.redis);
    this.model = config.model || 'openai/gpt-4o-mini';
  }

  /**
   * Main entry point - processes invoice queries using OpenAI
   */
  async processQuery(userId, userMessage, conversationHistory = []) {
    try {
      // Get session state (drafts, context)
      const session = await this.sessionManager.getSession(userId);

      // Build messages with context
      const messages = this._buildMessages(userMessage, conversationHistory, session);

      // Call OpenAI via OpenRouter (same as your existing worker)
      const response = await this._callOpenAI({
        messages,
        temperature: 0.2, // Low temp for consistent invoice handling
      });

      const choice = response.choices[0].message;

      // Parse LLM decision from response
      const decision = this._parseAgentResponse(choice.content);

      // Execute based on decision type
      return await this._executeDecision(userId, decision, session);

    } catch (error) {
      console.error('Invoice Agent Error:', error);
      return {
        type: 'error',
        message: 'Sorry, I encountered an error processing your invoice request.',
        error: error.message,
      };
    }
  }

  /**
   * Call OpenAI via OpenRouter (exactly like your worker)
   */
  async _callOpenAI(payload) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:4000",
        "X-Title": "Oracle Invoice Copilot"
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        ...payload
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter error: ${err}`);
    }

    return res.json();
  }

  /**
   * Build conversation messages for OpenAI
   */
  _buildMessages(userMessage, history, session) {
    const messages = [
      { role: 'system', content: INVOICE_SYSTEM_PROMPT }
    ];

    // Add recent conversation history (last 5 turns)
    const recentHistory = history.slice(-5);
    for (const turn of recentHistory) {
      messages.push({
        role: turn.role,
        content: turn.content
      });
    }

    // Add current message with session context
    let contextualMessage = userMessage;
    
    if (session.draft) {
      contextualMessage = `[DRAFT IN PROGRESS: ${JSON.stringify(session.draft)}]\n\nUser: ${userMessage}`;
    }

    messages.push({ role: 'user', content: contextualMessage });

    return messages;
  }

  /**
   * Parse LLM response to extract structured decision
   */
  _parseAgentResponse(content) {
    if (!content) {
      return {
        type: 'conversational',
        message: 'I can help with Oracle invoices.',
      };
    }

    // Try to extract JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]);
        // Validate it has required fields
        if (decision.type) {
          return decision;
        }
      }
    } catch (e) {
      // Not JSON, treat as conversational
    }

    // Default: conversational response
    return {
      type: 'conversational',
      message: content,
    };
  }

  /**
   * Execute the LLM's decision
   */
  async _executeDecision(userId, decision, session) {
    switch (decision.type) {
      case 'FAQ':
        return {
          type: 'faq',
          message: decision.message,
          needsNoAction: true,
        };

      case 'LIST_INVOICES':
        return {
          type: 'tool_call',
          tool: 'oracle_fetch',
          params: {
            product: 'erp',
            query: this._buildListQuery(decision),
          },
          message: decision.message || 'Fetching invoices...',
        };

      case 'TRACK_INVOICE':
        return {
          type: 'tool_call',
          tool: 'oracle_fetch',
          params: {
            product: 'erp',
            query: `track invoice ${decision.invoiceNumber}`,
          },
          message: `Tracking invoice ${decision.invoiceNumber}...`,
        };

      case 'COLLECT_INFO':
        // Multi-step wizard: collect missing information
        await this.sessionManager.updateDraft(userId, decision.draft);
        return {
          type: 'wizard_step',
          message: decision.message,
          draft: decision.draft,
          nextField: decision.nextField,
        };

      case 'CONFIRM_ACTION':
        // Ready to execute, ask for confirmation
        await this.sessionManager.updateDraft(userId, decision.draft);
        return {
          type: 'confirmation',
          message: decision.message,
          draft: decision.draft,
          action: decision.action,
        };

      case 'EXECUTE_TOOL':
        // Final execution after confirmation
        await this.sessionManager.clearDraft(userId);
        return {
          type: 'tool_call',
          tool: 'oracle_invoice_create',
          params: {
            product: 'erp',
            invoiceData: decision.params,
          },
          message: decision.message || 'Creating invoice...',
        };

      case 'CANCEL_WORKFLOW':
        await this.sessionManager.clearDraft(userId);
        return {
          type: 'cancelled',
          message: decision.message || 'Invoice workflow cancelled.',
        };

      case 'conversational':
      default:
        return {
          type: 'conversational',
          message: decision.message || decision.content || 'I can help with invoice operations.',
        };
    }
  }

  /**
   * Build query for list invoices
   */
  _buildListQuery(decision) {
    let query = 'list invoices';

    if (decision.filters) {
      if (decision.filters.status) {
        query += ` ${decision.filters.status}`;
      }
      if (decision.filters.supplier) {
        query += ` for ${decision.filters.supplier}`;
      }
      if (decision.filters.limit) {
        query += ` limit ${decision.filters.limit}`;
      }
    }

    return query;
  }
}