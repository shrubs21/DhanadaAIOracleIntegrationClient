import fetch from "node-fetch";

const MODE = process.env.LLM_MODE || "api";

/* ---------------- GROQ CONFIG ---------------- */
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

/* ---------------- MAIN ENTRY ---------------- */
export async function callLlama(prompt) {
  console.log(" LLM MODE:", MODE);

  if (MODE !== "api") {
    throw new Error("Local mode disabled in demo");
  }

  if (!GROQ_API_KEY) {
    throw new Error("❌ GROQ_API_KEY is missing");
  }

  return callGroq(prompt);
}

/* ---------------- GROQ CALL ---------------- */
async function callGroq(prompt) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a helpful enterprise AI assistant."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 256
    })
  });

  const data = await res.json();

  /*  DEBUG LOG (IMPORTANT) */
  console.log("📦 Groq raw response:", JSON.stringify(data, null, 2));

  /*  HANDLE ERRORS */
  if (!data.choices || !data.choices.length) {
    throw new Error(
      data.error?.message || "Groq API returned empty response"
    );
  }

  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Groq response missing content");
  }

  return content.trim();
}
