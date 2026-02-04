import "dotenv/config"

async function testOpenRouter() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is missing")
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost",
          "X-Title": "Oracle MCP Test"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an Oracle Fusion assistant." },
            { role: "user", content: "Say hello and confirm OpenRouter is working." }
          ]
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error("❌ FAILED:", data)
      return
    }

    console.log("✅ OpenRouter is working!")
    console.log(data.choices[0].message.content)

  } catch (err) {
    console.error("❌ ERROR:", err.message)
  }
}

testOpenRouter()
