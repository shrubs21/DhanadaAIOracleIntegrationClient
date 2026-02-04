/**
 * ============================================
 * INVOICE WIZARD - LLM POWERED WITH MEMORY
 * ============================================
 * Uses OpenAI at EVERY step for natural conversation
 * BUT maintains proper state memory in Redis
 * 
 * Best of both worlds:
 * ✅ LLM intelligence (natural language understanding)
 * ✅ Temporary memory (state preservation)
 */

import { INVOICE_WIZARD_PROMPT } from './wizard.promt.js';

export class InvoiceWizardLLM {
  constructor(redis, openRouterKey) {
    this.redis = redis;
    this.openRouterKey = openRouterKey;
    this.wizardTTL = 600; // 10 minutes
  }

  /**
   * Get wizard state
   */
  async getWizardState(conversationId) {
    try {
      const key = `invoice:wizard:${conversationId}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Get wizard state error:', error);
      return null;
    }
  }

  /**
   * Save wizard state
   */
  async saveWizardState(conversationId, state) {
    try {
      const key = `invoice:wizard:${conversationId}`;
      await this.redis.setex(
        key,
        this.wizardTTL,
        JSON.stringify({
          ...state,
          updatedAt: Date.now(),
        })
      );
      
      console.log(`✅ Wizard state saved:`);
      console.log(`   Conversation: ${conversationId}`);
      console.log(`   Status: ${state.status}`);
      console.log(`   Draft: ${JSON.stringify(state.draft)}`);
    } catch (error) {
      console.error('Save wizard state error:', error);
      throw error;
    }
  }

  /**
   * Clear wizard
   */
  async clearWizard(conversationId) {
    try {
      const key = `invoice:wizard:${conversationId}`;
      await this.redis.del(key);
      console.log(`✅ Wizard cleared for conversation ${conversationId}`);
    } catch (error) {
      console.error('Clear wizard error:', error);
    }
  }

  /**
   * Process wizard step using LLM with memory context
   */
  async processWizardStep(conversationId, userInput, conversationHistory = []) {
    // Get current wizard state
    const state = await this.getWizardState(conversationId);

    // Check for cancellation
    if (this._isCancellation(userInput)) {
      await this.clearWizard(conversationId);
      
      // ✅ FIX: Remove wizard lock on cancel
      await this.redis.del(`invoice:wizard:lock:${conversationId}`);
      
      return {
        type: 'cancelled',
        message: '❌ Invoice creation cancelled.',
      };
    }

    // Build LLM context with wizard state
    const messages = this._buildLLMContext(state, userInput, conversationHistory);

    // Call LLM to understand user input and decide next action
    const llmResponse = await this._callLLM(messages);

    // Parse LLM decision
    const decision = this._parseLLMDecision(llmResponse);

    console.log(`🤖 LLM Decision:`);
    console.log(`   Type: ${decision.type}`);
    console.log(`   Extracted fields: ${JSON.stringify(decision.extractedFields || {})}`);

    // Update wizard state based on LLM decision
    return await this._updateWizardState(conversationId, state, decision, userInput);
  }

  /**
   * Build LLM context with wizard state memory
   * ✅ FIX: Draft as USER message (not system)
   * ✅ PATCH 1: Force execute on YES
   */
  _buildLLMContext(state, userInput, history) {
    const messages = [];

    // System prompt with wizard instructions
    messages.push({
      role: 'system',
      content: INVOICE_WIZARD_PROMPT,
    });

    // ✅ FIX: Add wizard state context as USER message
    if (state && state.draft) {
      messages.push({
        role: 'user',
        content: `
📋 CURRENT INVOICE DRAFT (ALREADY COLLECTED):

${JSON.stringify(state.draft, null, 2)}

⚠️ IMPORTANT RULES:
- Do NOT ask again for fields that are already present in the draft
- ONLY ask for missing required fields
- If all required fields are present, move to confirmation
- Required fields: Supplier, SupplierSite, InvoiceAmount

What field is still missing?`,
      });
    }

    // Add recent conversation history (last 3 turns)
    const recentHistory = history.slice(-3);
    for (const turn of recentHistory) {
      messages.push({
        role: turn.role,
        content: turn.content,
      });
    }

    // Add current user input
    messages.push({
      role: 'user',
      content: userInput,
    });

    // ✅ PATCH 1: Force execute on YES
    const normalizedInput = userInput.trim().toLowerCase();
    if (normalizedInput === "yes" || normalizedInput === "y") {
      messages.push({
        role: 'system',
        content: `
⚠️ CRITICAL INSTRUCTION:
The user has confirmed with YES.

You MUST respond with EXACTLY this JSON:

{
  "type": "execute",
  "message": "✅ Creating invoice..."
}

Do NOT ask any more questions.
Do NOT clarify anything.
EXECUTE immediately.
`,
      });
    }

    return messages;
  }

  /**
   * Call OpenAI via OpenRouter
   */
  async _callLLM(messages) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:4000",
        "X-Title": "Oracle Invoice Wizard"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        temperature: 0.3, // Low temp for consistent extraction
        messages: messages,
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter error: ${err}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }

  /**
   * Parse LLM response into structured decision
   */
  _parseLLMDecision(llmResponse) {
    try {
      // Try to extract JSON from response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]);
        return decision;
      }
    } catch (e) {
      console.error('Failed to parse LLM JSON:', e);
    }

    // Fallback: treat as conversational response
    return {
      type: 'message',
      message: llmResponse,
    };
  }

  /**
   * Update wizard state based on LLM decision
   * ✅ FIX: Safe merge - never overwrite with empty values
   * ✅ PATCH 2: Auto-confirm when all fields collected
   */
  async _updateWizardState(conversationId, currentState, decision, userInput) {
    // Initialize state if starting new wizard
    if (!currentState) {
      currentState = {
        status: 'collecting',
        draft: {
          InvoiceDate: new Date().toISOString().split('T')[0],
          InvoiceCurrency: 'USD',
          BusinessUnit: 'Lookahead CA BU',
        },
        startedAt: Date.now(),
      };
    }

    // ✅ FIX: Safe merge - only update non-empty values
    if (decision.extractedFields) {
      for (const [key, value] of Object.entries(decision.extractedFields)) {
        // Only update if value is meaningful (not null/empty/undefined)
        if (value !== null && value !== "" && value !== undefined) {
          currentState.draft[key] = value;
        }
      }
      
      console.log(`✅ Draft updated with: ${JSON.stringify(decision.extractedFields)}`);
      console.log(`✅ Current draft: ${JSON.stringify(currentState.draft)}`);
    }

    // Update status based on decision type
    switch (decision.type) {
      case 'collect':
        // ✅ PATCH 2: Auto-confirm when all required fields are present
        const requiredFields = ['Supplier', 'SupplierSite', 'InvoiceAmount'];
        const missingRequired = requiredFields.filter(f => !currentState.draft[f]);
        
        // Check if all required fields are collected
        if (missingRequired.length === 0 || 
            !decision.missingFields || 
            decision.missingFields.length === 0) {
          
          console.log('✅ All required fields collected → moving to confirmation');
          
          // ✅ Validate supplier name looks reasonable
          const supplier = currentState.draft.Supplier;
          if (supplier && supplier.length < 2) {
            currentState.status = 'collecting';
            await this.saveWizardState(conversationId, currentState);
            
            return {
              type: 'wizard_step',
              message: '❌ Supplier name seems invalid. Please provide the full supplier name (e.g., "Dell", "Lookahead CA Corp").',
              draft: currentState.draft,
            };
          }
          
          // Auto-generate invoice number if missing
          if (!currentState.draft.InvoiceNumber) {
            currentState.draft.InvoiceNumber = `AI-INVOICE-${Date.now()}`;
          }
          
          currentState.status = 'confirming';
          await this.saveWizardState(conversationId, currentState);
          
          return {
            type: 'confirmation',
            message: this._formatConfirmation(currentState.draft),
            draft: currentState.draft,
          };
        }
        
        // Still collecting fields
        currentState.status = 'collecting';
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'wizard_step',
          message: decision.message,
          draft: currentState.draft,
          missingFields: decision.missingFields || [],
        };

      case 'confirm':
        // All fields collected - ready for confirmation
        currentState.status = 'confirming';
        
        // Auto-generate invoice number if missing
        if (!currentState.draft.InvoiceNumber) {
          currentState.draft.InvoiceNumber = `AI-INVOICE-${Date.now()}`;
        }
        
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'confirmation',
          message: decision.message || this._formatConfirmation(currentState.draft),
          draft: currentState.draft,
        };

      case 'execute':
        // User confirmed - execute
        currentState.status = 'executing';
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'execute',
          tool: 'oracle_invoice_create',
          params: currentState.draft,
          message: '✅ Creating invoice...',
        };

      case 'clarify':
        // LLM needs clarification
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'wizard_step',
          message: decision.message,
          draft: currentState.draft,
        };

      default:
        // Generic message
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'wizard_step',
          message: decision.message,
          draft: currentState.draft,
        };
    }
  }

  /**
   * Format confirmation message
   */
  _formatConfirmation(draft) {
    const amount = draft.InvoiceAmount || 0;
    const currency = draft.InvoiceCurrency || 'USD';
    const supplier = draft.Supplier || 'N/A';
    const site = draft.SupplierSite || 'N/A';

    return `**✅ Ready to Create Invoice**

**Invoice Details:**
━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **Invoice Number**: ${draft.InvoiceNumber}
🏢 **Supplier**: ${supplier}
📍 **Site**: ${site}
💰 **Amount**: ${currency} ${amount.toLocaleString()}
📅 **Date**: ${draft.InvoiceDate}
📝 **Description**: ${draft.Description || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━

Type **YES** to create this invoice
Type **CANCEL** to abort`;
  }

  /**
   * Check if user wants to cancel
   */
  _isCancellation(input) {
    const normalized = input.toLowerCase().trim();
    const cancellationWords = ['cancel', 'abort', 'stop', 'quit', 'exit', 'nevermind'];
    return cancellationWords.includes(normalized);
  }
}