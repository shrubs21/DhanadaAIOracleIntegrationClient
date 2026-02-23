import Redis from "ioredis";
import pool from "../config/db.js";
import { oracleToolSchema } from "../llm/tools/oracle.tool.schema.js";
import { SYSTEM_PROMPT } from "../llm/system-prompt.js";

/* -------------------------------------------------
   ENV
-------------------------------------------------- */
const MCP_URL = process.env.MCP_URL || "http://mcp-server:5001/mcp";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const N8N_INVOICE_WEBHOOK = process.env.N8N_INVOICE_WEBHOOK || "http://n8n:5678/webhook/invoice-agent";

/* -------------------------------------------------
   REDIS (WORKER CONNECTION)
-------------------------------------------------- */
const redis = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379,
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("ready", () => console.log("Redis ready"));
redis.on("error", (e) => console.error("Redis error", e));

/* -------------------------------------------------
   INTENT MEMORY (CHATGPT-LIKE CONTEXT)
-------------------------------------------------- */

function extractIntent(prompt) {
  const p = prompt.toLowerCase();

  const intent = {
    entity: null,
    action: null,
    fields: [],
    filters: {}
  };

  if (p.includes("employee")) intent.entity = "employee";
  if (p.includes("absence")) intent.entity = "absence";
  if (p.includes("payroll")) intent.entity = "payroll";

  if (p.includes("show") || p.includes("list")) intent.action = "list";

  if (p.includes("email")) intent.fields.push("Email");
  if (p.includes("phone")) intent.fields.push("PhoneNumber");
  if (p.includes("job")) intent.fields.push("JobTitle");
  if (p.includes("department")) intent.fields.push("DepartmentName");

  const deptMatch = p.match(/in (\w+) department/);
  if (deptMatch) intent.filters.department = deptMatch[1];

  return intent;
}

function isFollowUpPrompt(prompt) {
  return (
    prompt.toLowerCase().startsWith("show with") ||
    prompt.toLowerCase().startsWith("also") ||
    prompt.toLowerCase().startsWith("include") ||
    prompt.toLowerCase().startsWith("add")
  );
}

function buildIntentAwareQuery(originalQuery, intent) {
  if (!intent || !intent.entity) return originalQuery;

  let query = `list ${intent.entity}s`;

  if (intent.filters?.department) {
    query += ` in ${intent.filters.department} department`;
  }

  if (intent.fields.length > 0) {
    query += ` include ${intent.fields.join(", ")}`;
  }

  return query;
}

/* -------------------------------------------------
   EXTRACT USER-REQUESTED LIMIT
-------------------------------------------------- */
function extractUserLimit(prompt) {
  const p = prompt.toLowerCase();

  if (
    p.includes("all employees") ||
    p.includes("all absences") ||
    p.includes("all suppliers") ||
    p.includes("all invoices") ||
    p.includes("show all") ||
    p.includes("list all")
  ) {
    return "ALL";
  }

  const patterns = [
    /\b(first|top|show|list)\s+(\d+)\s+(employees?|records?|people|absences?|suppliers?|invoices?)\b/i,
    /\b(\d+)\s+(employees?|records?|people|absences?|suppliers?|invoices?)\b/i,
    /\blimit\s+(\d+)\b/i
  ];

  for (const pattern of patterns) {
    const match = p.match(pattern);
    if (match) {
      const num = parseInt(match[2] || match[1]);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  return null;
}

/* -------------------------------------------------
   TOKEN FIREWALL - HARD CAP AT 5 RECORDS
-------------------------------------------------- */
function buildLLMSafeResult(toolResult, prompt = "") {
  if (!toolResult || !Array.isArray(toolResult.data)) {
    return {
      success: toolResult?.success ?? true,
      summary: toolResult?.summary ?? "Request completed",
      count: toolResult?.count ?? 0
    };
  }

  const MAX = 5;
  const actualCount = toolResult.count || toolResult.data.length;

  return {
    success: true,
    count: actualCount,
    summary: `Found ${actualCount} records. Showing top ${Math.min(MAX, toolResult.data.length)}. Full dataset available in table below.`,
    sample: toolResult.data.slice(0, MAX),
    hasMore: actualCount > MAX
  };
}

/* -------------------------------------------------
   FILTER ABSENCES (CLIENT-SIDE)
-------------------------------------------------- */
function filterAbsences(absences, query) {
  const q = query.toLowerCase();

  const empMatch = q.match(/\b\d{4,6}\b/);
  const employeeNumber = empMatch ? empMatch[0] : null;
  const isLastMonth = q.includes("last month");

  let filtered = absences;

  if (employeeNumber) {
    filtered = filtered.filter(a => a.personNumber === employeeNumber);
  }

  if (isLastMonth) {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .split("T")[0];
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      .toISOString()
      .split("T")[0];

    filtered = filtered.filter(a => {
      const startDate = a.startDate;
      const endDate = a.endDate;
      return startDate >= startOfLastMonth && endDate <= endOfLastMonth;
    });
  }

  let limit = 50;
  if (q.includes("first 10")) limit = 10;
  else if (q.includes("first 20")) limit = 20;
  else if (q.includes("first 50")) limit = 50;
  else if (q.includes("first 100")) limit = 100;

  return {
    filtered: filtered.slice(0, limit),
    totalCount: filtered.length,
    limitApplied: limit
  };
}

/* -------------------------------------------------
   REDUCE PAYROLL DATA (TOKEN SAFETY)
-------------------------------------------------- */
function reducePayrollData(data, limit = 5) {
  if (!data || !Array.isArray(data)) return [];

  return data
    .slice(0, limit)
    .map(p => ({
      employeeName: p.DisplayName || `${p.FirstName || ""} ${p.LastName || ""}`.trim(),
      employeeId: p.PersonNumber,
      baseSalary: p.BaseSalary || p.SalaryAmount || "N/A",
      allowances: p.Allowances || "N/A",
      deductions: p.Deductions || "N/A",
      netSalary: p.NetSalary || p.NetPay || "N/A"
    }));
}

/* -------------------------------------------------
   OPENROUTER / OPENAI CALL
-------------------------------------------------- */
async function callOpenAI(payload) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:4000",
      "X-Title": "Oracle AI Assistant"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
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

/* -------------------------------------------------
   SMART QUESTION DETECTION
-------------------------------------------------- */
function isGeneralQuestion(text) {
  const q = text.toLowerCase();

  const generalKeywords = [
    "what is", "what are", "explain", "define",
    "how to", "how does", "tell me about", "describe",
    "linux", "windows", "mac", "ubuntu", "centos",
    "docker", "kubernetes", "k8s", "container",
    "code", "example", "sample", "syntax",
    "function", "class", "script", "program",
    "algorithm", "tutorial", "guide",
    "javascript", "node", "nodejs", "python",
    "java", "c++", "c#", "php", "ruby",
    "react", "nextjs", "angular", "vue",
    "html", "css", "typescript",
    "sql", "postgres", "mysql", "mongodb",
    "query", "table", "index", "database",
    "api", "rest", "http", "json", "xml",
    "oauth", "jwt", "authentication", "authorization",
    "ci/cd", "pipeline", "github", "gitlab",
    "git", "dockerfile", "yaml", "jenkins",
    "error", "bug", "fix", "issue", "debug",
    "install", "setup", "configure", "deploy"
  ];

  return generalKeywords.some(k => q.includes(k));
}

/* -------------------------------------------------
   INVOICE INTENT DETECTION
-------------------------------------------------- */
function isInvoiceIntent(text) {
  const t = text.toLowerCase();

  const keywords = [
    "invoice",
    "create invoice",
    "new invoice",
    "submit invoice",
    "invoice status",
    "track invoice",
    "payable invoice"
  ];

  return keywords.some(k => t.includes(k));
}

/* -------------------------------------------------
   STREAM HELPER
-------------------------------------------------- */
async function streamResponse(conversationId, text) {
  const streamKey = `stream:${conversationId}`;
  const words = text.split(" ");

  for (let i = 0; i < words.length; i++) {
    await redis.rpush(streamKey, JSON.stringify({
      token: words[i] + (i < words.length - 1 ? " " : ""),
      done: false
    }));
    await new Promise(resolve => setTimeout(resolve, 15));
  }

  await redis.rpush(streamKey, JSON.stringify({ done: true }));
  await redis.expire(streamKey, 120);
}

/* -------------------------------------------------
   DB STORE HELPER
-------------------------------------------------- */
async function storeMessages(conversationId, userPrompt, assistantReply, fileInfo = null) {
  await pool.query(
    `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
    [conversationId, userPrompt]
  );

  await pool.query(
    `INSERT INTO messages (conversation_id, role, content, file_url, file_name, file_format)
     VALUES ($1, 'assistant', $2, $3, $4, $5)`,
    [
      conversationId,
      assistantReply,
      fileInfo?.fileUrl || null,
      fileInfo?.fileName || null,
      fileInfo?.fileFormat || null
    ]
  );
}

/* -------------------------------------------------
   PROCESS SINGLE CHAT JOB
-------------------------------------------------- */
async function processChatJob(job) {
  const { conversationId, userId, prompt } = job;

  // SAFETY GUARD - must be FIRST before any Redis calls
  if (!conversationId) {
    console.error("❌ Missing conversationId in job:", job);
    return;
  }

  console.log("=".repeat(60));
  console.log(`Processing chat for conversation ${conversationId}`);
  console.log(`User ID: ${userId}`);
  console.log(`Prompt: ${prompt}`);
  console.log("=".repeat(60));

  /* -------------------------------------------------
     INVOICE → N8N SESSION LOCK
     NOTE: No expiry - session is permanent until user
     explicitly types "exit invoice"
  -------------------------------------------------- */
  const invoiceSessionKey = `invoice:session:${conversationId}`;
  const isInvoiceSessionActive = await redis.get(invoiceSessionKey);

  // ─── EXIT INVOICE SESSION ───────────────────────────
  if (prompt.toLowerCase() === "exit invoice") {
    console.log("🚪 Exit invoice command received");
    await redis.del(invoiceSessionKey);

    const exitReply = "Invoice session closed. You can continue normal chat.";

    await storeMessages(conversationId, prompt, exitReply);
    await streamResponse(conversationId, exitReply);
    return;
  }

  // ─── INVOICE SESSION ACTIVE → ROUTE TO N8N ──────────
  if (isInvoiceSessionActive === "active") {
    console.log("🔒 Invoice session active → routing to n8n");

    try {
      const response = await fetch(N8N_INVOICE_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, userId, message: prompt })
      });

      const data = await response.json();
      const agentReply = data.response || data.message || "Invoice agent response received.";

      await storeMessages(conversationId, prompt, agentReply);
      await streamResponse(conversationId, agentReply);
    } catch (n8nError) {
      console.error("❌ n8n fetch error (session active):", n8nError.message);
      const errReply = "⚠️ Invoice agent is unavailable right now. Please try again.";

      await storeMessages(conversationId, prompt, errReply);
      await streamResponse(conversationId, errReply);
    }

    return;
  }

  // ─── FIRST TIME INVOICE DETECTION ───────────────────
  if (isInvoiceIntent(prompt)) {
    console.log("🧾 Invoice detected → starting n8n agent session");
    console.log("   Invoice session key:", invoiceSessionKey);

    // ✅ NO EXPIRY - session is permanent until "exit invoice"
    await redis.set(invoiceSessionKey, "active");
    console.log("   ✅ Redis session lock set (NO EXPIRY - permanent until exit)");

    try {
      const response = await fetch(N8N_INVOICE_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, userId, message: prompt })
      });

      const data = await response.json();
      const agentReply = data.response || data.message || "Invoice agent started.";
      const firstMessage = `🧾 Invoice assistant activated.\n\n${agentReply}\n\n⚠️ Don't worry 😊 If your question is unrelated, start a new chat.\n\nType **"exit invoice"** to end the invoice session.`;

      await storeMessages(conversationId, prompt, firstMessage);
      await streamResponse(conversationId, firstMessage);
    } catch (n8nError) {
      console.error("❌ n8n fetch error (first trigger):", n8nError.message);
      // Clear the lock if n8n is unreachable
      await redis.del(invoiceSessionKey);
      const errReply = "⚠️ Invoice agent could not be reached. Please try again.";

      await storeMessages(conversationId, prompt, errReply);
      await streamResponse(conversationId, errReply);
    }

    return;
  }
  /* -------------------------------------------------
     END INVOICE → N8N ROUTING
  -------------------------------------------------- */

  /* 1. LOAD CONVERSATION HISTORY */
  const history = await pool.query(
    `SELECT role, content
     FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC
     LIMIT 20`,
    [conversationId]
  );

  const messages = [
    SYSTEM_PROMPT,
    ...history.rows.map(r => ({
      role: r.role,
      content: r.content
    })),
    { role: "user", content: prompt }
  ];

  console.log(`Context: ${messages.length} messages (including system prompt)`);

  /* LOAD PREVIOUS INTENT */
  let effectivePrompt = prompt;

  const lastIntentRaw = await redis.get(`intent:${conversationId}`);

  if (isFollowUpPrompt(prompt) && lastIntentRaw) {
    const lastIntent = JSON.parse(lastIntentRaw);

    effectivePrompt = `
Previous request:
Entity: ${lastIntent.entity}
Action: ${lastIntent.action}
Filters: ${JSON.stringify(lastIntent.filters)}
Fields: ${lastIntent.fields.join(", ")}

User follow-up:
"${prompt}"

Interpret this as a modification of the previous request.
`;

    console.log("Follow-up detected - merging with previous intent");
    console.log("   Previous entity:", lastIntent.entity);
    console.log("   Previous fields:", lastIntent.fields.join(", ") || "none");
  }

  /* 2. FIRST LLM CALL (SMART DECISION) */
  let first;

  if (isGeneralQuestion(prompt)) {
    console.log("General / Code / Concept question - NO TOOLS");

    first = await callOpenAI({
      messages: [
        SYSTEM_PROMPT,
        ...history.rows.map(r => ({
          role: r.role,
          content: r.content
        })),
        { role: "user", content: effectivePrompt }
      ]
    });

  } else {
    console.log("Oracle DATA question - TOOLS ENABLED");

    first = await callOpenAI({
      messages: [
        SYSTEM_PROMPT,
        ...history.rows.map(r => ({
          role: r.role,
          content: r.content
        })),
        { role: "user", content: effectivePrompt }
      ],
      tools: [oracleToolSchema],
      tool_choice: "auto"
    });
  }

  const choice = first.choices[0].message;
  let finalAnswer = "";
  let fileDownloadInfo = null;
  let lastToolResult = null;

  /* 3. TOOL CALLS (HANDLE ALL OF THEM) */
  if (choice.tool_calls && choice.tool_calls.length > 0) {
    console.log(`LLM Decided to Call ${choice.tool_calls.length} Tool(s)`);

    const toolResponses = [];

    const currentIntentRaw = await redis.get(`intent:${conversationId}`);
    const currentIntent = currentIntentRaw ? JSON.parse(currentIntentRaw) : null;

    for (const toolCall of choice.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);

      console.log("\n" + "-".repeat(50));
      console.log(`Handling tool call: ${toolCall.id}`);
      console.log("Product:", args.product);
      console.log("Query:", args.query);
      console.log("Include File:", args.includeFile || false);
      if (args.includeFile) {
        console.log("File Format:", args.fileFormat);
      }

      try {
        const intentAwareQuery = isFollowUpPrompt(prompt) && currentIntent
          ? buildIntentAwareQuery(args.query, currentIntent)
          : args.query;

        if (intentAwareQuery !== args.query) {
          console.log("Query rewritten using intent:");
          console.log("   Original:", args.query);
          console.log("   Intent-aware:", intentAwareQuery);
        }

        const mcpPayload = {
          userId,
          product: args.product,
          tool: "oracle_fetch",
          args: {
            query: intentAwareQuery,
            includeFile: args.includeFile,
            fileFormat: args.fileFormat,
            conversationId
          }
        };

        console.log("Calling MCP Server...");

        const mcpResponse = await fetch(MCP_URL, {
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
        if (mcpResult.content && typeof mcpResult.content === "string") {
          console.log("Parsing MCP content string...");
          toolResult = JSON.parse(mcpResult.content);
        } else {
          toolResult = mcpResult;
        }

        console.log("MCP Response Received");
        console.log(`   Count: ${toolResult.count || 0}`);
        console.log(`   Data length: ${toolResult.data?.length || 0}`);

        if (toolResult.error) {
          console.log("MCP returned error:", toolResult.error);
          throw new Error(toolResult.error);
        }

        const fullData = Array.isArray(toolResult.data)
          ? [...toolResult.data]
          : [];

        const actualCount = toolResult.count || fullData.length;

        console.log("✅ Full dataset captured BEFORE firewall:");
        console.log(`   Full data length: ${fullData.length}`);
        console.log(`   Actual count from Oracle: ${actualCount}`);

        const userLimit = extractUserLimit(prompt);
        console.log(`✅ User Limit Detection:`);
        console.log(`   Requested: ${userLimit === "ALL" ? "ALL records" : userLimit || "Default (no limit)"}`);

        let displayData = fullData;
        let displayCount = actualCount;

        const isPayrollQuery = args.query.toLowerCase().includes("payroll");

        if (!isPayrollQuery && userLimit && userLimit !== "ALL") {
          displayData = fullData.slice(0, userLimit);
          displayCount = displayData.length;
          console.log(`✅ User limit applied: showing ${displayCount} of ${actualCount} records`);
        } else if (userLimit === "ALL") {
          displayData = fullData;
          displayCount = actualCount;
          console.log(`✅ User requested ALL: showing all ${actualCount} records`);
        } else {
          console.log(`✅ No user limit detected: showing all ${actualCount} records`);
        }

        if (isPayrollQuery && Array.isArray(toolResult.data)) {
          console.log("⚠️  Payroll hard-stop applied (security cap)");
          console.log(`   Before: ${toolResult.data.length} records`);

          toolResult.data = reducePayrollData(toolResult.data, 5);
          displayData = toolResult.data;
          displayCount = displayData.length;
          toolResult.count = displayCount;
          toolResult.hasMore = false;

          console.log(`   After: ${displayCount} records (hard-capped for security)`);
        }

        if (toolResult.data && Array.isArray(toolResult.data) && args.query.toLowerCase().includes("absence")) {
          console.log("Applying client-side filtering for absences...");
          const filterResult = filterAbsences(toolResult.data, args.query);

          console.log(`Filter Results:`);
          console.log(`   Total absences: ${toolResult.data.length}`);
          console.log(`   After filtering: ${filterResult.totalCount}`);
          console.log(`   Limit applied: ${filterResult.limitApplied}`);
          console.log(`   Returned: ${filterResult.filtered.length}`);

          displayData = filterResult.filtered;
          displayCount = displayData.length;
        }

        if (toolResult.type === "pdf_download") {
          console.log("PDF Download Request");
          console.log("   Employee ID:", toolResult.downloadRequest?.employeeId);
          console.log("   Employee Name:", toolResult.downloadRequest?.employeeName);
        } else if (toolResult.fileUrl) {
          console.log("File Generated:", toolResult.fileName);
          fileDownloadInfo = {
            fileName: toolResult.fileName,
            fileUrl: toolResult.fileUrl,
            fileFormat: args.fileFormat || "PDF",
            fileSize: toolResult.fileSize
          };

          console.log("File stored for UI:", fileDownloadInfo);
        } else if (toolResult.data && Array.isArray(toolResult.data)) {
          console.log("Data Retrieved:", toolResult.data.length, "records");
          console.log("   Actual count from Oracle:", toolResult.count || toolResult.data.length);
        } else if (toolResult.count !== undefined) {
          console.log("Count:", toolResult.count, "records");
        }

        toolResult.data = displayData;
        toolResult.count = displayCount;

        lastToolResult = toolResult;

        const newIntent = extractIntent(prompt);

        const previousIntentRaw = await redis.get(`intent:${conversationId}`);
        const previousIntent = previousIntentRaw
          ? JSON.parse(previousIntentRaw)
          : null;

        const mergedIntent = {
          entity: newIntent.entity || previousIntent?.entity || null,
          action: newIntent.action || previousIntent?.action || null,
          filters: {
            ...(previousIntent?.filters || {}),
            ...(newIntent.filters || {})
          },
          fields: Array.from(
            new Set([
              ...(previousIntent?.fields || []),
              ...(newIntent.fields || [])
            ])
          ),
          timestamp: Date.now()
        };

        await redis.set(
          `intent:${conversationId}`,
          JSON.stringify(mergedIntent),
          "EX",
          600
        );

        console.log("Intent merged & stored:", JSON.stringify(mergedIntent));

        const llmSafe = buildLLMSafeResult(toolResult, prompt);

        console.log(`✅ Token Safety Applied:`);
        console.log(`   Oracle returned: ${actualCount} records`);
        console.log(`   User limit: ${userLimit === "ALL" ? "ALL" : userLimit || "None"}`);
        console.log(`   UI will show: ${displayCount} records`);
        console.log(`   LLM will see: ${llmSafe.sample?.length || 0} samples`);

        toolResponses.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(
            toolResult.type === "file_download"
              ? {
                  success: true,
                  message: "File generated successfully",
                  fileName: toolResult.fileName || "document.pdf",
                  fileFormat: args.fileFormat || "PDF"
                }
              : llmSafe
          )
        });

        if (fullData.length > 30) {
          console.log("✅ Large dataset detected → storing FULL dataset in Redis");
          console.log(`   Full dataset size: ${fullData.length} records`);
          console.log(`   Actual count: ${actualCount}`);
          console.log(`   User will see: ${displayCount} records in UI`);

          await redis.set(
            `data:${conversationId}`,
            JSON.stringify({
              data: fullData,
              count: actualCount,
              displayCount: displayCount,
              userLimit: userLimit
            }),
            "EX",
            600
          );

          console.log(`   ✅ Stored ${fullData.length} records in Redis`);
          console.log("   Frontend will load table automatically");
        } else {
          console.log(`Small dataset (${displayCount} records) - no Redis storage needed`);
        }

      } catch (toolError) {
        console.error(`Tool Execution Error for ${toolCall.id}:`, toolError.message);
        console.error(toolError.stack);

        const cleanErrorMessage = toolError.message.includes("maximum context length")
          ? "Data request too large. Please try a smaller query."
          : toolError.message.includes("integration not found")
          ? "Oracle connection unavailable. Please check settings."
          : "Unable to fetch data. Please try again.";

        toolResponses.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({
            success: false,
            error: cleanErrorMessage,
            count: 0
          })
        });
      }
    }

    console.log("\n" + "-".repeat(50));
    console.log(`Processed ${toolResponses.length} tool call(s)`);

    try {
      console.log("Sending all tool results back to LLM for final response...");

      const displayCount = lastToolResult?.count || lastToolResult?.data?.length || 0;

      let contextMessages;
      const hasLargeDataset = displayCount > 20 && !isFollowUpPrompt(prompt);

      if (hasLargeDataset) {
        console.log("Large dataset detected - resetting LLM context (no history)");
        console.log(`   Dataset size: ${displayCount} records`);
        console.log(`   Sample sent to LLM: ${toolResponses[0] ? JSON.parse(toolResponses[0].content).sample?.length || 0 : 0} records`);
        console.log(`   Strategy: Fresh context (user prompt + tool results only)`);

        contextMessages = [
          SYSTEM_PROMPT,
          { role: "user", content: effectivePrompt },
          choice,
          ...toolResponses
        ];
      } else {
        console.log("Normal dataset - using full context");
        console.log(`   Dataset size: ${displayCount} records`);
        console.log(`   Context: Including ${messages.length - 1} previous messages`);
        if (isFollowUpPrompt(prompt)) {
          console.log("   Follow-up detected - keeping context for natural conversation");
        }

        contextMessages = [
          SYSTEM_PROMPT,
          ...messages.slice(1),
          choice,
          ...toolResponses
        ];
      }

      const second = await callOpenAI({
        messages: contextMessages
      });

      finalAnswer = second.choices[0].message.content;

      if (displayCount > 30) {
        const userLimit = extractUserLimit(prompt);
        const limitMsg = userLimit === "ALL"
          ? `all ${displayCount} records`
          : userLimit
            ? `${displayCount} records (as requested)`
            : `${displayCount} records`;

        finalAnswer = `✅ Found ${limitMsg} from Oracle.

⚠️ Dataset is too large to display in chat.

📊 **Full table has been loaded below** with:
- Search across all columns
- Pagination (20 rows per page)
- Navigation commands: "next page", "previous page", "page 5"

**Try these commands:**
- "next page" - Go to next page
- "page 5" - Jump to page 5
- Type in search box to filter results

You can also ask me to filter:
- "Show only HR department"
- "Only employees who joined after 2022"
- "Show employee 1054"`;
      }

      if (fileDownloadInfo) {
        finalAnswer += `\n\n📄 **File Ready for Download**\n\n**File Details:**\n- Name: ${fileDownloadInfo.fileName}\n- Format: ${fileDownloadInfo.fileFormat}\n- Size: ${fileDownloadInfo.fileSize || "N/A"}\n\n[Download ${fileDownloadInfo.fileFormat}](${fileDownloadInfo.fileUrl})`;
      }

      console.log("LLM Generated Final Response");

    } catch (llmError) {
      console.error("LLM Final Response Error:", llmError.message);
      console.error(llmError.stack);

      if (llmError.message.includes("maximum context length")) {
        finalAnswer = `The dataset is too large to process. Please try:\n- Requesting fewer records\n- Querying a specific employee by ID\n- Narrowing your search criteria`;
      } else {
        finalAnswer = `I encountered an issue processing your request. Please try:\n- Simplifying your query\n- Starting a new conversation\n- Contacting support if the issue persists`;
      }

      fileDownloadInfo = null;
    }

  } else {
    finalAnswer = choice.content;
    console.log("LLM Answered Directly (No Tool Needed)");
  }

  /* 5. STORE MESSAGES */
  console.log("Storing messages in database...");

  try {
    const cleanupResult = await pool.query(
      `DELETE FROM messages
       WHERE conversation_id = $1
       AND role = 'assistant'
       AND (
         content LIKE '%OpenRouter error%'
         OR content LIKE '%maximum context length%'
       )`,
      [conversationId]
    );

    if (cleanupResult.rowCount > 0) {
      console.log(`Cleaned up ${cleanupResult.rowCount} poisoned error message(s)`);
    }
  } catch (cleanupError) {
    console.error("Error cleanup failed (non-critical):", cleanupError.message);
  }

  await storeMessages(conversationId, prompt, finalAnswer, fileDownloadInfo);

  console.log("Messages stored successfully");
  if (fileDownloadInfo) {
    console.log(`File metadata stored: ${fileDownloadInfo.fileName}`);
  }

  /* 6. STREAM TO UI */
  const streamKey = `stream:${conversationId}`;
  const words = finalAnswer.split(" ");

  console.log(`Streaming response to UI (${words.length} tokens)...`);

  for (let i = 0; i < words.length; i++) {
    await redis.rpush(streamKey, JSON.stringify({
      token: words[i] + (i < words.length - 1 ? " " : ""),
      done: false
    }));

    await new Promise(resolve => setTimeout(resolve, 20));
  }

  const displayCount = lastToolResult?.count || lastToolResult?.data?.length || 0;
  const actualData = lastToolResult?.data || null;
  const actualCount = lastToolResult?.count || 0;

  await redis.rpush(streamKey, JSON.stringify({
    done: true,
    fileInfo: fileDownloadInfo,
    shouldLoadTable: displayCount > 30,
    recordCount: displayCount,
    actualData: displayCount > 0 && displayCount <= 30 ? actualData : null,
    actualCount: actualCount
  }));

  await redis.expire(streamKey, 120);
  await redis.expire(`intent:${conversationId}`, 600);

  console.log("Streaming completed");
  console.log(`✅ Stream expires in 120s, Intent expires in 600s`);
  console.log(`✅ Actual data passed to frontend: ${actualData ? actualData.length : 0} records`);
  console.log(`Chat ${conversationId} completed successfully`);
  console.log("=".repeat(60));
}

/* -------------------------------------------------
   QUEUE CONSUMER
-------------------------------------------------- */
async function startWorker() {
  console.log("=".repeat(60));
  console.log("ORACLE AI ASSISTANT WORKER - PRODUCTION READY ✅");
  console.log("=".repeat(60));
  console.log("Model: GPT-4o-mini via OpenRouter");
  console.log("MCP URL:", MCP_URL);
  console.log("OpenRouter API:", OPENROUTER_API_KEY ? "Configured ✅" : "Missing ❌");
  console.log("Queue: chat:queue (Redis BLPOP)");
  console.log("\n🚀 Capabilities:");
  console.log("   ✅ Oracle HCM queries (employees, payroll, leave, performance)");
  console.log("   ✅ Oracle ERP queries (suppliers, invoices, POs, payments)");
  console.log("   ✅ 🧾 INVOICE → N8N AGENT (session-locked routing)");
  console.log("   ✅ General tech questions & code examples");
  console.log("   ✅ Smart query limits (10, 20, 50, 100, all)");
  console.log("   ✅ PDF/ZIP download support");
  console.log("   ✅ Multi-tool-call handling");
  console.log("\n🔒 INVOICE SESSION LOCK:");
  console.log("   ✅ Invoice intent → triggers n8n webhook");
  console.log("   ✅ Session is PERMANENT (no expiry) until user exits");
  console.log("   ✅ ALL messages in session → routed to n8n");
  console.log("   ✅ Type 'exit invoice' to end session");
  console.log("   ✅ No LLM invoice logic - n8n owns the flow");
  console.log("   ✅ All invoice messages stored in DB (user + assistant)");
  console.log("\n🛡️ TOKEN FIREWALL:");
  console.log("   ✅ LLM sees max 5 records ALWAYS");
  console.log("   ✅ Full dataset stored in Redis only if >30 records");
  console.log("   ✅ Frontend table auto-loads for large datasets");
  console.log("\n🎯 USER LIMIT SUPPORT:");
  console.log("   ✅ 'show 10 employees' → UI shows 10");
  console.log("   ✅ 'show all employees' → UI shows all");
  console.log("   ✅ Payroll remains hard-capped at 5 (security)");
  console.log("\n🧠 INTENT MEMORY:");
  console.log("   ✅ ChatGPT-like follow-ups ('show with email')");
  console.log("   ✅ Intent merging (fields accumulate, not replace)");
  console.log("=".repeat(60));
  console.log("Waiting for chat jobs...\n");

  while (true) {
    try {
      const data = await redis.blpop("chat:queue", 0);
      if (!data) continue;

      const job = JSON.parse(data[1]);
      await processChatJob(job);

    } catch (err) {
      console.error("Worker Loop Error:", err.message);
      console.error(err.stack);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

startWorker().catch(err => {
  console.error("Fatal Worker Error:", err);
  process.exit(1);
});