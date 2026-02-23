/**
 * ============================================
 * INVOICE WIZARD - LLM WITH MEMORY (PRODUCTION)
 * ============================================
 * ✅ FIX 1: Oracle q parameter for supplier query
 * ✅ FIX 2: Normalized fuzzy matching
 * ✅ FIX 3: Validate supplier only once (with SupplierId lock)
 * ✅ FIX 4: Ordered field collection (state machine)
 * ✅ FIX 5: Draft merging (never overwrite)
 * ✅ FIX 6: Safe JSON extraction
 * ✅ FIX 7: BusinessUnit enforcement
 */

import { INVOICE_WIZARD_PROMPT } from './wizard.promt.js';

/**
 * ✅ FIX 2: Normalize names for fuzzy matching
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ✅ FIX 4: Required fields in strict ORDER
 */
const REQUIRED_ORDER = [
  'Supplier',
  'InvoiceAmount',
  'SupplierSite',
  'BusinessUnit'
];

/**
 * ✅ FIX 4: Get next missing field deterministically
 */
function getNextMissing(draft) {
  return REQUIRED_ORDER.find(f => !draft[f]);
}

/**
 * LLM-powered Invoice Wizard with Memory
 */
export class InvoiceWizardLLM {
  constructor(redis, openRouterKey, mcpUrl, userId) {
    this.redis = redis;
    this.openRouterKey = openRouterKey;
    this.mcpUrl = mcpUrl;
    this.userId = userId;
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
   * Main wizard step processor
   */
  async processWizardStep(conversationId, userInput, conversationHistory = []) {
    console.log("\n" + "=".repeat(60));
    console.log("🧙 INVOICE WIZARD - PROCESSING STEP");
    console.log("=".repeat(60));
    console.log(`User Input: "${userInput}"`);

    // Get current wizard state
    const state = await this.getWizardState(conversationId);

    // Check for cancellation
    if (this._isCancellation(userInput)) {
      await this.clearWizard(conversationId);
      await this.redis.del(`invoice:wizard:lock:${conversationId}`);
      
      return {
        type: 'cancelled',
        message: '❌ Invoice creation cancelled.',
      };
    }

    // Build LLM context with wizard state
    const messages = this._buildLLMContext(state, userInput, conversationHistory);

    // Call LLM to understand user input
    const llmResponse = await this._callLLM(messages);

    // ✅ FIX 6: Safe JSON parsing
    const decision = this._extractDecision(llmResponse);

    console.log(`🤖 LLM Decision:`);
    console.log(`   Type: ${decision.type}`);
    console.log(`   Extracted: ${JSON.stringify(decision.extractedFields || {})}`);

    // Update wizard state
    return await this._updateWizardState(conversationId, state, decision, userInput);
  }

  /**
   * ✅ FIX 6: ROBUST JSON EXTRACTION
   */
  _extractDecision(text) {
    const match = text.match(/\{[\s\S]*\}/);
    
    if (!match) {
      return {
        type: "message",
        message: text,
        extractedFields: {}
      };
    }

    try {
      return JSON.parse(match[0]);
    } catch (error) {
      console.error('JSON parse failed:', error.message);
      return {
        type: "message",
        message: text,
        extractedFields: {}
      };
    }
  }

  /**
   * Build LLM context with wizard state memory
   */
  _buildLLMContext(state, userInput, history) {
    const messages = [];

    // System prompt
    messages.push({
      role: 'system',
      content: INVOICE_WIZARD_PROMPT,
    });

    // Add wizard state context
    if (state && state.draft) {
      messages.push({
        role: 'user',
        content: `
📋 CURRENT INVOICE DRAFT:

${JSON.stringify(state.draft, null, 2)}

⚠️ RULES:
- Do NOT ask for fields already in draft
- ONLY ask for missing required fields
- Required: Supplier, SupplierSite, BusinessUnit, InvoiceAmount

What field is still missing?`,
      });
    }

    // Add recent conversation history
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

    // Force execute on YES
    const normalized = userInput.trim().toLowerCase();
    if (normalized === "yes" || normalized === "y") {
      messages.push({
        role: 'system',
        content: `
⚠️ CRITICAL: User confirmed with YES.

Respond with EXACTLY:

{
  "type": "execute",
  "message": "✅ Creating invoice..."
}`,
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
        temperature: 0.3,
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
   * ✅ FIX 1 + FIX 2 + FIX 3: VALIDATE SUPPLIER WITH ORACLE q PARAMETER
   */
  async _validateSupplier(name, currentState) {
    try {
      // ✅ FIX 3: Skip validation if already validated
      if (currentState?.draft?.SupplierId) {
        console.log(`✅ Supplier already locked: "${currentState.draft.Supplier}" (ID: ${currentState.draft.SupplierId})`);
        return { valid: true };
      }

      console.log(`\n🔍 Validating supplier: "${name}"`);
      
      // ✅ FIX 1: Use q parameter with LIKE query
      const safeName = name.replace(/'/g, "''"); // SQL escape
      
      const res = await fetch(this.mcpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          product: "ERP",
          tool: "oracle_fetch",
          args: {
            endpoint: "/suppliers",
            q: `SupplierName LIKE '%${safeName}%'`
          }
        })
      });

      if (!res.ok) {
        console.error('❌ Supplier validation failed (HTTP):', res.status);
        return {
          valid: false,
          error: `Cannot connect to Oracle. Status: ${res.status}`
        };
      }

      const data = await res.json();
      
      if (!data?.content) {
        console.error('❌ No content in response');
        return {
          valid: false,
          error: `Oracle returned empty response for "${name}".`
        };
      }

      const parsed = JSON.parse(data.content);
      
      if (!parsed.data || !Array.isArray(parsed.data)) {
        console.error('❌ Invalid data structure');
        return {
          valid: false,
          error: `Oracle returned invalid format for "${name}".`
        };
      }

      console.log(`   Oracle returned ${parsed.data.length} suppliers`);

      // ✅ FIX 2: Normalized fuzzy matching
      const input = normalize(name);
      console.log(`   Normalized input: "${input}"`);

      const supplier = parsed.data.find(s => {
        const oracleName = normalize(s.SupplierName || "");
        return oracleName.includes(input) || input.includes(oracleName);
      });

      if (supplier) {
        console.log(`   ✅ MATCH: "${supplier.SupplierName}" (ID: ${supplier.SupplierId || 'N/A'})`);
        return {
          valid: true,
          supplier: supplier,
          exactName: supplier.SupplierName,
          supplierId: supplier.SupplierId
        };
      } else {
        console.log(`   ❌ NO MATCH for "${name}"`);
        
        const suggestions = parsed.data
          .slice(0, 5)
          .map(s => `- ${s.SupplierName}`)
          .join('\n');
        
        return {
          valid: false,
          error: `⚠️ I cannot find "${name}" in Oracle.\n\nI cannot create new suppliers. Please use an existing supplier:\n\n${suggestions}`
        };
      }
    } catch (error) {
      console.error('❌ Supplier validation exception:', error);
      return {
        valid: false,
        error: `Failed to validate "${name}": ${error.message}`
      };
    }
  }

  /**
   * ✅ FIX 7: Validate Business Unit
   */
  async _validateBusinessUnit(name, currentState) {
    try {
      // ✅ Skip validation if already validated
      if (currentState?.draft?.BusinessUnitId) {
        console.log(`✅ Business Unit already locked: "${currentState.draft.BusinessUnit}"`);
        return { valid: true };
      }

      console.log(`\n🔍 Validating business unit: "${name}"`);
      
      const safeName = name.replace(/'/g, "''");
      
      const res = await fetch(this.mcpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          product: "ERP",
          tool: "oracle_fetch",
          args: {
            endpoint: "/businessUnits",
            q: `Name LIKE '%${safeName}%'`
          }
        })
      });

      if (!res.ok) {
        console.error('❌ BU validation failed (HTTP):', res.status);
        return {
          valid: false,
          error: `Cannot connect to Oracle. Status: ${res.status}`
        };
      }

      const data = await res.json();
      
      if (!data?.content) {
        return {
          valid: false,
          error: `Oracle returned empty response for "${name}".`
        };
      }

      const parsed = JSON.parse(data.content);
      
      if (!parsed.data || !Array.isArray(parsed.data)) {
        return {
          valid: false,
          error: `Oracle returned invalid format for "${name}".`
        };
      }

      console.log(`   Oracle returned ${parsed.data.length} business units`);

      const input = normalize(name);

      const bu = parsed.data.find(b => {
        const oracleName = normalize(b.Name || b.BUName || "");
        return oracleName.includes(input) || input.includes(oracleName);
      });

      if (bu) {
        console.log(`   ✅ MATCH: "${bu.Name || bu.BUName}"`);
        return {
          valid: true,
          businessUnit: bu,
          exactName: bu.Name || bu.BUName,
          businessUnitId: bu.BusinessUnitId || bu.BUId
        };
      } else {
        console.log(`   ❌ NO MATCH for "${name}"`);
        
        const suggestions = parsed.data
          .slice(0, 5)
          .map(b => `- ${b.Name || b.BUName}`)
          .join('\n');
        
        return {
          valid: false,
          error: `⚠️ Business Unit "${name}" not found in Oracle.\n\nPlease use an existing Business Unit:\n\n${suggestions}`
        };
      }
    } catch (error) {
      console.error('❌ BU validation exception:', error);
      return {
        valid: false,
        error: `Failed to validate "${name}": ${error.message}`
      };
    }
  }

  /**
   * Update wizard state based on LLM decision
   */
  async _updateWizardState(conversationId, currentState, decision, userInput) {
    // Initialize state if starting new wizard
    if (!currentState) {
      currentState = {
        status: 'collecting',
        draft: {
          InvoiceDate: new Date().toISOString().split('T')[0],
          InvoiceCurrency: 'AED',
        },
        startedAt: Date.now(),
      };
    }

    // ✅ FIX 5: MERGE draft (never overwrite)
    const existingDraft = { ...currentState.draft };

    if (decision.extractedFields) {
      for (const [key, value] of Object.entries(decision.extractedFields)) {
        if (value !== null && value !== "" && value !== undefined) {
          // Preserve user currency if already set
          if (key === 'InvoiceCurrency' && existingDraft.InvoiceCurrency && 
              existingDraft.InvoiceCurrency !== 'AED') {
            continue;
          }
          existingDraft[key] = value;
        }
      }
      
      console.log(`✅ Merged draft: ${JSON.stringify(existingDraft)}`);
    }

    // Update currentState with merged draft
    currentState.draft = existingDraft;

    // ✅ FIX 3: Validate supplier ONLY ONCE (check SupplierId)
    if (!currentState.draft.SupplierId && currentState.draft.Supplier) {
      console.log("🔍 New supplier detected - validating...");
      
      const supplierCheck = await this._validateSupplier(currentState.draft.Supplier, currentState);
      
      if (!supplierCheck.valid) {
        // Supplier invalid - remove it from draft
        delete currentState.draft.Supplier;
        
        currentState.status = 'collecting';
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'collect',
          message: supplierCheck.error,
          draft: currentState.draft,
          missingFields: [getNextMissing(currentState.draft)]
        };
      }
      
      // ✅ FIX 3: Lock supplier with SupplierId
      if (supplierCheck.exactName && supplierCheck.supplierId) {
        console.log("✅ Supplier validated and LOCKED");
        currentState.draft.Supplier = supplierCheck.exactName;
        currentState.draft.SupplierId = supplierCheck.supplierId;
      }
    }

    // ✅ FIX 7: Validate BusinessUnit ONLY ONCE
    if (!currentState.draft.BusinessUnitId && currentState.draft.BusinessUnit) {
      console.log("🔍 New business unit detected - validating...");
      
      const buCheck = await this._validateBusinessUnit(currentState.draft.BusinessUnit, currentState);
      
      if (!buCheck.valid) {
        // BU invalid - remove it from draft
        delete currentState.draft.BusinessUnit;
        
        currentState.status = 'collecting';
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'collect',
          message: buCheck.error,
          draft: currentState.draft,
          missingFields: [getNextMissing(currentState.draft)]
        };
      }
      
      // ✅ Lock BusinessUnit with ID
      if (buCheck.exactName && buCheck.businessUnitId) {
        console.log("✅ Business Unit validated and LOCKED");
        currentState.draft.BusinessUnit = buCheck.exactName;
        currentState.draft.BusinessUnitId = buCheck.businessUnitId;
      }
    }

    // ✅ FIX 4: Check next missing field in ORDER
    const nextMissing = getNextMissing(currentState.draft);

    console.log("\n📋 Field Status:");
    REQUIRED_ORDER.forEach(field => {
      const status = currentState.draft[field] ? '✅' : '❌';
      console.log(`   ${status} ${field}: ${currentState.draft[field] || 'missing'}`);
    });
    console.log(`\n⏭️  Next missing: ${nextMissing || 'NONE'}`);

    // Update status based on decision type
    switch (decision.type) {
      case 'collect':
        if (nextMissing) {
          currentState.status = 'collecting';
          await this.saveWizardState(conversationId, currentState);
          
          return {
            type: 'wizard_step',
            message: decision.message || this._buildCollectionMessage(nextMissing, currentState.draft),
            draft: currentState.draft,
            missingFields: [nextMissing],
          };
        }
        
        // All fields collected - move to confirmation
        currentState.status = 'confirming';
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'confirmation',
          message: this._formatConfirmation(currentState.draft),
          draft: currentState.draft,
        };

      case 'confirm':
        const missing = REQUIRED_ORDER.filter(f => !currentState.draft[f]);
        
        if (missing.length > 0) {
          currentState.status = 'collecting';
          await this.saveWizardState(conversationId, currentState);
          
          return {
            type: 'collect',
            message: `⚠️ Cannot proceed. Missing:\n- ${missing.join('\n- ')}`,
            draft: currentState.draft,
            missingFields: missing,
          };
        }
        
        currentState.status = 'confirming';
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'confirmation',
          message: decision.message || this._formatConfirmation(currentState.draft),
          draft: currentState.draft,
        };

      case 'execute':
        const missingFields = REQUIRED_ORDER.filter(f => !currentState.draft[f]);
        
        if (missingFields.length > 0) {
          console.error('❌ EXECUTION BLOCKED - Missing:', missingFields);
          
          currentState.status = 'collecting';
          await this.saveWizardState(conversationId, currentState);
          
          return {
            type: 'error',
            message: `🚫 Cannot create invoice. Missing:\n- ${missingFields.join('\n- ')}`,
            draft: currentState.draft,
            missingFields: missingFields,
          };
        }
        
        console.log('✅ All validations passed - executing');
        currentState.status = 'executing';
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'execute',
          tool: 'oracle_invoice_create',
          params: currentState.draft,
          message: '✅ Creating invoice in Oracle ERP...',
        };

      case 'clarify':
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'wizard_step',
          message: decision.message,
          draft: currentState.draft,
        };
      
      case 'ignore':
        return {
          type: 'message',
          message: decision.message || "That's not related to invoice creation.",
          draft: currentState.draft,
        };
      
      case 'message':
      default:
        await this.saveWizardState(conversationId, currentState);
        
        return {
          type: 'wizard_step',
          message: decision.message || "I didn't understand that. Could you rephrase?",
          draft: currentState.draft,
        };
    }
  }

  /**
   * Build collection message for next field
   */
  _buildCollectionMessage(fieldName, draft) {
    const messages = {
      'Supplier': '📋 Let\'s create an invoice!\n\nFirst, which **supplier** is this invoice for?\n\n💡 Example: "Dell", "Microsoft", "Lookahead"',
      'InvoiceAmount': `Great! Supplier: **${draft.Supplier}**\n\nNow, what's the **invoice amount**?\n\n💡 Example: "5000" or "2500.50"`,
      'SupplierSite': `Perfect! Amount: **${draft.InvoiceAmount}** ${draft.InvoiceCurrency}\n\nWhich **supplier site**?\n\n💡 Example: "Main Office", "Cloud CA"`,
      'BusinessUnit': `Excellent! Site: **${draft.SupplierSite}**\n\nFinally, which **business unit**?\n\n💡 Example: "Lookahead CA BU"`
    };

    return messages[fieldName] || `Please provide: ${fieldName}`;
  }

  /**
   * Format confirmation message
   */
  _formatConfirmation(draft) {
    const amount = draft.InvoiceAmount || 0;
    const currency = draft.InvoiceCurrency || 'AED';

    return `📋 **Invoice Summary - Please Confirm**

**Supplier:** ${draft.Supplier}
**Amount:** ${draft.InvoiceAmount} ${currency}
**Site:** ${draft.SupplierSite}
**Business Unit:** ${draft.BusinessUnit}
**Date:** ${draft.InvoiceDate}

 **Ready to create this invoice?**

Reply **"yes"** to create, or **"cancel"** to abort.`;
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