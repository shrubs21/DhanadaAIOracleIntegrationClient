/**
 * ============================================
 * INVOICE HANDLER - ENTERPRISE COPILOT
 * ============================================
 * ✅ Single unified brain
 * ✅ Natural conversation
 * ✅ Confirmation buttons
 * ✅ Never skips critical fields
 */

import { EnterpriseInvoiceCopilot } from './Invoice.copilot.unified.js';

/**
 * Detect if query is invoice-related (for initial routing)
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
    'supplier invoice',
    'list invoice', 'show invoice'
  ];

  return invoiceKeywords.some(k => p.includes(k));
}

/**
 * Main invoice query handler
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
    console.log("🏢 ENTERPRISE INVOICE COPILOT");
    console.log("=".repeat(60));

    // Initialize enterprise copilot
    const copilot = new EnterpriseInvoiceCopilot({
      redis,
      openRouterKey,
      mcpUrl,
      userId
    });

    // Process query (copilot handles everything)
    const result = await copilot.processQuery(conversationId, prompt);

    console.log("✅ Copilot completed");
    console.log(`   Type: ${result.type}`);
    console.log("=".repeat(60));

    return result;

  } catch (error) {
    console.error("❌ Invoice Handler Error:", error);
    
    // Clear lock on fatal error
    await redis.del(`invoice:wizard:lock:${conversationId}`);
    
    return {
      type: 'error',
      answer: 'Oops, something went wrong. Mind trying again?',
      error: error.message,
    };
  }
}