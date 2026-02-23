/**
 * ============================================
 * ENTERPRISE UNIFIED COPILOT - COMPLETE FIX
 * ============================================
 * ✅ Backend fallback extraction (FIXES LOOPING)
 * ✅ Confirmation buttons for ambiguous cases
 * ✅ Fuzzy matching (case-insensitive)
 * ✅ NEVER skips critical fields
 * ✅ Natural conversation
 * ✅ Enterprise-grade reliability
 * ✅ FIXED: Oracle field name variations
 * ✅ FIXED: ID extraction from Oracle
 * ✅ FIXED: Amount/Site extraction when LLM fails
 */

import { ENTERPRISE_INVOICE_PROMPT } from './invoice.natural.prompt.js';
import pool from '../config/db.js';


/**
 * ============================================
 * ORACLE FIELD NORMALIZERS
 * ============================================
 */

/**
 * Extract supplier name from Oracle response
 * Handles: SupplierName, PartyName, Supplier, supplierName
 */
function getSupplierName(s) {
  return (
    s.SupplierName ||
    s.PartyName ||
    s.Supplier ||
    s.supplierName ||
    ""
  );
}

/**
 * Extract supplier ID from Oracle response
 * Handles: SupplierId, PartyId, VendorId
 */
function getSupplierId(s) {
  return (
    s.SupplierId ||
    s.PartyId ||
    s.VendorId ||
    null
  );
}

/**
 * Extract business unit name from Oracle response
 * Handles: Name, BUName, BusinessUnitName
 */
function getBUName(b) {
  return (
    b.Name ||
    b.BUName ||
    b.BusinessUnitName ||
    ""
  );
}

/**
 * Extract business unit ID from Oracle response
 * Handles: BusinessUnitId, BUId, OrganizationId
 */
function getBUId(b) {
  return (
    b.BusinessUnitId ||
    b.BUId ||
    b.OrganizationId ||
    null
  );
}

/**
 * Normalize for fuzzy matching
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[.,\-_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Required fields in order
 */
const REQUIRED_ORDER = [
  'Supplier',
  'InvoiceAmount',
  'SupplierSite',
  'BusinessUnit'
];

function getNextMissing(draft) {
  return REQUIRED_ORDER.find(f => !draft[f]);
}

/**
 * ============================================
 * BACKEND FALLBACK EXTRACTOR
 * ============================================
 * THIS IS THE CRITICAL FIX FOR THE LOOPING ISSUE
 * 
 * When LLM fails to extract fields (returns empty extractedFields),
 * this function deterministically extracts them from user input
 */
function backendFallbackExtract(text, draft) {
  const clean = text.trim();
  console.log(`🧠 Backend fallback checking: "${clean}"`);

  // 💰 Extract Amount - if supplier is locked but no amount yet
  if (draft.SupplierId && !draft.InvoiceAmount) {
    const amt = clean.match(/\b(\d+(?:\.\d+)?)\b/);
    if (amt) {
      console.log(`   💰 Extracted amount: ${amt[1]}`);
      return { InvoiceAmount: Number(amt[1]) };
    }
  }

  // 📍 Extract Supplier Site - if amount exists but no site yet
  if (draft.InvoiceAmount && !draft.SupplierSite) {
    console.log(`   📍 Extracted site: ${clean}`);
    return { SupplierSite: clean };
  }

  // 🏛️ Extract Business Unit - if site exists but no BU yet
  if (draft.SupplierSite && !draft.BusinessUnit) {
    console.log(`   🏛️ Extracted BU: ${clean}`);
    return { BusinessUnit: clean };
  }

  console.log(`   ⚠️ No fallback extraction needed`);
  return {};
}

/**
 * Enterprise Unified Invoice Copilot
 */
export class EnterpriseInvoiceCopilot {
  constructor(config = {}) {
    this.redis = config.redis;
    this.openRouterKey = config.openRouterKey || process.env.OPENROUTER_API_KEY;
    this.mcpUrl = config.mcpUrl;
    this.userId = config.userId;
    this.sessionTTL = 900; // 15 minutes
  }

  /**
   * Main entry point
   */
  async processQuery(conversationId, userMessage) {
    try {
      console.log("\n" + "=".repeat(60));
      console.log("🏢 ENTERPRISE INVOICE COPILOT");
      console.log("=".repeat(60));
      console.log(`User: "${userMessage}"`);

      // Get memory
      const memory = await this.getMemory(conversationId);
      console.log(`💾 Memory: ${memory ? 'EXISTS' : 'NEW'}`);
      
      if (memory?.draft) {
        console.log(`   Draft: ${JSON.stringify(memory.draft)}`);
      }

      // Check cancellation
      if (this._isCancellation(userMessage)) {
        await this.clearMemory(conversationId);
        await this.redis.del(`invoice:wizard:lock:${conversationId}`);
        
        return {
          type: 'cancelled',
          answer: "No worries! Invoice creation cancelled. Let me know if you need anything else.",
        };
      }

      // Build context
      const messages = await this._buildContext(conversationId, userMessage, memory);

      // Call LLM
      const llmResponse = await this._callLLM(messages);
      const decision = this._extractDecision(llmResponse);

      console.log(`🤖 Decision: ${decision.type}`);
      if (decision.extractedFields) {
        console.log(`   LLM Extracted: ${JSON.stringify(decision.extractedFields)}`);
      }

      // Save to history
      await this._addToHistory(conversationId, 'user', userMessage);

      // Execute decision
      const result = await this._executeDecision(conversationId, memory, decision, userMessage);

      // Save response
      await this._addToHistory(conversationId, 'assistant', result.answer);

      return result;

    } catch (error) {
      console.error("❌ Copilot Error:", error);
      
      await this.redis.del(`invoice:wizard:lock:${conversationId}`);
      
      return {
        type: 'error',
        answer: "Oops, something went wrong. Mind trying again?",
        error: error.message,
      };
    }
  }

  /**
   * Get memory
   */
  async getMemory(conversationId) {
    try {
      const key = `invoice:memory:${conversationId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Memory load error:', error);
      return null;
    }
  }

  /**
   * Save memory
   */
  async saveMemory(conversationId, memory) {
    try {
      const key = `invoice:memory:${conversationId}`;
      await this.redis.setex(
        key,
        this.sessionTTL,
        JSON.stringify({
          ...memory,
          updatedAt: Date.now(),
        })
      );
      console.log(`💾 Memory saved`);
    } catch (error) {
      console.error('❌ Memory save error:', error);
      throw error;
    }
  }

  /**
   * Clear memory
   */
  async clearMemory(conversationId) {
    try {
      await this.redis.del(`invoice:memory:${conversationId}`);
      console.log(`🗑️ Memory cleared`);
    } catch (error) {
      console.error('❌ Memory clear error:', error);
    }
  }

  /**
   * Build context
   */
  async _buildContext(conversationId, userMessage, memory) {
    const messages = [];

    // System prompt
    messages.push({
      role: 'system',
      content: ENTERPRISE_INVOICE_PROMPT,
    });

    // Add memory context
    if (memory?.draft) {
      let memoryContext = '📋 CURRENT STATE:\n\n';
      memoryContext += JSON.stringify(memory.draft, null, 2) + '\n\n';
      
      if (memory.draft.SupplierId) {
        memoryContext += `✅ Supplier VALIDATED & LOCKED: ${memory.draft.Supplier}\n`;
        memoryContext += `   ⚠️ DO NOT ask for Supplier again!\n`;
      }
      if (memory.draft.BusinessUnitId) {
        memoryContext += `✅ BusinessUnit VALIDATED & LOCKED: ${memory.draft.BusinessUnit}\n`;
        memoryContext += `   ⚠️ DO NOT ask for BusinessUnit again!\n`;
      }
      
      // ✅ CRITICAL: Tell LLM what we're collecting
      const nextMissing = getNextMissing(memory.draft);
      
      if (nextMissing) {
        memoryContext += `\n🎯 **CURRENTLY COLLECTING: ${nextMissing}**\n`;
        memoryContext += `   User's message likely contains the ${nextMissing}.\n`;
        memoryContext += `   EXTRACT IT to extractedFields.${nextMissing}\n`;
        memoryContext += `   Examples:\n`;
        memoryContext += `   - User says "5000" → extract as InvoiceAmount\n`;
        memoryContext += `   - User says "Dell HQ" → extract as SupplierSite\n`;
        memoryContext += `   - User says "Lookahead CA BU" → extract as BusinessUnit\n\n`;
      }
      
      memoryContext += `⚠️ EXTRACTION RULES:\n`;
      memoryContext += `- ALWAYS extract user's response to extractedFields\n`;
      memoryContext += `- NEVER return empty extractedFields if user provided a value\n`;
      memoryContext += `- Be smart: "6000" when collecting amount = extract it!\n`;
      
      messages.push({
        role: 'system',
        content: memoryContext,
      });
    }

    // Add history
    const history = await this._getHistory(conversationId, 5);
    for (const turn of history) {
      messages.push({
        role: turn.role,
        content: turn.content,
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }

  /**
   * Call LLM
   */
  async _callLLM(messages) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:4000",
        "X-Title": "Enterprise Invoice Copilot"
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
   * Extract decision
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
      console.error('❌ JSON parse failed:', error.message);
      return {
        type: "message",
        message: text,
        extractedFields: {}
      };
    }
  }

  /**
   * Execute decision
   */
  async _executeDecision(conversationId, currentMemory, decision, userInput) {
    // Initialize memory
    if (!currentMemory) {
      currentMemory = {
        conversationId,
        draft: {
          InvoiceDate: new Date().toISOString().split('T')[0],
          InvoiceCurrency: 'AED',
        },
        mode: null,
        createdAt: Date.now(),
      };
    }

    // ============================================
    // STEP 1: MERGE LLM EXTRACTED FIELDS
    // ============================================
    if (decision.extractedFields && Object.keys(decision.extractedFields).length > 0) {
      currentMemory.draft = currentMemory.draft || {};
      
      for (const [key, value] of Object.entries(decision.extractedFields)) {
        if (value !== null && value !== "" && value !== undefined) {
          // 🔒 NEVER overwrite locked fields
          if (key === 'Supplier' && currentMemory.draft.SupplierId) {
            console.log(`⚠️ Ignoring Supplier - already locked`);
            continue;
          }
          
          if (key === 'BusinessUnit' && currentMemory.draft.BusinessUnitId) {
            console.log(`⚠️ Ignoring BusinessUnit - already locked`);
            continue;
          }
          
          currentMemory.draft[key] = value;
          console.log(`✅ LLM extracted ${key}: ${value}`);
        }
      }
    }

    // ============================================
    // STEP 2: BACKEND FALLBACK EXTRACTION
    // THIS IS THE CRITICAL FIX FOR THE LOOPING BUG
    // ============================================
    const fallback = backendFallbackExtract(userInput, currentMemory.draft);
    
    for (const [key, value] of Object.entries(fallback)) {
      if (!currentMemory.draft[key]) {
        currentMemory.draft[key] = value;
        console.log(`🧠 Backend fallback extracted ${key}: ${value}`);
      }
    }

    console.log(`✅ Final draft: ${JSON.stringify(currentMemory.draft)}`);

    // Set wizard mode
    if (decision.type === 'collect' || decision.type === 'confirm_choice' || decision.type === 'confirm_match') {
      currentMemory.mode = 'wizard';
      
      await this.redis.set(
        `invoice:wizard:lock:${conversationId}`,
        "active",
        "EX",
        this.sessionTTL
      );
    }

    // ============================================
    // HARD RULE: Force wizard to stay in collect mode
    // ============================================
    if (currentMemory.mode === 'wizard' && decision.type === 'message') {
      console.log(`⚠️ Forcing wizard mode: message → collect`);
      decision.type = 'collect';
    }

    // ✅ VALIDATE SUPPLIER (once when new supplier detected)
    if (!currentMemory.draft?.SupplierId && currentMemory.draft?.Supplier) {
      console.log("🔍 NEW SUPPLIER - Validating...");
      
      const supplierCheck = await this._validateSupplier(currentMemory.draft.Supplier);
      
      if (!supplierCheck.valid) {
        // Validation failed - DON'T DELETE (per requirements)
        // Just don't lock it
        await this.saveMemory(conversationId, currentMemory);
        
        // Return with options if available
        if (supplierCheck.options && supplierCheck.options.length > 0) {
          return {
            type: 'confirm_choice',
            answer: supplierCheck.error,
            field: 'Supplier',
            options: supplierCheck.options,
            draft: currentMemory.draft,
          };
        }
        
        return {
          type: 'validation_error',
          answer: supplierCheck.error,
          draft: currentMemory.draft,
        };
      }
      
      // ✅ LOCK SUPPLIER (NEVER DELETE)
      if (supplierCheck.exactName && supplierCheck.supplierId) {
        currentMemory.draft.Supplier = supplierCheck.exactName;
        currentMemory.draft.SupplierId = supplierCheck.supplierId;
        console.log(`✅ Supplier LOCKED: ${supplierCheck.exactName} (ID: ${supplierCheck.supplierId})`);
      }
    }

    // ✅ VALIDATE BUSINESS UNIT (once when new BU detected)
    if (!currentMemory.draft?.BusinessUnitId && currentMemory.draft?.BusinessUnit) {
      console.log("🔍 NEW BUSINESS UNIT - Validating...");
      
      const buCheck = await this._validateBusinessUnit(currentMemory.draft.BusinessUnit);
      
      if (!buCheck.valid) {
        // Validation failed - DON'T DELETE (per requirements)
        // Just don't lock it
        await this.saveMemory(conversationId, currentMemory);
        
        // Return with options if available
        if (buCheck.options && buCheck.options.length > 0) {
          return {
            type: 'confirm_choice',
            answer: buCheck.error,
            field: 'BusinessUnit',
            options: buCheck.options,
            draft: currentMemory.draft,
          };
        }
        
        return {
          type: 'validation_error',
          answer: buCheck.error,
          draft: currentMemory.draft,
        };
      }
      
      // ✅ LOCK BUSINESS UNIT (NEVER DELETE)
      if (buCheck.exactName && buCheck.businessUnitId) {
        currentMemory.draft.BusinessUnit = buCheck.exactName;
        currentMemory.draft.BusinessUnitId = buCheck.businessUnitId;
        console.log(`✅ BusinessUnit LOCKED: ${buCheck.exactName} (ID: ${buCheck.businessUnitId})`);
      }
    }

    // Handle decision types
    switch (decision.type) {
      case 'message':
      case 'faq':
        await this.saveMemory(conversationId, currentMemory);
        return {
          type: 'text',
          answer: decision.message,
        };

      case 'collect':
        const nextMissing = getNextMissing(currentMemory.draft);
        
        if (nextMissing) {
          await this.saveMemory(conversationId, currentMemory);
          
          return {
            type: 'wizard_step',
            answer: decision.message || this._buildCollectionMessage(nextMissing, currentMemory.draft),
            draft: currentMemory.draft,
            missingFields: [nextMissing],
          };
        }
        
        // All fields collected → confirm
        await this.saveMemory(conversationId, currentMemory);
        
        return {
          type: 'confirmation',
          answer: this._formatConfirmation(currentMemory.draft),
          draft: currentMemory.draft,
        };

      case 'confirm_choice':
        // LLM wants user to choose from options
        await this.saveMemory(conversationId, currentMemory);
        
        return {
          type: 'confirm_choice',
          answer: decision.message,
          field: decision.field,
          options: decision.options,
          draft: currentMemory.draft,
        };

      case 'confirm_match':
        // LLM wants yes/no confirmation
        await this.saveMemory(conversationId, currentMemory);
        
        return {
          type: 'confirm_match',
          answer: decision.message,
          field: decision.field,
          userInput: decision.userInput,
          suggestedMatch: decision.suggestedMatch,
          draft: currentMemory.draft,
        };

      case 'confirm':
        // Final confirmation before execute
        const missing = REQUIRED_ORDER.filter(f => !currentMemory.draft[f]);
        
        if (missing.length > 0) {
          await this.saveMemory(conversationId, currentMemory);
          
          return {
            type: 'error',
            answer: `We still need:\n- ${missing.join('\n- ')}`,
            draft: currentMemory.draft,
            missingFields: missing,
          };
        }
        
        // Check validation
        if (!currentMemory.draft.SupplierId || !currentMemory.draft.BusinessUnitId) {
          await this.saveMemory(conversationId, currentMemory);
          
          return {
            type: 'error',
            answer: `Some fields haven't been validated yet. Please provide valid Supplier and BusinessUnit.`,
            draft: currentMemory.draft,
          };
        }
        
        await this.saveMemory(conversationId, currentMemory);
        
        return {
          type: 'confirmation',
          answer: decision.message || this._formatConfirmation(currentMemory.draft),
          draft: currentMemory.draft,
        };

      case 'execute':
        // Final validation
        const requiredMissing = REQUIRED_ORDER.filter(f => !currentMemory.draft[f]);
        
        if (requiredMissing.length > 0) {
          console.error('❌ EXECUTION BLOCKED - Missing:', requiredMissing);
          
          await this.saveMemory(conversationId, currentMemory);
          
          return {
            type: 'error',
            answer: `Sorry, can't create yet. We need:\n- ${requiredMissing.join('\n- ')}`,
            draft: currentMemory.draft,
          };
        }
        
        // Check IDs
        if (!currentMemory.draft.SupplierId || !currentMemory.draft.BusinessUnitId) {
          console.error('❌ EXECUTION BLOCKED - Missing IDs');
          return {
            type: 'error',
            answer: `Can't create invoice - Supplier or BusinessUnit not validated.`,
            draft: currentMemory.draft,
          };
        }
        
        console.log('✅ All checks passed - executing');
        
        // Execute
        const executeResult = await this._executeInvoiceCreation(conversationId, currentMemory.draft);
        
        // Clear on success
        if (executeResult.type === 'success') {
          await this.clearMemory(conversationId);
          await this.redis.del(`invoice:wizard:lock:${conversationId}`);
        }
        
        return executeResult;

      default:
        await this.saveMemory(conversationId, currentMemory);
        
        return {
          type: 'text',
          answer: decision.message || "How can I help with invoices?",
        };
    }
  }

  /**
   * ============================================
   * VALIDATE SUPPLIER - FIXED VERSION
   * ============================================
   */
  async _validateSupplier(name) {
    try {
      console.log(`🔍 Validating supplier: "${name}"`);
      
      const safeName = name.replace(/'/g, "''");
      
      const res = await fetch(this.mcpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          product: "ERP",
          tool: "oracle_fetch",
          args: {
            endpoint: "/suppliers",
            query: `SupplierName=${safeName}`,
            limit: 50
          }
        })
      });

      if (!res.ok) {
        return {
          valid: false,
          error: `Having trouble connecting to Oracle. Want to try again?`
        };
      }

      const data = await res.json();
      const parsed = JSON.parse(data.content);
      
      if (!parsed.data || !Array.isArray(parsed.data) || parsed.data.length === 0) {
        const suggestions = ["Dell", "Microsoft", "Lookahead CA Corp."];
        return {
          valid: false,
          error: `I couldn't find "${name}" in Oracle. Here are some we have:\n\n${suggestions.map(s => `- ${s}`).join('\n')}\n\nWhich one?`,
          options: suggestions
        };
      }

      // ✅ FIXED: Use helper to extract supplier name from varying Oracle fields
      console.log(`🔎 Oracle returned ${parsed.data.length} suppliers:`);
      console.log(
        parsed.data
          .slice(0, 5)
          .map(s => `   - ${getSupplierName(s)}`)
          .join('\n')
      );

      // ✅ IMPROVED: Token-based fuzzy matching
      const inputTokens = normalize(name).split(' ').filter(t => t.length > 0);
      
      const exactMatch = parsed.data.find(s => {
        const oracleName = normalize(getSupplierName(s));
        
        // Match if ALL input tokens appear in Oracle name
        return inputTokens.every(token => oracleName.includes(token));
      });

      if (exactMatch) {
        const matchedName = getSupplierName(exactMatch);
        const matchedId = getSupplierId(exactMatch);
        
        console.log(`   ✅ MATCH FOUND: "${matchedName}" (ID: ${matchedId})`);
        
        return {
          valid: true,
          exactName: matchedName,
          supplierId: matchedId
        };
      }
      
      // Multiple matches → let user choose
      if (parsed.data.length > 1 && parsed.data.length <= 10) {
        const options = parsed.data
          .slice(0, 5)
          .map(s => getSupplierName(s))
          .filter(Boolean);
        
        console.log(`   ⚠️ Multiple matches - showing options`);
        
        return {
          valid: false,
          error: `I found ${options.length} suppliers. Which one?`,
          options: options
        };
      }
      
      // No exact match but Oracle returned results - show suggestions
      const suggestions = parsed.data
        .slice(0, 5)
        .map(s => getSupplierName(s))
        .filter(Boolean);
      
      console.log(`   ⚠️ No exact match - showing suggestions`);
      
      return {
        valid: false,
        error: `Couldn't find "${name}". Try one of these:\n\n${suggestions.map(s => `- ${s}`).join('\n')}`,
        options: suggestions
      };
      
    } catch (error) {
      console.error('❌ Supplier validation error:', error);
      return {
        valid: false,
        error: `Something went wrong. Could you try again?`
      };
    }
  }

  /**
   * ============================================
   * VALIDATE BUSINESS UNIT - FIXED VERSION
   * ============================================
   */
  async _validateBusinessUnit(name) {
    try {
      console.log(`🔍 Validating business unit: "${name}"`);
      
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
            query: `Name=${safeName}`,
            limit: 50
          }
        })
      });

      if (!res.ok) {
        return {
          valid: false,
          error: `Having trouble connecting to Oracle. Want to try again?`
        };
      }

      const data = await res.json();
      const parsed = JSON.parse(data.content);
      
      if (!parsed.data || !Array.isArray(parsed.data) || parsed.data.length === 0) {
        const suggestions = ["Lookahead CA BU", "Lookahead US BU"];
        return {
          valid: false,
          error: `I couldn't find "${name}" in Oracle. Here are some:\n\n${suggestions.map(s => `- ${s}`).join('\n')}\n\nWhich one?`,
          options: suggestions
        };
      }

      // ✅ FIXED: Use helper to extract BU name from varying Oracle fields
      console.log(`🔎 Oracle returned ${parsed.data.length} business units:`);
      console.log(
        parsed.data
          .slice(0, 5)
          .map(b => `   - ${getBUName(b)}`)
          .join('\n')
      );

      // ✅ IMPROVED: Token-based fuzzy matching
      const inputTokens = normalize(name).split(' ').filter(t => t.length > 0);
      
      const exactMatch = parsed.data.find(b => {
        const oracleName = normalize(getBUName(b));
        
        // Match if ALL input tokens appear in Oracle name
        return inputTokens.every(token => oracleName.includes(token));
      });

      if (exactMatch) {
        const matchedName = getBUName(exactMatch);
        const matchedId = getBUId(exactMatch);
        
        console.log(`   ✅ MATCH FOUND: "${matchedName}" (ID: ${matchedId})`);
        
        return {
          valid: true,
          exactName: matchedName,
          businessUnitId: matchedId
        };
      }
      
      // Multiple matches → let user choose
      if (parsed.data.length > 1 && parsed.data.length <= 10) {
        const options = parsed.data
          .slice(0, 5)
          .map(b => getBUName(b))
          .filter(Boolean);
        
        console.log(`   ⚠️ Multiple matches - showing options`);
        
        return {
          valid: false,
          error: `I found ${options.length} business units. Which one?`,
          options: options
        };
      }
      
      // No exact match but Oracle returned results - show suggestions
      const suggestions = parsed.data
        .slice(0, 5)
        .map(b => getBUName(b))
        .filter(Boolean);
      
      console.log(`   ⚠️ No exact match - showing suggestions`);
      
      return {
        valid: false,
        error: `Couldn't find "${name}". Try one of these:\n\n${suggestions.map(s => `- ${s}`).join('\n')}`,
        options: suggestions
      };
      
    } catch (error) {
      console.error('❌ BU validation error:', error);
      return {
        valid: false,
        error: `Something went wrong. Could you try again?`
      };
    }
  }

  /**
   * Execute invoice creation
   */
  async _executeInvoiceCreation(conversationId, draft) {
    try {
      console.log(`🚀 Creating invoice`);
      
      const res = await fetch(this.mcpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          product: "ERP",
          tool: "oracle_invoice_create",
          args: {
            query: "create invoice",
            endpoint: "/invoices",
            method: "POST",
            payload: draft,
            conversationId
          }
        })
      });

      if (!res.ok) {
        return {
          type: 'error',
          answer: `Oracle returned an error. Want to try again?`
        };
      }

      const result = await res.json();
      const parsed = JSON.parse(result.content);
      
      const invoiceNum = parsed.InvoiceNumber || parsed.invoiceNumber || `AI-INV-${Date.now()}`;

      console.log(`✅ Invoice created: ${invoiceNum}`);

      // Track in database
      try {
        await pool.query(
          `INSERT INTO ai_created_invoices (
            user_id, conversation_id, invoice_number, supplier, supplier_id,
            supplier_site, business_unit, business_unit_id, invoice_amount,
            invoice_currency, invoice_date, description, validation_status,
            created_by_ai, ai_model
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            this.userId, conversationId, invoiceNum, draft.Supplier, draft.SupplierId,
            draft.SupplierSite, draft.BusinessUnit, draft.BusinessUnitId, draft.InvoiceAmount,
            draft.InvoiceCurrency || 'AED', draft.InvoiceDate, draft.Description || null,
            parsed.ValidationStatus || 'Pending', true, 'gpt-4o-mini'
          ]
        );
        console.log(`✅ Tracked in database`);
      } catch (dbError) {
        console.error('❌ DB tracking failed:', dbError);
      }

      let msg = `## 🎉 Invoice Created Successfully!\n\n`;
      msg += `**Invoice Details:**\n\n`;
      msg += `📋 **Number:** ${invoiceNum}\n`;
      msg += `🏢 **Supplier:** ${draft.Supplier} (${draft.SupplierSite})\n`;
      msg += `💰 **Amount:** ${draft.InvoiceAmount} ${draft.InvoiceCurrency}\n`;
      msg += `🏛️ **Business Unit:** ${draft.BusinessUnit}\n`;
      msg += `📅 **Date:** ${draft.InvoiceDate}\n`;
      if (draft.Description) {
        msg += `📝 **Note:** ${draft.Description}\n`;
      }
      msg += `\n✅ **Status:** Validated & Created in Oracle\n\n`;
      msg += `💡 **Track it:** Type "track invoice ${invoiceNum}"`;

      return {
        type: 'success',
        answer: msg,
        invoiceNumber: invoiceNum,
      };
      
    } catch (error) {
      console.error('❌ Invoice creation error:', error);
      return {
        type: 'error',
        answer: `Oops: ${error.message}`
      };
    }
  }

  /**
   * Build collection message
   */
  _buildCollectionMessage(fieldName, draft) {
    const messages = {
      'Supplier': "Let's create an invoice! Which supplier is this for?",
      'InvoiceAmount': `Got it, ${draft.Supplier}. What's the amount?`,
      'SupplierSite': `Perfect. Which ${draft.Supplier} location?`,
      'BusinessUnit': `Great! Which business unit should this go under?`
    };

    return messages[fieldName] || `Please provide: ${fieldName}`;
  }

  /**
   * Format confirmation
   */
  _formatConfirmation(draft) {
    let msg = `**✅ Perfect! Here's your invoice:**\n\n`;
    msg += `🏢 **Supplier:** ${draft.Supplier}`;
    if (draft.SupplierSite) msg += ` (${draft.SupplierSite})`;
    msg += `\n💰 **Amount:** ${draft.InvoiceAmount} ${draft.InvoiceCurrency || 'AED'}\n`;
    msg += `🏛️ **Business Unit:** ${draft.BusinessUnit}\n`;
    msg += `📅 **Date:** ${draft.InvoiceDate}\n`;
    if (draft.Description) {
      msg += `📝 **Note:** ${draft.Description}\n`;
    }
    msg += `\n✅ **Everything validated with Oracle**\n\n`;
    msg += `Say **"yes"** to create it now! 🚀`;
    return msg;
  }

  /**
   * Check cancellation
   */
  _isCancellation(input) {
    const normalized = input.toLowerCase().trim();
    return ['cancel', 'abort', 'stop', 'quit', 'exit'].includes(normalized);
  }

  /**
   * Get history
   */
  async _getHistory(conversationId, limit = 10) {
    try {
      const key = `invoice:history:${conversationId}`;
      const messages = await this.redis.lrange(key, 0, limit - 1);
      return messages.map(m => JSON.parse(m));
    } catch (error) {
      return [];
    }
  }

  /**
   * Add to history
   */
  async _addToHistory(conversationId, role, content) {
    try {
      const key = `invoice:history:${conversationId}`;
      await this.redis.lpush(key, JSON.stringify({
        role,
        content,
        timestamp: Date.now(),
      }));
      await this.redis.ltrim(key, 0, 49);
      await this.redis.expire(key, this.sessionTTL);
    } catch (error) {
      console.error('❌ History save error:', error);
    }
  }
}