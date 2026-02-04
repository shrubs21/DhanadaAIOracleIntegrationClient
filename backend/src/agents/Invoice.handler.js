/**
 * ============================================
 * INVOICE HANDLER - LLM WIZARD WITH MEMORY
 * ============================================
 * Uses OpenAI at every step for intelligence
 * Maintains proper state memory in Redis
 * Best of both worlds!
 */

import { InvoiceWizardLLM } from './wizard.llm.js';
import { InvoiceAgent } from './invoice.agent.js';

/**
 * Detect if query is invoice-related
 */
export function isInvoiceQuery(prompt) {
  const p = prompt.toLowerCase();
  
  const invoiceKeywords = [
    'invoice', 'invoices',
    'payable', 'payables',
    'create invoice', 'new invoice',
    'track invoice', 'invoice status',
    'unpaid invoice', 'paid invoice',
    'validation status',
    'supplier invoice'
  ];

  return invoiceKeywords.some(k => p.includes(k));
}

/**
 * Check if query is to START a new wizard
 */
function isWizardStart(prompt) {
  const p = prompt.toLowerCase();
  return (
    (p.includes('create') || p.includes('new') || p.includes('make')) &&
    p.includes('invoice')
  );
}

/**
 * Check if query is non-wizard (list, track, FAQ)
 */
function isNonWizardQuery(prompt) {
  const p = prompt.toLowerCase();
  
  // These are NOT wizard starts
  if (p.includes('track') ||
      p.includes('status') ||
      p.includes('list') ||
      p.includes('show') ||
      p.includes('find') ||
      p.includes('search') ||
      p.includes('unpaid') ||
      p.includes('what is') ||
      p.includes('explain')) {
    return true;
  }
  
  return false;
}

/**
 * Main invoice query handler with LLM wizard
 */
export async function handleInvoiceQuery({
  prompt,
  conversationId,
  userId,
  redis,
  openRouterKey,
  mcpUrl
}) {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("📋 INVOICE COPILOT - LLM WIZARD MODE");
    console.log("=".repeat(60));

    // Initialize LLM wizard
    const wizard = new InvoiceWizardLLM(redis, openRouterKey);

    // Check if there's an active wizard
    const wizardState = await wizard.getWizardState(conversationId);

    console.log(`🔍 Wizard state: ${wizardState ? 'ACTIVE' : 'NONE'}`);
    if (wizardState) {
      console.log(`   Status: ${wizardState.status}`);
      console.log(`   Draft: ${JSON.stringify(wizardState.draft)}`);
    }

    // PRIORITY 1: If wizard is active, process through LLM wizard
    if (wizardState && wizardState.status !== 'completed') {
      console.log("✅ Active wizard - processing with LLM intelligence");
      
      // Get conversation history for context
      const history = await getConversationHistory(redis, conversationId);
      
      // Process through LLM wizard (with memory)
      const result = await wizard.processWizardStep(
        conversationId,
        prompt,
        history
      );

      // Save to history
      await saveToHistory(redis, conversationId, 'user', prompt);

      // If wizard wants to execute, call MCP
      if (result.type === 'execute') {
        console.log("🚀 Executing invoice creation via MCP...");
        
        const mcpResult = await executeInvoiceTool({
          tool: result.tool,
          params: result.params,
          mcpUrl,
          userId,
          conversationId
        });

        // Clear wizard state
        await wizard.clearWizard(conversationId);
        
        // ✅ FIX: Remove wizard lock
        await redis.del(`invoice:wizard:lock:${conversationId}`);

        const formatted = formatInvoiceResult(mcpResult, result.tool);
        
        await saveToHistory(redis, conversationId, 'assistant', formatted.answer);
        
        return {
          type: 'success',
          answer: formatted.answer,
          data: formatted.data,
          count: formatted.count,
        };
      }

      // Save assistant response
      await saveToHistory(redis, conversationId, 'assistant', result.message);

      // Return wizard step
      return {
        type: result.type,
        answer: result.message,
        draft: result.draft,
        missingFields: result.missingFields,
      };
    }

    // PRIORITY 2: Check if user wants to START wizard
    if (isWizardStart(prompt) && !isNonWizardQuery(prompt)) {
      console.log("🆕 Starting LLM wizard");
      
      // ✅ FIX: Activate wizard lock
      await redis.set(
        `invoice:wizard:lock:${conversationId}`,
        "active",
        "EX",
        900 // 15 minutes
      );
      
      // Get conversation history
      const history = await getConversationHistory(redis, conversationId);
      
      // Process initial message through LLM
      // LLM might extract fields from "create invoice for Dell 5000"
      const result = await wizard.processWizardStep(
        conversationId,
        prompt,
        history
      );

      await saveToHistory(redis, conversationId, 'user', prompt);
      await saveToHistory(redis, conversationId, 'assistant', result.message);
      
      return {
        type: result.type,
        answer: result.message,
        draft: result.draft,
        missingFields: result.missingFields,
      };
    }

    // PRIORITY 3: Non-wizard queries (list, track, FAQ)
    console.log("📊 Non-wizard invoice query - using LLM agent");
    
    const agent = new InvoiceAgent({
      redis,
      openRouterKey,
    });

    const history = await agent.sessionManager.getHistory(userId, 5);
    const decision = await agent.processQuery(userId, prompt, history);

    await agent.sessionManager.addToHistory(userId, 'user', prompt);

    return await executeInvoiceDecision({
      decision,
      conversationId,
      userId,
      redis,
      mcpUrl,
      agent
    });

  } catch (error) {
    console.error("Invoice Query Handler Error:", error);
    return {
      type: 'error',
      answer: 'Sorry, I encountered an error with your invoice request.',
      error: error.message,
    };
  }
}

/**
 * Get conversation history from Redis
 */
async function getConversationHistory(redis, conversationId, limit = 5) {
  try {
    const key = `invoice:history:${conversationId}`;
    const messages = await redis.lrange(key, 0, limit - 1);
    return messages.map(m => JSON.parse(m));
  } catch (error) {
    console.error('Get history error:', error);
    return [];
  }
}

/**
 * Save message to conversation history
 */
async function saveToHistory(redis, conversationId, role, content) {
  try {
    const key = `invoice:history:${conversationId}`;
    const message = {
      role,
      content,
      timestamp: Date.now(),
    };

    await redis.lpush(key, JSON.stringify(message));
    await redis.ltrim(key, 0, 19); // Keep last 20 messages
    await redis.expire(key, 3600); // 1 hour TTL
  } catch (error) {
    console.error('Save history error:', error);
  }
}

/**
 * Execute LLM decision (for non-wizard queries)
 */
async function executeInvoiceDecision({
  decision,
  conversationId,
  userId,
  redis,
  mcpUrl,
  agent
}) {
  switch (decision.type) {
    case 'faq':
    case 'conversational':
    case 'cancelled':
      await agent.sessionManager.addToHistory(userId, 'assistant', decision.message);
      return {
        type: 'text',
        answer: decision.message,
      };

    case 'tool_call':
      const result = await executeInvoiceTool({
        tool: decision.tool,
        params: decision.params,
        mcpUrl,
        userId,
        conversationId
      });

      const formattedResult = formatInvoiceResult(result, decision.tool);
      await agent.sessionManager.addToHistory(userId, 'assistant', formattedResult.answer);

      return formattedResult;

    default:
      return {
        type: 'text',
        answer: decision.message || 'I can help with invoices.',
      };
  }
}

/**
 * Execute invoice tool via MCP
 * ✅ FIX: Always use oracle_fetch with structured args
 */
async function executeInvoiceTool({
  tool,
  params,
  mcpUrl,
  userId,
  conversationId
}) {
  console.log("\n" + "-".repeat(50));
  console.log(`📞 Calling MCP Tool: ${tool}`);
  console.log("Params:", JSON.stringify(params, null, 2));

  try {
    // ✅ FIX: Always send as oracle_fetch with structured args
    const mcpPayload = {
      userId,
      product: "ERP",
      tool: "oracle_fetch",  // ✅ CRITICAL: Use oracle_fetch (not oracle_invoice_create)
      args: {
        query: "create invoice",
        endpoint: "/invoices",
        method: "POST",
        payload: params,  // ✅ Send full params as payload
        conversationId
      }
    };

    console.log("Calling MCP Server:", mcpUrl);
    console.log("MCP Payload:", JSON.stringify(mcpPayload, null, 2));

    const mcpResponse = await fetch(mcpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mcpPayload)
    });

    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      throw new Error(`MCP error (${mcpResponse.status}): ${errorText}`);
    }

    const mcpResult = await mcpResponse.json();

    let toolResult;
    if (mcpResult.content && typeof mcpResult.content === 'string') {
      console.log("Parsing MCP content...");
      toolResult = JSON.parse(mcpResult.content);
    } else {
      toolResult = mcpResult;
    }

    console.log("✅ MCP Response received");
    console.log("   Success:", toolResult.success || !!toolResult.data);
    if (toolResult.InvoiceNumber) {
      console.log("   Invoice Number:", toolResult.InvoiceNumber);
    }

    return toolResult;

  } catch (error) {
    console.error("❌ MCP Tool Error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Format tool result for UI
 */
function formatInvoiceResult(result, tool) {
  if (!result || result.error) {
    return {
      type: 'error',
      answer: result?.error || 'Tool execution failed',
    };
  }

  switch (tool) {
    case 'oracle_fetch':
      if (result.data && Array.isArray(result.data)) {
        const count = result.count || result.data.length;
        
        return {
          type: 'data',
          answer: `✅ Found ${count} invoice(s)`,
          data: result.data,
          count: count,
        };
      }
      break;

    case 'oracle_invoice_create':
      const invoiceNum = result.InvoiceNumber || result.data?.InvoiceNumber || 'Unknown';
      return {
        type: 'success',
        answer: `✅ **Invoice Created Successfully!**

📋 **Invoice Number**: ${invoiceNum}
✓ **Status**: ${result.ValidationStatus || 'Created'}

Your invoice has been created in Oracle. You can track it anytime by asking:
"Track invoice ${invoiceNum}"`,
      };

    default:
      break;
  }

  // Check if invoice was created
  if (result.InvoiceNumber) {
    return {
      type: 'success',
      answer: `✅ **Invoice Created Successfully!**

📋 **Invoice Number**: ${result.InvoiceNumber}
✓ **Status**: ${result.ValidationStatus || 'Created'}

Your invoice has been created in Oracle.`,
    };
  }

  return {
    type: 'text',
    answer: JSON.stringify(result, null, 2),
  };
}